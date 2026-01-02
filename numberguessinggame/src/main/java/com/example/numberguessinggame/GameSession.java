package com.example.numberguessinggame;

import java.time.LocalDateTime;

public class GameSession {
    private String tabId;
    private int targetNumber;
    private int difficulty;
    private Long userId;
    private LocalDateTime startTime;
    private int attemptsCount;

    public GameSession(String tabId, int targetNumber, int difficulty, Long userId) {
        this.tabId = tabId;
        this.targetNumber = targetNumber;
        this.difficulty = difficulty;
        this.userId = userId;
        this.startTime = LocalDateTime.now();
        this.attemptsCount = 0;
    }

    /**
     * @return String return the tabId
     */
    public String getTabId() {
        return tabId;
    }

    /**
     * @param tabId the tabId to set
     */
    public void setTabId(String tabId) {
        this.tabId = tabId;
    }

    /**
     * @return int return the targetNumber
     */
    public int getTargetNumber() {
        return targetNumber;
    }

    /**
     * @param targetNumber the targetNumber to set
     */
    public void setTargetNumber(int targetNumber) {
        this.targetNumber = targetNumber;
    }

    /**
     * @return int return the difficulty
     */
    public int getDifficulty() {
        return difficulty;
    }

    /**
     * @param difficulty the difficulty to set
     */
    public void setDifficulty(int difficulty) {
        this.difficulty = difficulty;
    }

    /**
     * @return Long return the userId
     */
    public Long getUserId() {
        return userId;
    }

    /**
     * @param userId the userId to set
     */
    public void setUserId(Long userId) {
        this.userId = userId;
    }

    /**
     * @return LocalDateTime return the startTime
     */
    public LocalDateTime getStartTime() {
        return startTime;
    }

    /**
     * @param startTime the startTime to set
     */
    public void setStartTime(LocalDateTime startTime) {
        this.startTime = startTime;
    }

    /**
     * @return int return the attemptsCount
     */
    public int getAttemptsCount() {
        return attemptsCount;
    }

    /**
     * @param attemptsCount the attemptsCount to set
     */
    public void setAttemptsCount(int attemptsCount) {
        this.attemptsCount = attemptsCount;
    }

    /**
     * Increment the attempts count
     */
    public void incrementAttempts() {
        this.attemptsCount++;
    }

}
