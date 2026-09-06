package lk.englisher.placement;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

interface PlacementStageCopyRepository extends JpaRepository<PlacementStageCopyEntity, Integer> {
    List<PlacementStageCopyEntity> findAllByOrderByStageAsc();
}
