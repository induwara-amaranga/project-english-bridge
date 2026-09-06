package lk.englisher.curriculum;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/** Content is only ever read whole or replaced whole, so one ordered finder is the whole interface. */
public interface CardRepository extends JpaRepository<CardEntity, UUID> {

    List<CardEntity> findAllByOrderByOrdAsc();
}
