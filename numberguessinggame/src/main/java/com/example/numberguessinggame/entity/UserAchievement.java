package com.example.numberguessinggame.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_achievements",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "achievement_id"}))
public class UserAchievement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "achievement_id", nullable = false)
    private Achievement achievement;

    @Column(name = "unlocked_at", nullable = false, updatable = false)
    private LocalDateTime unlockedAt;

    @Column(name = "progress_value")
    private Integer progressValue;

    @Column(name = "notified", nullable = false)
    private Boolean notified = false;

    @PrePersist
    protected void onCreate() {
        unlockedAt = LocalDateTime.now();
    }

    // Constructors
    public UserAchievement() {}

    public UserAchievement(User user, Achievement achievement) {
        this.user = user;
        this.achievement = achievement;
        this.notified = false;
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

    public Achievement getAchievement() {
        return achievement;
    }

    public void setAchievement(Achievement achievement) {
        this.achievement = achievement;
    }

    public LocalDateTime getUnlockedAt() {
        return unlockedAt;
    }

    public void setUnlockedAt(LocalDateTime unlockedAt) {
        this.unlockedAt = unlockedAt;
    }

    public Integer getProgressValue() {
        return progressValue;
    }

    public void setProgressValue(Integer progressValue) {
        this.progressValue = progressValue;
    }

    public Boolean getNotified() {
        return notified;
    }

    public void setNotified(Boolean notified) {
        this.notified = notified;
    }
}
