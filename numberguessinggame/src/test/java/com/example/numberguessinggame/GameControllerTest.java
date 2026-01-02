package com.example.numberguessinggame;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.ResponseEntity;

import jakarta.servlet.http.HttpSession;

class GameControllerTest {

    private GameController gameController;
    private static final String MOCK_SESSION_ID = "test-session-123";
    private String currentTabId;

    @Mock
    private HttpSession mockSession;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        gameController = new GameController();
        // Properly configure mock session to return a session ID
        when(mockSession.getId()).thenReturn(MOCK_SESSION_ID);
    }

    @Test
    void testStartNewGame_ValidDifficulty() {
        ResponseEntity<Map<String, Object>> response = gameController.startNewGame(1, mockSession);
        assertEquals(200, response.getStatusCodeValue());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().containsKey("tabId"));
        assertTrue(response.getBody().containsKey("message"));
        currentTabId = (String) response.getBody().get("tabId");
    }

    @Test
    void testStartNewGame_InvalidDifficulty() {
        ResponseEntity<Map<String, Object>> response = gameController.startNewGame(3, mockSession);
        assertEquals(400, response.getStatusCodeValue());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().containsKey("error"));
    }

    @Test
    void testProcessGuess_ValidGuess() {
        ResponseEntity<Map<String, Object>> startResponse = gameController.startNewGame(1, mockSession);
        String tabId = (String) startResponse.getBody().get("tabId");

        Map<String, Object> result = gameController.processGuess("1234", tabId, mockSession);
        // We can't assert exact values without knowing the target number
        assertNotNull(result.get("correct"));
        assertNotNull(result.get("correctPosition"));
        assertNotNull(result.get("correctButWrongPosition"));
    }

    @Test
    void testProcessGuess_AnotherValidGuess() {
        ResponseEntity<Map<String, Object>> startResponse = gameController.startNewGame(1, mockSession);
        String tabId = (String) startResponse.getBody().get("tabId");

        Map<String, Object> result = gameController.processGuess("5678", tabId, mockSession);
        assertNotNull(result.get("correct"));
        assertNotNull(result.get("correctPosition"));
        assertNotNull(result.get("correctButWrongPosition"));
    }

    @RepeatedTest(10)
    void testGenerateUniqueDigitNumber() {
        for (int difficulty = 0; difficulty <= 2; difficulty++) {
            ResponseEntity<Map<String, Object>> response = gameController.startNewGame(difficulty, mockSession);
            assertNotNull(response.getBody());
            assertTrue(response.getBody().containsKey("tabId"));
        }
    }
}
