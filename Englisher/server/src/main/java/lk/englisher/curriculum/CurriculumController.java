package lk.englisher.curriculum;

import jakarta.validation.Valid;
import lk.englisher.auth.CurrentUser;
import lk.englisher.curriculum.dto.CurriculumDtos.CurriculumDto;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The content endpoints — {@code getCurriculum()} and {@code setCurriculum()}
 * from lib/storage.ts.
 *
 * <p>Reading is open to any signed-in account, including parents, because the
 * parent dashboard resolves stage names from the same document. Writing is
 * admin-only, and that annotation is the actual boundary — {@code RequireRole}
 * in the React app is a redirect, not a guard.
 */
@RestController
@RequestMapping("/api")
public class CurriculumController {

    private final CurriculumService service;

    public CurriculumController(CurriculumService service) {
        this.service = service;
    }

    @GetMapping("/curriculum")
    public CurriculumDto get() {
        return service.load();
    }

    /**
     * Whole-document replace. Returns the stored document rather than an empty
     * 204: {@code repairUnlocks} and the card/explanation sync may have changed
     * what was sent, and the editor should show what was actually saved.
     */
    @PutMapping("/admin/curriculum")
    @PreAuthorize("hasRole('ADMIN')")
    public CurriculumDto replace(@Valid @RequestBody CurriculumDto curriculum) {
        return service.replace(curriculum, CurrentUser.requireId());
    }
}
