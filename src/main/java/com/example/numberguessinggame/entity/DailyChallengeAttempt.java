package com.example.numberguessinggame.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "daily_challenge_attempts",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "challenge_id"})
)
public class DailyChallengeAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "challenge_id", nullable = false)
    private DailyChallenge challenge;

    @Column(nullable = false)
    private Integer attempts;

    @Column(nullable = false)
    private Boolean won;

    @Column(name = "time_taken_seconds", nullable = false)
    private Integer timeTakenSeconds;  // Store as integer for easier sorting

    @Column(name = "time_display")
    private String timeDisplay;  // For UI display (MM:SS format)

    @Column(name = "completed_at", nullable = false)
    private LocalDateTime completedAt;

    @PrePersist
    protected void onCreate() {
        completedAt = LocalDateTime.now();
    }

    // Constructors
    public DailyChallengeAttempt() {
    }

    public DailyChallengeAttempt(User user, DailyChallenge challenge, Integer attempts,
                                  Boolean won, Integer timeTakenSeconds, String timeDisplay) {
        this.user = user;
        this.challenge = challenge;
        this.attempts = attempts;
        this.won = won;
        this.timeTakenSeconds = timeTakenSeconds;
        this.timeDisplay = timeDisplay;
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

    public DailyChallenge getChallenge() {
        return challenge;
    }

    public void setChallenge(DailyChallenge challenge) {
        this.challenge = challenge;
    }

    public Integer getAttempts() {
        return attempts;
    }

    public void setAttempts(Integer attempts) {
        this.attempts = attempts;
    }

    public Boolean getWon() {
        return won;
    }

    public void setWon(Boolean won) {
        this.won = won;
    }

    public Integer getTimeTakenSeconds() {
        return timeTakenSeconds;
    }

    public void setTimeTakenSeconds(Integer timeTakenSeconds) {
        this.timeTakenSeconds = timeTakenSeconds;
    }

    public String getTimeDisplay() {
        return timeDisplay;
    }

    public void setTimeDisplay(String timeDisplay) {
        this.timeDisplay = timeDisplay;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }
}
