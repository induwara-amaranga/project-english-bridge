package lk.englisher.curriculum;

import org.springframework.data.jpa.repository.JpaRepository;

/** The single-row table holding Curriculum.version. */
public interface CurriculumMetaRepository extends JpaRepository<CurriculumMetaEntity, Integer> {
}
