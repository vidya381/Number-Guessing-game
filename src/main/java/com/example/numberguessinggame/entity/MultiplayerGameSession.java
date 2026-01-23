package com.example.numberguessinggame.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "multiplayer_game_sessions")
public class MultiplayerGameSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false, unique = true)
    private String sessionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player1_id", nullable = false)
    private User player1;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player2_id", nullable = false)
    private User player2;

    @Column(nullable = false)
    private Integer difficulty;

    @Column(name = "digit_count", nullable = false)
    private Integer digitCount;

    @Column(name = "secret_number", nullable = false)
    private Integer secretNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "winner_id")
    private User winner;

    @Column(name = "started_at", nullable = false, updatable = false)
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    public enum Status {
        IN_PROGRESS,
        COMPLETED,
        ABANDONED
    }

    @PrePersist
    protected void onCreate() {
        startedAt = LocalDateTime.now();
    }

    // Constructors
    public MultiplayerGameSession() {
    }

    public MultiplayerGameSession(String sessionId, User player1, User player2,
                                   Integer difficulty, Integer digitCount, Integer secretNumber) {
        this.sessionId = sessionId;
        this.player1 = player1;
        this.player2 = player2;
        this.difficulty = difficulty;
        this.digitCount = digitCount;
        this.secretNumber = secretNumber;
        this.status = Status.IN_PROGRESS;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public User getPlayer1() {
        return player1;
    }

    public void setPlayer1(User player1) {
        this.player1 = player1;
    }

    public User getPlayer2() {
        return player2;
    }

    public void setPlayer2(User player2) {
        this.player2 = player2;
    }

    public Integer getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(Integer difficulty) {
        this.difficulty = difficulty;
    }

    public Integer getDigitCount() {
        return digitCount;
    }

    public void setDigitCount(Integer digitCount) {
        this.digitCount = digitCount;
    }

    public Integer getSecretNumber() {
        return secretNumber;
    }

    public void setSecretNumber(Integer secretNumber) {
        this.secretNumber = secretNumber;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public User getWinner() {
        return winner;
    }

    public void setWinner(User winner) {
        this.winner = winner;
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
}
