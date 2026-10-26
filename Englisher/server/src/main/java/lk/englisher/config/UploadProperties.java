package lk.englisher.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * @param dir       directory lesson images are written to when no R2 bucket is
 *                  configured (local dev). Relative paths resolve against the
 *                  working directory. Not durable on Heroku — set the R2 fields.
 * @param endpoint  Cloudflare R2 S3 endpoint, {@code https://<account>.r2.cloudflarestorage.com}
 * @param accessKey R2 API token access key id
 * @param secretKey R2 API token secret
 * @param bucket    R2 bucket name; when non-empty, images are stored in R2 instead of {@code dir}
 */
@ConfigurationProperties(prefix = "englisher.uploads")
public record UploadProperties(
        @DefaultValue("./uploads") String dir,
        @DefaultValue("") String endpoint,
        @DefaultValue("") String accessKey,
        @DefaultValue("") String secretKey,
        @DefaultValue("") String bucket) {

    public boolean r2Enabled() {
        return !bucket.isBlank();
    }
}
