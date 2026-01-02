package com.example.numberguessinggame.repository;

import com.example.numberguessinggame.entity.Achievement;
import com.example.numberguessinggame.entity.User;
import com.example.numberguessinggame.entity.UserAchievement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserAchievementRepository extends JpaRepository<UserAchievement, Long> {

    List<UserAchievement> findByUserOrderByUnlockedAtDesc(User user);

    long countByUser(User user);

    boolean existsByUserAndAchievement(User user, Achievement achievement);

    @Query("SELECT ua.achievement.id FROM UserAchievement ua WHERE ua.user = :user")
    List<Long> findAchievementIdsByUser(@Param("user") User user);

    @Query("SELECT COUNT(ua) FROM UserAchievement ua WHERE ua.user = :user AND ua.notified = false")
    long countUnnotifiedByUser(@Param("user") User user);
}
