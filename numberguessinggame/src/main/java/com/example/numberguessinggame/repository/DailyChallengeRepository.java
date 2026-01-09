package com.example.numberguessinggame.repository;

import com.example.numberguessinggame.entity.DailyChallenge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface DailyChallengeRepository extends JpaRepository<DailyChallenge, Long> {

    /**
     * Find challenge by date
     */
    Optional<DailyChallenge> findByChallengeDate(LocalDate date);

    /**
     * Check if challenge exists for a date
     */
    boolean existsByChallengeDate(LocalDate date);
}
