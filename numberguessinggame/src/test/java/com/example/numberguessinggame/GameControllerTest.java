package com.example.numberguessinggame;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.RepeatedTest;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class GameControllerTest {

    private GameController gameController;

    @BeforeEach
    void setUp() {
        gameController = new GameController();
    }

    @Test
    void testStartNewGame_ValidDifficulty() {
        ResponseEntity<String> response = gameController.startNewGame(1); // Medium difficulty
        assertEquals(200, response.getStatusCodeValue());
        assertTrue(response.getBody().contains("New game started with difficulty 1"));
    }

    @Test
    void testStartNewGame_InvalidDifficulty() {
        ResponseEntity<String> response = gameController.startNewGame(3); // Invalid difficulty
        assertEquals(400, response.getStatusCodeValue());
        assertTrue(response.getBody().contains("Invalid difficulty level"));
    }

    @Test
    void testProcessGuess_CorrectGuess() {
        gameController.startNewGame(1); // Medium difficulty
        gameController.setTargetNumber(1234); // Set a known target for testing

        Map<String, Object> result = gameController.processGuess("1234");
        assertTrue((Boolean) result.get("correct"));
        assertEquals(4, result.get("correctPosition"));
        assertEquals(0, result.get("correctButWrongPosition"));
    }

    @Test
    void testProcessGuess_PartiallyCorrectGuess() {
        gameController.startNewGame(1); // Medium difficulty
        gameController.setTargetNumber(1234); // Set a known target for testing

        Map<String, Object> result = gameController.processGuess("1432");
        assertFalse((Boolean) result.get("correct"));
        assertEquals(2, result.get("correctPosition"));
        assertEquals(2, result.get("correctButWrongPosition"));
    }

    @Test
    void testProcessGuess_AllWrongGuess() {
        gameController.startNewGame(1); // Medium difficulty
        gameController.setTargetNumber(1234); // Set a known target for testing

        Map<String, Object> result = gameController.processGuess("5678");
        assertFalse((Boolean) result.get("correct"));
        assertEquals(0, result.get("correctPosition"));
        assertEquals(0, result.get("correctButWrongPosition"));
    }

    @RepeatedTest(10)
    void testGenerateUniqueDigitNumber() {
        for (int difficulty = 0; difficulty <= 2; difficulty++) {
            gameController.startNewGame(difficulty);
            int targetNumber = gameController.getTargetNumber();
            int expectedLength = difficulty == 0 ? 3 : (difficulty == 1 ? 4 : 5);

            assertEquals(expectedLength, String.valueOf(targetNumber).length());
            assertEquals(expectedLength, String.valueOf(targetNumber).chars().distinct().count());
        }
    }
}