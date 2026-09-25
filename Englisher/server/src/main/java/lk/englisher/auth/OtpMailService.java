package lk.englisher.auth;

import lk.englisher.config.AuthProperties;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Sends an admin sign-in OTP over SMTP. In dev, {@code spring.mail.host}
 * points at the Mailpit container (see docker-compose.yml) so nothing ever
 * leaves the machine; in production it must point at a real relay via
 * {@code ENGLISHER_SMTP_*}.
 *
 * <p>Lets {@link org.springframework.mail.MailException} propagate rather than
 * swallowing it: {@code AuthService} calls this before committing the OTP
 * challenge, so a send failure rolls the challenge back and the admin sees a
 * clear "could not send the code" error instead of being stranded on a
 * code-entry screen that no email is ever going to answer.
 */
@Service
public class OtpMailService {

    private final JavaMailSender mailSender;
    private final AuthProperties properties;

    public OtpMailService(JavaMailSender mailSender, AuthProperties properties) {
        this.mailSender = mailSender;
        this.properties = properties;
    }

    public void sendOtp(String to, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(properties.getMailFrom());
        message.setTo(to);
        message.setSubject("Your Englisher sign-in code");
        message.setText("Your one-time sign-in code is " + code + ".\n\n"
                + "It expires in 10 minutes and can only be used once. "
                + "If you didn't try to sign in, you can ignore this email.");
        mailSender.send(message);
    }
}
