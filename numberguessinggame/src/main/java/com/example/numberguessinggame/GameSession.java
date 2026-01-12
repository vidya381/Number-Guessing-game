package com.example.numberguessinggame;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

public class GameSession {
    private String tabId;
    private int targetNumber;
    private int difficulty;
    private Long userId;
    private LocalDateTime startTime;
    private int attemptsCount;

    // Hint system fields
    private int hintsUsed;
    private Map<Integer, Integer> revealedHints; // position -> digit
    private static final int[] HINT_COSTS = {3, 5, 8, 12, 17, 23, 30, 38, 47, 57};

    public GameSession(String tabId, int targetNumber, int difficulty, Long userId) {
        this.tabId = tabId;
        this.targetNumber = targetNumber;
        this.difficulty = difficulty;
        this.userId = userId;
        this.startTime = LocalDateTime.now();
        this.attemptsCount = 0;
        this.hintsUsed = 0;
        this.revealedHints = new HashMap<>();
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

    /**
     * @return int return the hintsUsed
     */
    public int getHintsUsed() {
        return hintsUsed;
    }

    /**
     * @param hintsUsed the hintsUsed to set
     */
    public void setHintsUsed(int hintsUsed) {
        this.hintsUsed = hintsUsed;
    }

    /**
     * @return Map<Integer, Integer> return the revealedHints
     */
    public Map<Integer, Integer> getRevealedHints() {
        return revealedHints;
    }

    /**
     * @param revealedHints the revealedHints to set
     */
    public void setRevealedHints(Map<Integer, Integer> revealedHints) {
        this.revealedHints = revealedHints;
    }

    /**
     * Calculate the cost for the next hint based on hints already used
     * @return int the cost in coins for the next hint
     */
    public int getNextHintCost() {
        if (hintsUsed >= HINT_COSTS.length) {
            // For hints beyond the array, add 10 coins per additional hint
            return HINT_COSTS[HINT_COSTS.length - 1] + (hintsUsed - HINT_COSTS.length + 1) * 10;
        }
        return HINT_COSTS[hintsUsed];
    }

    /**
     * Record a hint that was revealed to the player
     * @param position the position in the code that was revealed (0-indexed)
     * @param digit the digit at that position
     */
    public void recordHint(int position, int digit) {
        revealedHints.put(position, digit);
        hintsUsed++;
    }

}
