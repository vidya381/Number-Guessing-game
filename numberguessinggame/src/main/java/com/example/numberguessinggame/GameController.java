package com.example.numberguessinggame;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpSession;

@RestController
public class GameController {

    private Map<String, GameSession> gameSessions = new ConcurrentHashMap<>();

    @PostMapping("/start-game")
    public ResponseEntity<Map<String, Object>> startNewGame(@RequestParam int difficulty, HttpSession session) {
        if (difficulty < 0 || difficulty > 2) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Invalid difficulty level. Please try again...!");
            return ResponseEntity.badRequest().body(errorResponse);
        }

        String sessionId = session.getId();
        // Generate tabId server-side for security
        String tabId = java.util.UUID.randomUUID().toString();
        String compositeKey = sessionId + ":" + tabId;
        int targetNumber = generateUniqueDigitNumber(difficulty);
        GameSession gameSession = new GameSession(tabId, targetNumber, difficulty);
        gameSessions.put(compositeKey, gameSession);

        System.out.println("Target number for session " + compositeKey + ": " + targetNumber);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "New game started with difficulty " + difficulty);
        response.put("tabId", tabId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/submit-guess")
    public Map<String, Object> processGuess(@RequestParam String guess, @RequestParam String tabId,
            HttpSession session) {
        String sessionId = session.getId();
        String compositeKey = sessionId + ":" + tabId;
        GameSession gameSession = gameSessions.get(compositeKey);

        if (gameSession == null) {
            throw new IllegalStateException("No active game session found");
        }

        int targetNumber = gameSession.getTargetNumber();
        int difficulty = gameSession.getDifficulty();
        int expectedDigits = (difficulty == 0) ? 3 : (difficulty == 1) ? 4 : 5;

        // Validate input
        if (guess == null || guess.isEmpty()) {
            throw new IllegalArgumentException("Guess cannot be empty");
        }
        if (!guess.matches("\\d+")) {
            throw new IllegalArgumentException("Guess must contain only digits");
        }
        if (guess.length() != expectedDigits) {
            throw new IllegalArgumentException("Guess must have exactly " + expectedDigits + " digits");
        }
        if (guess.chars().distinct().count() != guess.length()) {
            throw new IllegalArgumentException("Guess must have unique digits");
        }

        int[] target = getDigits(targetNumber);
        int[] guessDigits = getDigits(Integer.parseInt(guess));
        int correctPosition = 0;
        int correctButWrongPosition = 0;
        boolean[] used = new boolean[target.length];

        // First pass: Check for correct positions
        for (int i = 0; i < target.length; i++) {
            if (guessDigits[i] == target[i]) {
                correctPosition++;
                used[i] = true;
            }
        }

        // Second pass: Check for correct digits in wrong positions
        for (int i = 0; i < target.length; i++) {
            if (guessDigits[i] != target[i]) {
                for (int j = 0; j < target.length; j++) {
                    if (!used[j] && guessDigits[i] == target[j]) {
                        correctButWrongPosition++;
                        used[j] = true;
                        break;
                    }
                }
            }
        }

        boolean isCorrect = correctPosition == target.length;

        Map<String, Object> response = new HashMap<>();
        response.put("correct", isCorrect);
        response.put("correctPosition", correctPosition);
        response.put("correctButWrongPosition", correctButWrongPosition);

        // Clean up session when game ends (won or max attempts reached)
        if (isCorrect) {
            gameSessions.remove(compositeKey);
        }

        return response;
    }

    @PostMapping("/end-game")
    public ResponseEntity<String> endGame(@RequestParam String tabId, HttpSession session) {
        String sessionId = session.getId();
        String compositeKey = sessionId + ":" + tabId;
        gameSessions.remove(compositeKey);
        return ResponseEntity.ok("Game session ended");
    }

    private int[] getDigits(int number) {
        String numberString = String.valueOf(number);
        int[] digits = new int[numberString.length()];
        for (int i = 0; i < numberString.length(); i++) {
            digits[i] = Character.getNumericValue(numberString.charAt(i));
        }
        return digits;
    }

    private int generateUniqueDigitNumber(int difficulty) {
        int digitCount = difficulty == 0 ? 3 : (difficulty == 1 ? 4 : 5);
        List<Integer> digits = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            digits.add(i);
        }
        Collections.shuffle(digits);

        StringBuilder numberBuilder = new StringBuilder();
        for (int i = 0; i < digitCount; i++) {
            if (i == 0 && digits.get(i) == 0) {
                // Swap with a non-zero digit if the first digit is 0
                Collections.swap(digits, i, digits.indexOf(Collections.max(digits)));
            }
            numberBuilder.append(digits.get(i));
        }

        return Integer.parseInt(numberBuilder.toString());
    }

}