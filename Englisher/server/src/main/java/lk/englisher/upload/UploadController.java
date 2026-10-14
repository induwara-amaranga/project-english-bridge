package lk.englisher.upload;

import lk.englisher.common.ApiException;
import lk.englisher.config.UploadProperties;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Lesson images. Admins upload; everyone (including guests, whose browsers
 * cannot attach a bearer token to an {@code <img>}) reads.
 *
 * <p>The file type is decided from the file's own leading bytes, never from the
 * client-supplied name or content type, and the stored name is a server-made
 * UUID plus a fixed extension — so nothing the client sends can pick a path,
 * and nothing but PNG/JPEG/GIF/WebP (no SVG, which can carry script) is served.
 */
@RestController
@RequestMapping("/api")
public class UploadController {

    private static final Pattern STORED_NAME = Pattern.compile("[0-9a-f]{32}\\.(png|jpg|gif|webp)");

    private final Path root;

    public UploadController(UploadProperties properties) throws IOException {
        this.root = Path.of(properties.dir()).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    @PostMapping("/admin/uploads")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, String> upload(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) throw ApiException.badRequest("upload.empty", "That file is empty.");
        String ext = detectExtension(file);
        if (ext == null) {
            throw ApiException.badRequest("upload.unsupportedType", "Please choose a PNG, JPEG, GIF or WebP image.");
        }
        String name = UUID.randomUUID().toString().replace("-", "") + "." + ext;
        file.transferTo(root.resolve(name));
        return Map.of("url", "/api/uploads/" + name);
    }

    @GetMapping("/uploads/{name:.+}")
    public ResponseEntity<Resource> serve(@PathVariable String name) {
        if (!STORED_NAME.matcher(name).matches()) throw ApiException.notFound("upload.notFound", "Image not found.");
        Path file = root.resolve(name);
        if (!Files.isRegularFile(file)) throw ApiException.notFound("upload.notFound", "Image not found.");
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(mimeFor(name)))
                .header("X-Content-Type-Options", "nosniff")
                // Names are random and never reused, so the content is immutable.
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                .body(new FileSystemResource(file));
    }

    private static String detectExtension(MultipartFile file) throws IOException {
        byte[] h = new byte[12];
        int n;
        try (InputStream in = file.getInputStream()) {
            n = in.readNBytes(h, 0, h.length);
        }
        if (n >= 8 && (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G') return "png";
        if (n >= 3 && (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF) return "jpg";
        if (n >= 6 && h[0] == 'G' && h[1] == 'I' && h[2] == 'F' && h[3] == '8') return "gif";
        if (n >= 12 && h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F'
                && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P') return "webp";
        return null;
    }

    private static String mimeFor(String name) {
        if (name.endsWith(".png")) return "image/png";
        if (name.endsWith(".jpg")) return "image/jpeg";
        if (name.endsWith(".gif")) return "image/gif";
        return "image/webp";
    }
}
