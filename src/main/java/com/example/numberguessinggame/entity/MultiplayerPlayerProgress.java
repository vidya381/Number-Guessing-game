package com.example.numberguessinggame.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "multiplayer_player_progress", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"session_id", "user_id"})
})
public class MultiplayerPlayerProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private MultiplayerGameSession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "attempts_count", nullable = false)
    private Integer attemptsCount = 0;

    @Column(nullable = false)
    private Boolean solved = false;

    @Column(name = "solved_at")
    private LocalDateTime solvedAt;

    @Column(nullable = false)
    private Boolean connected = true;

    @Column(name = "last_activity", nullable = false)
    private LocalDateTime lastActivity;

    @PrePersist
    protected void onCreate() {
        if (lastActivity == null) {
            lastActivity = LocalDateTime.now();
        }
    }

    // Constructors
    public MultiplayerPlayerProgress() {
    }

    public MultiplayerPlayerProgress(MultiplayerGameSession session, User user) {
        this.session = session;
        this.user = user;
        this.attemptsCount = 0;
        this.solved = false;
        this.connected = true;
        this.lastActivity = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public MultiplayerGameSession getSession() {
        return session;
    }

    public void setSession(MultiplayerGameSession session) {
        this.session = session;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Integer getAttemptsCount() {
        return attemptsCount;
    }

    public void setAttemptsCount(Integer attemptsCount) {
        this.attemptsCount = attemptsCount;
    }

    public Boolean getSolved() {
        return solved;
    }

    public void setSolved(Boolean solved) {
        this.solved = solved;
    }

    public LocalDateTime getSolvedAt() {
        return solvedAt;
    }

    public void setSolvedAt(LocalDateTime solvedAt) {
        this.solvedAt = solvedAt;
    }

    public Boolean getConnected() {
        return connected;
    }

    public void setConnected(Boolean connected) {
        this.connected = connected;
    }

    public LocalDateTime getLastActivity() {
        return lastActivity;
    }

    public void setLastActivity(LocalDateTime lastActivity) {
        this.lastActivity = lastActivity;
    }
}
