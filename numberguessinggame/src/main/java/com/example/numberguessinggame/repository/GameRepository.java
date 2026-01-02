package com.example.numberguessinggame.repository;

import com.example.numberguessinggame.entity.Game;
import com.example.numberguessinggame.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GameRepository extends JpaRepository<Game, Long> {

    List<Game> findByUserOrderByPlayedAtDesc(User user);

    List<Game> findTop10ByWonTrueOrderByAttemptsAsc();

    List<Game> findByUserAndDifficultyOrderByPlayedAtDesc(User user, Integer difficulty);

    long countByUser(User user);

    long countByUserAndWon(User user, Boolean won);
}
