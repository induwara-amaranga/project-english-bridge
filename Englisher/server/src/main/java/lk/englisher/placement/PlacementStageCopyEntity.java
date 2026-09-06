package lk.englisher.placement;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** STAGE_NAMES and STAGE_MESSAGES from PlacementTest.tsx, keyed by stage number. */
@Entity
@Table(name = "placement_stage_copy")
public class PlacementStageCopyEntity {

    @Id
    @Column(name = "stage", nullable = false)
    private int stage;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "message", nullable = false)
    private String message;

    protected PlacementStageCopyEntity() {
    }

    public int getStage() {
        return stage;
    }

    public String getName() {
        return name;
    }

    public String getMessage() {
        return message;
    }
}
