package com.example.numberguessinggame.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String username;

    @Column(unique = true, nullable = false, length = 100)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "best_score")
    private Integer bestScore;

    @Column(name = "total_games")
    private Integer totalGames = 0;

    @Column(name = "total_wins")
    private Integer totalWins = 0;

    // Streak tracking fields
    @Column(name = "current_win_streak")
    private Integer currentWinStreak = 0;

    @Column(name = "best_win_streak")
    private Integer bestWinStreak = 0;

    @Column(name = "last_played_date")
    private LocalDate lastPlayedDate;

    @Column(name = "consecutive_play_days")
    private Integer consecutivePlayDays = 0;

    @Column(name = "best_play_day_streak")
    private Integer bestPlayDayStreak = 0;

    @Column(name = "coins")
    private Integer coins = 0;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // Constructors
    public User() {
    }

    public User(String username, String email, String password) {
        this.username = username;
        this.email = email;
        this.password = password;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Integer getBestScore() {
        return bestScore;
    }

    public void setBestScore(Integer bestScore) {
        this.bestScore = bestScore;
    }

    public Integer getTotalGames() {
        return totalGames;
    }

    public void setTotalGames(Integer totalGames) {
        this.totalGames = totalGames;
    }

    public Integer getTotalWins() {
        return totalWins;
    }

    public void setTotalWins(Integer totalWins) {
        this.totalWins = totalWins;
    }

    public Integer getCurrentWinStreak() {
        return currentWinStreak;
    }

    public void setCurrentWinStreak(Integer currentWinStreak) {
        this.currentWinStreak = currentWinStreak;
    }

    public Integer getBestWinStreak() {
        return bestWinStreak;
    }

    public void setBestWinStreak(Integer bestWinStreak) {
        this.bestWinStreak = bestWinStreak;
    }

    public LocalDate getLastPlayedDate() {
        return lastPlayedDate;
    }

    public void setLastPlayedDate(LocalDate lastPlayedDate) {
        this.lastPlayedDate = lastPlayedDate;
    }

    public Integer getConsecutivePlayDays() {
        return consecutivePlayDays;
    }

    public void setConsecutivePlayDays(Integer consecutivePlayDays) {
        this.consecutivePlayDays = consecutivePlayDays;
    }

    public Integer getBestPlayDayStreak() {
        return bestPlayDayStreak;
    }

    public void setBestPlayDayStreak(Integer bestPlayDayStreak) {
        this.bestPlayDayStreak = bestPlayDayStreak;
    }

    public Integer getCoins() {
        return coins;
    }

    public void setCoins(Integer coins) {
        this.coins = coins;
    }

    public void addCoins(Integer amount) {
        if (amount > 0) {
            this.coins = (this.coins == null ? 0 : this.coins) + amount;
        }
    }

    public boolean deductCoins(Integer amount) {
        if (amount > 0 && this.coins != null && this.coins >= amount) {
            this.coins -= amount;
            return true;
        }
        return false;
    }
}
