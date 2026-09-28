package lk.englisher.parent;

import lk.englisher.config.AuthProperties;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Sends the "a child invited you" email over SMTP — same transport as
 * {@code auth.OtpMailService} (Mailpit in dev, a real relay via
 * {@code ENGLISHER_SMTP_*} in prod), separate class because the two emails
 * have nothing else in common.
 *
 * <p>Lets {@link org.springframework.mail.MailException} propagate rather
 * than swallowing it — {@code ParentLinkService} calls this before the
 * invitation's transaction commits, so a send failure rolls the whole
 * invite/resend back and the child sees a clear error instead of an
 * invitation that silently never arrives.
 */
@Service
public class ParentInviteMailService {

    private final JavaMailSender mailSender;
    private final AuthProperties properties;

    public ParentInviteMailService(JavaMailSender mailSender, AuthProperties properties) {
        this.mailSender = mailSender;
        this.properties = properties;
    }

    public void sendInvite(String to, String childName, String acceptUrl) {
        String who = childName == null || childName.isBlank() ? "A learner" : childName;
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(properties.getMailFrom());
        message.setTo(to);
        message.setSubject(who + " invited you to Englisher");
        message.setText(who + " wants you to be able to see their English learning progress on Englisher.\n\n"
                + "Open this link to accept:\n" + acceptUrl + "\n\n"
                + "If you don't recognise this name, you can ignore this email.");
        mailSender.send(message);
    }
}
