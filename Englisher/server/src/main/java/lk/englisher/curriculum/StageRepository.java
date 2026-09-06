package lk.englisher.curriculum;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Content is only ever read whole or replaced whole, so one ordered finder is the whole interface. */
public interface StageRepository extends JpaRepository<StageEntity, String> {

    List<StageEntity> findAllByOrderByOrdAsc();
}
