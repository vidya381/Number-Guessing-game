package com.example.numberguessinggame;

import java.util.HashMap;
import java.util.Map;
import java.util.Random;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class GameController {

    private static final int[] MIN_NUMBERS = { 100, 1000, 10000 };
    private static final int[] MAX_NUMBERS = { 999, 9999, 99999 };
    private int targetNumber;
    private int difficulty = 1; // 0 for easy, 1 for medium, 2 for hard

    @PostMapping("/start-game")
    public ResponseEntity<String> startNewGame(@RequestParam int difficulty) {
        if (difficulty < 0 || difficulty > 2) {
            return ResponseEntity.badRequest().body("Invalid difficulty level. Please try again...!");
        }
        this.difficulty = difficulty;
        Random random = new Random();
        targetNumber = random.nextInt(MAX_NUMBERS[difficulty] - MIN_NUMBERS[difficulty] + 1) + MIN_NUMBERS[difficulty];
        return ResponseEntity.ok("New game started with difficulty " + difficulty);
    }

    @PostMapping("/submit-guess")
    public Map<String, Object> processGuess(@RequestParam String guess) {
        int[] target = getDigits(targetNumber);
        int[] guessDigits = getDigits(Integer.parseInt(guess));

        int correctPosition = 0;
        int correctButWrongPosition = 0;

        boolean[] used = new boolean[target.length];

        // Check for correct position
        for (int i = 0; i < target.length; i++) {
            if (guessDigits[i] == target[i]) {
                correctPosition++;
                used[i] = true;
            }
        }

        // Check for correct but wrong position
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

        Map<String, Object> response = new HashMap<>();
        response.put("correct", correctPosition == target.length);
        response.put("correctPosition", correctPosition);
        response.put("correctButWrongPosition", correctButWrongPosition);
        return response;
    }

    private int[] getDigits(int number) {
        int digitCount = difficulty == 0 ? 3 : (difficulty == 1 ? 4 : 5);
        int[] digits = new int[digitCount];
        for (int i = digitCount - 1; i >= 0; i--) {
            digits[i] = number % 10;
            number /= 10;
        }
        return digits;
    }
}