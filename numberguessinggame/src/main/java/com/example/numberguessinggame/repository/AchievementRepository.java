package com.example.numberguessinggame.repository;

import com.example.numberguessinggame.entity.Achievement;
import com.example.numberguessinggame.entity.Achievement.AchievementType;
import com.example.numberguessinggame.entity.Achievement.AchievementCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AchievementRepository extends JpaRepository<Achievement, Long> {

    Optional<Achievement> findByCode(String code);

    List<Achievement> findByActiveTrue();

    List<Achievement> findByTypeAndActiveTrue(AchievementType type);

    List<Achievement> findByCategoryAndActiveTrue(AchievementCategory category);
}
