package lk.englisher.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * @param dir directory lesson images are written to. Relative paths resolve
 *            against the working directory; in production point this at a
 *            mounted volume, or uploads vanish on redeploy.
 */
@ConfigurationProperties(prefix = "englisher.uploads")
public record UploadProperties(@DefaultValue("./uploads") String dir) {
}
