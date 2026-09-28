package lk.englisher.parent;

import lk.englisher.auth.Role;
import lk.englisher.auth.UserEntity;
import lk.englisher.auth.UserRepository;
import lk.englisher.common.ApiException;
import lk.englisher.config.AuthProperties;
import lk.englisher.parent.ParentDtos.AcceptResultDto;
import lk.englisher.parent.ParentDtos.ParentLinkDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * The invite / resend / revoke / accept flow.
 *
 * <p>An email invitation is actually sent, over SMTP via
 * {@link ParentInviteMailService} (see {@link #deliver}). A phone invitation
 * is not — SMS delivery is still out of scope, so a phone contact just logs
 * the token the same spirit as the prototype's "PROTOTYPE ONLY — the real
 * invitation is a signed link" banner. Wiring Twilio (or similar) replaces
 * exactly that one branch.
 */
@Service
public class ParentLinkService {

    private static final Logger log = LoggerFactory.getLogger(ParentLinkService.class);

    /** Ported from parentContactChannel() in domain/parentLink.ts. */
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s.]+\\.[^@\\s]{2,}$");
    private static final Pattern PHONE = Pattern.compile("^\\+?\\d{9,15}$");

    private final ParentLinkRepository links;
    private final UserRepository users;
    private final AuthProperties properties;
    private final ParentInviteMailService inviteMail;
    private final SecureRandom random = new SecureRandom();

    public ParentLinkService(ParentLinkRepository links, UserRepository users, AuthProperties properties,
                             ParentInviteMailService inviteMail) {
        this.links = links;
        this.users = users;
        this.properties = properties;
        this.inviteMail = inviteMail;
    }

    // ------------------------------------------------------------------
    // Child side
    // ------------------------------------------------------------------

    @Transactional(readOnly = true)
    public ParentLinkDto forChild(UUID childUserId) {
        return links.findLiveByChild(childUserId)
                .map(ParentLinkDto::of)
                .orElseGet(ParentLinkDto::none);
    }

    /**
     * Invites a parent by email or phone.
     *
     * <p>Re-inviting while an invitation is live reissues the existing row
     * rather than creating a second one — the frontend models {@code ParentLink}
     * as a single object, not a list, and a partial unique index enforces the
     * same thing in the database.
     */
    @Transactional
    public ParentLinkDto invite(UUID childUserId, String rawContact) {
        String contact = rawContact == null ? "" : rawContact.trim();
        String channel = channelFor(contact);
        if (channel == null) {
            throw ApiException.badRequest("parentLink.badContact",
                    "Enter a valid email address or phone number.");
        }

        Instant expiresAt = Instant.now().plus(properties.getInviteTtl());
        String token = newToken();

        ParentLinkEntity link = links.findLiveByChild(childUserId)
                .map(existing -> {
                    if ("accepted".equals(existing.getStatus())) {
                        throw ApiException.conflict("parentLink.alreadyAccepted",
                                "A parent has already accepted. Revoke that link before inviting someone else.");
                    }
                    existing.reissue(contact, channel, token, expiresAt);
                    return existing;
                })
                .orElseGet(() -> new ParentLinkEntity(childUserId, contact, channel, token, expiresAt));

        ParentLinkEntity saved = links.save(link);
        deliver(saved, token);
        return ParentLinkDto.of(saved);
    }

    /** {@code onResend} — a fresh token and a fresh clock on the same invitation. */
    @Transactional
    public ParentLinkDto resend(UUID childUserId) {
        ParentLinkEntity link = links.findLiveByChild(childUserId)
                .orElseThrow(() -> ApiException.notFound("parentLink.none",
                        "There is no invitation to resend."));
        if ("accepted".equals(link.getStatus())) {
            throw ApiException.conflict("parentLink.alreadyAccepted",
                    "That invitation has already been accepted.");
        }
        String token = newToken();
        // A plain resend keeps the contact it already has.
        link.reissue(link.getContact(), link.getChannel(), token,
                Instant.now().plus(properties.getInviteTtl()));
        ParentLinkEntity saved = links.save(link);
        deliver(saved, token);
        return ParentLinkDto.of(saved);
    }

    /**
     * {@code onCancel} / {@code onRevoke} — one operation, because cancelling a
     * pending invitation and revoking an accepted one differ only in what the
     * UI calls them.
     */
    @Transactional
    public ParentLinkDto revoke(UUID childUserId) {
        links.findLiveByChild(childUserId).ifPresent(link -> {
            link.revoke();
            links.save(link);
        });
        return ParentLinkDto.none();
    }

    // ------------------------------------------------------------------
    // Parent side
    // ------------------------------------------------------------------

    /**
     * Accepts an invitation.
     *
     * <p>Called with or without a signed-in parent. Unauthenticated, it reports
     * back what the invitation is for so the page can prompt for signup — which
     * is the point where a parent who has no account yet gets one. That is why
     * the endpoint is public: requiring auth first would make the very first
     * click a dead end.
     */
    @Transactional
    public AcceptResultDto accept(String token, UUID parentUserId) {
        ParentLinkEntity link = links.findByInviteToken(token)
                .orElseThrow(() -> ApiException.notFound("parentLink.badToken",
                        "That invitation link is not valid."));
        if ("accepted".equals(link.getStatus()) && parentUserId != null
                && parentUserId.equals(link.getParentUserId())) {
            // Clicking the same link twice is not an error for the parent who
            // already accepted it.
            return accepted(link);
        }
        if (!link.isAcceptable(Instant.now())) {
            throw ApiException.badRequest("parentLink.expired",
                    "That invitation has expired or is no longer valid. Ask your child to send a new one.");
        }

        UserEntity child = users.findById(link.getChildUserId())
                .orElseThrow(() -> ApiException.notFound("parentLink.noChild",
                        "The account that sent this invitation no longer exists."));

        if (parentUserId == null) {
            // Not signed in: describe the invitation, do not consume it.
            return new AcceptResultDto(false, true, child.getName(), link.getContact(), null);
        }

        UserEntity parent = users.findById(parentUserId)
                .orElseThrow(() -> ApiException.notFound("auth.unknownUser", "That account no longer exists."));
        if (parent.getRole() != Role.PARENT) {
            throw ApiException.forbidden("parentLink.notAParent",
                    "Accept this invitation from a parent account.");
        }
        if (parent.getId().equals(child.getId())) {
            throw ApiException.badRequest("parentLink.self", "You cannot link an account to itself.");
        }

        link.accept(parent.getId());
        return accepted(links.save(link));
    }

    private AcceptResultDto accepted(ParentLinkEntity link) {
        String childName = users.findById(link.getChildUserId())
                .map(UserEntity::getName)
                .orElse("");
        return new AcceptResultDto(true, false, childName, link.getContact(), ParentLinkDto.of(link));
    }

    /** The accepted link for a parent, if any. */
    @Transactional(readOnly = true)
    public Optional<ParentLinkEntity> acceptedLinkForParent(UUID parentUserId) {
        return links.findAcceptedByParent(parentUserId);
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    /**
     * {@code parentContactChannel} from domain/parentLink.ts — an invitation
     * goes to exactly one channel, inferred rather than asked for twice.
     */
    static String channelFor(String value) {
        String v = value == null ? "" : value.trim();
        if (v.isEmpty()) {
            return null;
        }
        if (v.indexOf('@') != -1) {
            return EMAIL.matcher(v).matches() ? "email" : null;
        }
        String digits = v.replaceAll("[\\s()\\-.]", "");
        return PHONE.matcher(digits).matches() ? "phone" : null;
    }

    private String newToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /**
     * Emails the invite when the contact is an email address; logs the token
     * for a phone contact, same as before (SMS is still out of scope — see
     * the class doc). A failed send throws and the caller's transaction rolls
     * the whole invite/resend back with it, rather than leaving a "sent"
     * invitation on record that never actually reached anyone.
     */
    private void deliver(ParentLinkEntity link, String rawToken) {
        if (!"email".equals(link.getChannel())) {
            log.info("Parent invitation for child {} to {} ({}): accept with token {} (expires {})",
                    link.getChildUserId(), link.getContact(), link.getChannel(), rawToken, link.getExpiresAt());
            return;
        }
        String childName = users.findById(link.getChildUserId()).map(UserEntity::getName).orElse(null);
        String acceptUrl = properties.getAppBaseUrl() + "/parent/accept?token=" + rawToken;
        try {
            inviteMail.sendInvite(link.getContact(), childName, acceptUrl);
        } catch (MailException ex) {
            throw ApiException.serviceUnavailable("parentLink.mailSendFailed",
                    "Could not send the invitation email. Please try again shortly.");
        }
    }
}
