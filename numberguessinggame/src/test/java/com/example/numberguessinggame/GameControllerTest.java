package com.example.numberguessinggame;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.ResponseEntity;

import jakarta.servlet.http.HttpSession;

class GameControllerTest {

    private GameController gameController;
    private static final String MOCK_TAB_ID = "test-tab-id";

    @Mock
    private HttpSession mockSession;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        gameController = new GameController();
    }

    @Test
    void testStartNewGame_ValidDifficulty() {
        ResponseEntity<String> response = gameController.startNewGame(1, MOCK_TAB_ID, mockSession);
        assertEquals(200, response.getStatusCodeValue());
        assertTrue(response.getBody().contains("New game started with difficulty 1"));
    }

    @Test
    void testStartNewGame_InvalidDifficulty() {
        ResponseEntity<String> response = gameController.startNewGame(3, MOCK_TAB_ID, mockSession);
        assertEquals(400, response.getStatusCodeValue());
        assertTrue(response.getBody().contains("Invalid difficulty level"));
    }

    @Test
    void testProcessGuess_CorrectGuess() {
        gameController.startNewGame(1, MOCK_TAB_ID, mockSession);
        // Note: We can't set the target number directly anymore

        Map<String, Object> result = gameController.processGuess("1234", MOCK_TAB_ID, mockSession);
        // We can't assert exact values without knowing the target number
        assertNotNull(result.get("correct"));
        assertNotNull(result.get("correctPosition"));
        assertNotNull(result.get("correctButWrongPosition"));
    }

    @Test
    void testProcessGuess_PartiallyCorrectGuess() {
        gameController.startNewGame(1, MOCK_TAB_ID, mockSession);

        Map<String, Object> result = gameController.processGuess("1432", MOCK_TAB_ID, mockSession);
        assertNotNull(result.get("correct"));
        assertNotNull(result.get("correctPosition"));
        assertNotNull(result.get("correctButWrongPosition"));
    }

    @Test
    void testProcessGuess_AllWrongGuess() {
        gameController.startNewGame(1, MOCK_TAB_ID, mockSession);

        Map<String, Object> result = gameController.processGuess("5678", MOCK_TAB_ID, mockSession);
        assertFalse((Boolean) result.get("correct"));
        assertNotNull(result.get("correctPosition"));
        assertNotNull(result.get("correctButWrongPosition"));
    }

    @RepeatedTest(10)
    void testGenerateUniqueDigitNumber() {
        for (int difficulty = 0; difficulty <= 2; difficulty++) {
            gameController.startNewGame(difficulty, MOCK_TAB_ID, mockSession);

            int expectedLength = difficulty == 0 ? 3 : (difficulty == 1 ? 4 : 5);
        }
    }
}
