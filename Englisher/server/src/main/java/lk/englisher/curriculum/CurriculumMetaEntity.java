package lk.englisher.curriculum;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * The single row holding {@code Curriculum.version} plus a light audit trail of
 * who last saved the document. Constrained to {@code id = 1} in the schema —
 * there is exactly one curriculum.
 */
@Entity
@Table(name = "curriculum_meta")
public class CurriculumMetaEntity {

    public static final int SINGLETON_ID = 1;

    @Id
    @Column(name = "id", nullable = false)
    private int id = SINGLETON_ID;

    @Column(name = "version", nullable = false)
    private int version;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Column(name = "updated_by")
    private UUID updatedBy;

    protected CurriculumMetaEntity() {
    }

    public CurriculumMetaEntity(int version, UUID updatedBy) {
        this.id = SINGLETON_ID;
        this.version = version;
        this.updatedBy = updatedBy;
        this.updatedAt = Instant.now();
    }

    public int getVersion() {
        return version;
    }

    public void update(int version, UUID updatedBy) {
        this.version = version;
        this.updatedBy = updatedBy;
        this.updatedAt = Instant.now();
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public UUID getUpdatedBy() {
        return updatedBy;
    }
}
