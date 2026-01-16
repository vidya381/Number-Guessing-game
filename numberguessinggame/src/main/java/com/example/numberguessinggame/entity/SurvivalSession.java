package com.example.numberguessinggame.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "survival_sessions")
public class SurvivalSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private Integer difficulty;  // 0=Easy, 1=Medium, 2=Hard

    @Column(name = "rounds_survived", nullable = false)
    private Integer roundsSurvived;  // 0-5

    @Column(name = "total_attempts_used", nullable = false)
    private Integer totalAttemptsUsed;  // Sum of attempts across all rounds

    @Column(nullable = false)
    private Boolean completed;  // true if 5/5 rounds

    @Column(name = "coins_earned", nullable = false)
    private Integer coinsEarned = 0;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @CreationTimestamp
    @Column(name = "completed_at", nullable = false, updatable = false)
    private LocalDateTime completedAt;

    @Column(name = "is_best_run", nullable = false)
    private Boolean isBestRun = false;

    // Constructors
    public SurvivalSession() {
    }

    public SurvivalSession(User user, Integer difficulty, Integer roundsSurvived,
                          Integer totalAttemptsUsed, Boolean completed, Integer coinsEarned,
                          LocalDateTime startedAt) {
        this.user = user;
        this.difficulty = difficulty;
        this.roundsSurvived = roundsSurvived;
        this.totalAttemptsUsed = totalAttemptsUsed;
        this.completed = completed;
        this.coinsEarned = coinsEarned;
        this.startedAt = startedAt;
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

    public Integer getRoundsSurvived() {
        return roundsSurvived;
    }

    public void setRoundsSurvived(Integer roundsSurvived) {
        this.roundsSurvived = roundsSurvived;
    }

    public Integer getTotalAttemptsUsed() {
        return totalAttemptsUsed;
    }

    public void setTotalAttemptsUsed(Integer totalAttemptsUsed) {
        this.totalAttemptsUsed = totalAttemptsUsed;
    }

    public Boolean getCompleted() {
        return completed;
    }

    public void setCompleted(Boolean completed) {
        this.completed = completed;
    }

    public Integer getCoinsEarned() {
        return coinsEarned;
    }

    public void setCoinsEarned(Integer coinsEarned) {
        this.coinsEarned = coinsEarned;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(LocalDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public Boolean getIsBestRun() {
        return isBestRun;
    }

    public void setIsBestRun(Boolean isBestRun) {
        this.isBestRun = isBestRun;
    }
}
