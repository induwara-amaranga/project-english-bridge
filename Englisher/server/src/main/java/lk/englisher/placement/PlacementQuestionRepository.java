package lk.englisher.placement;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

interface PlacementQuestionRepository extends JpaRepository<PlacementQuestionEntity, UUID> {
    List<PlacementQuestionEntity> findAllByOrderByOrdAsc();
}
