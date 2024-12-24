package com.example.numberguessinggame;

public class GameSession {
    private String tabId;
    private int targetNumber;
    private int difficulty;

    public GameSession(String tabId, int targetNumber, int difficulty) {
        this.tabId = tabId;
        this.targetNumber = targetNumber;
        this.difficulty = difficulty;
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

}
