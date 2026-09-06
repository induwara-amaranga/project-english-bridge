package lk.englisher.parent;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * A child's invitation to a parent.
 *
 * <p>This is the one place the backend genuinely departs from the prototype
 * rather than porting it. {@code parent-link.js} stored only a contact string,
 * because the whole app was a single session — there was no such thing as "the
 * parent's account". Now that parent is a real role,
 * {@link #getParentUserId()} stays null until someone holding a valid,
 * unexpired token accepts, and that acceptance is what binds the two accounts.
 */
@Entity
@Table(name = "parent_links")
public class ParentLinkEntity {

    @Id
    @GeneratedValue
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "child_user_id", nullable = false)
    private UUID childUserId;

    /** Null until accepted — the invitation exists before the parent does. */
    @Column(name = "parent_user_id")
    private UUID parentUserId;

    @Column(name = "contact", nullable = false)
    private String contact;

    /** {@code email} or {@code phone}, inferred from the contact string. */
    @Column(name = "channel", nullable = false)
    private String channel;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "invite_token", nullable = false)
    private String inviteToken;

    @Column(name = "invited_at", nullable = false)
    private Instant invitedAt = Instant.now();

    @Column(name = "accepted_at")
    private Instant acceptedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    protected ParentLinkEntity() {
    }

    public ParentLinkEntity(UUID childUserId, String contact, String channel,
                            String inviteToken, Instant expiresAt) {
        this.childUserId = childUserId;
        this.contact = contact;
        this.channel = channel;
        this.status = "invited";
        this.inviteToken = inviteToken;
        this.expiresAt = expiresAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getChildUserId() {
        return childUserId;
    }

    public UUID getParentUserId() {
        return parentUserId;
    }

    public String getContact() {
        return contact;
    }

    public String getChannel() {
        return channel;
    }

    public String getStatus() {
        return status;
    }

    public String getInviteToken() {
        return inviteToken;
    }

    public Instant getInvitedAt() {
        return invitedAt;
    }

    public Instant getAcceptedAt() {
        return acceptedAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    /**
     * Re-sending keeps the row but issues a new token and clock, and re-points
     * it at whatever contact was given this time — a child correcting a typo'd
     * address is the common case, and keeping the old one would send the
     * invitation right back to the wrong place.
     */
    public void reissue(String contact, String channel, String inviteToken, Instant expiresAt) {
        this.contact = contact;
        this.channel = channel;
        this.inviteToken = inviteToken;
        this.expiresAt = expiresAt;
        this.invitedAt = Instant.now();
        this.status = "invited";
    }

    public void accept(UUID parentUserId) {
        this.parentUserId = parentUserId;
        this.status = "accepted";
        this.acceptedAt = Instant.now();
    }

    public void revoke() {
        this.status = "revoked";
    }

    public boolean isAcceptable(Instant now) {
        return "invited".equals(status) && expiresAt.isAfter(now);
    }
}
