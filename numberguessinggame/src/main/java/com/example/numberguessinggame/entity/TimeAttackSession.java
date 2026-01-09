package com.example.numberguessinggame.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "time_attack_sessions")
public class TimeAttackSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = true)  // Nullable for guest players
    private User user;

    @Column(nullable = false)
    private Integer difficulty;  // 0=Easy(3 digits), 1=Medium(4 digits), 2=Hard(5 digits)

    @Column(name = "total_score", nullable = false)
    private Integer totalScore;

    @Column(name = "games_won", nullable = false)
    private Integer gamesWon;

    @Column(name = "games_played", nullable = false)
    private Integer gamesPlayed;

    @Column(name = "session_time_seconds", nullable = false)
    private Integer sessionTimeSeconds = 300;  // Always 5 minutes (300 seconds)

    @Column(name = "average_attempts", nullable = true)
    private Double averageAttempts;  // Average attempts per win

    @Column(name = "fastest_win_seconds", nullable = true)
    private Integer fastestWinSeconds;  // Fastest single game win time

    @CreationTimestamp
    @Column(name = "played_at", nullable = false, updatable = false)
    private LocalDateTime playedAt;

    @Column(name = "game_details", columnDefinition = "TEXT")
    private String gameDetails;  // JSON string storing array of individual game results

    // Constructors
    public TimeAttackSession() {
    }

    public TimeAttackSession(User user, Integer difficulty, Integer totalScore, Integer gamesWon,
                             Integer gamesPlayed, Double averageAttempts, Integer fastestWinSeconds,
                             String gameDetails) {
        this.user = user;
        this.difficulty = difficulty;
        this.totalScore = totalScore;
        this.gamesWon = gamesWon;
        this.gamesPlayed = gamesPlayed;
        this.sessionTimeSeconds = 300;
        this.averageAttempts = averageAttempts;
        this.fastestWinSeconds = fastestWinSeconds;
        this.gameDetails = gameDetails;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Integer getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(Integer difficulty) {
        this.difficulty = difficulty;
    }

    public Integer getTotalScore() {
        return totalScore;
    }

    public void setTotalScore(Integer totalScore) {
        this.totalScore = totalScore;
    }

    public Integer getGamesWon() {
        return gamesWon;
    }

    public void setGamesWon(Integer gamesWon) {
        this.gamesWon = gamesWon;
    }

    public Integer getGamesPlayed() {
        return gamesPlayed;
    }

    public void setGamesPlayed(Integer gamesPlayed) {
        this.gamesPlayed = gamesPlayed;
    }

    public Integer getSessionTimeSeconds() {
        return sessionTimeSeconds;
    }

    public void setSessionTimeSeconds(Integer sessionTimeSeconds) {
        this.sessionTimeSeconds = sessionTimeSeconds;
    }

    public Double getAverageAttempts() {
        return averageAttempts;
    }

    public void setAverageAttempts(Double averageAttempts) {
        this.averageAttempts = averageAttempts;
    }

    public Integer getFastestWinSeconds() {
        return fastestWinSeconds;
    }

    public void setFastestWinSeconds(Integer fastestWinSeconds) {
        this.fastestWinSeconds = fastestWinSeconds;
    }

    public LocalDateTime getPlayedAt() {
        return playedAt;
    }

    public void setPlayedAt(LocalDateTime playedAt) {
        this.playedAt = playedAt;
    }

    public String getGameDetails() {
        return gameDetails;
    }

    public void setGameDetails(String gameDetails) {
        this.gameDetails = gameDetails;
    }
}
