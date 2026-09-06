package lk.englisher.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import lk.englisher.auth.Role;
import lk.englisher.auth.UserEntity;
import lk.englisher.auth.UserRepository;
import lk.englisher.curriculum.CurriculumService;
import lk.englisher.curriculum.StageRepository;
import lk.englisher.curriculum.dto.CurriculumDtos.CurriculumDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.io.InputStream;

/**
 * Seeds the curriculum and the one admin account on first boot.
 *
 * <p>{@code seed/curriculum-default.json} is not hand-written: it was generated
 * by running {@code CURRICULUM_DEFAULT} from
 * {@code app/src/domain/curriculum.ts} through {@code repairUnlocks} and
 * {@code normaliseCurriculum} and serialising the result. The 8 stages (3
 * authored, 5 placeholder) are a content decision REACT-MIGRATION.md already
 * settled — copied, not re-derived, so the deployed default matches the
 * prototype exactly.
 *
 * <p>Seeding is skipped when any stage already exists, so restarting the server
 * never overwrites an admin's edits.
 */
@Component
public class DataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);
    private static final String SEED = "seed/curriculum-default.json";

    private final StageRepository stages;
    private final CurriculumService curriculum;
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final AuthProperties properties;
    private final ObjectMapper json;

    public DataSeeder(StageRepository stages, CurriculumService curriculum, UserRepository users,
                      PasswordEncoder passwords, AuthProperties properties, ObjectMapper json) {
        this.stages = stages;
        this.curriculum = curriculum;
        this.users = users;
        this.passwords = passwords;
        this.properties = properties;
        this.json = json;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        seedCurriculum();
        seedAdmin();
    }

    private void seedCurriculum() throws Exception {
        if (stages.count() > 0) {
            log.debug("Curriculum already present ({} stages); not seeding.", stages.count());
            return;
        }
        try (InputStream in = new ClassPathResource(SEED).getInputStream()) {
            CurriculumDto seed = json.readValue(in, CurriculumDto.class);
            // Through the same code path an admin save uses, so the seed is
            // validated by the same invariants rather than trusted.
            curriculum.replace(seed, null);
            log.info("Seeded curriculum v{} with {} stages from {}.",
                    seed.version(), seed.stages().size(), SEED);
        }
    }

    /**
     * There is no path to becoming an admin through the UI — the prototype had
     * none either — so the first one is provisioned here.
     *
     * <p>Skipped entirely when no password is configured, rather than falling
     * back to a default one: a well-known admin password on a deployed server is
     * worse than no admin account at all.
     */
    private void seedAdmin() {
        String password = properties.getAdminPassword();
        if (password == null || password.isBlank()) {
            log.warn("No englisher.auth.admin-password set; skipping admin seed. "
                    + "Set ENGLISHER_ADMIN_PASSWORD to provision {}.", properties.getAdminEmail());
            return;
        }
        if (users.existsByEmailIgnoringCase(properties.getAdminEmail())) {
            return;
        }
        users.save(new UserEntity(
                properties.getAdminEmail(),
                passwords.encode(password),
                properties.getAdminName(),
                Role.ADMIN,
                json.createObjectNode()));
        log.info("Seeded admin account {}.", properties.getAdminEmail());
    }
}
