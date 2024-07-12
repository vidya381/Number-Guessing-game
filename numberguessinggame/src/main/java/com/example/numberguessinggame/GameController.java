package com.example.numberguessinggame;

import java.util.HashMap;
import java.util.Map;
import java.util.Random;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class GameController {

    private static final int MIN_NUMBER = 1000;
    private static final int MAX_NUMBER = 9999;
    private int targetNumber;

    @PostMapping("/start-game")
    public String startNewGame() {
        Random random = new Random();
        targetNumber = random.nextInt(MAX_NUMBER - MIN_NUMBER + 1) + MIN_NUMBER;
        return "New game started";
    }

    @PostMapping("/submit-guess")
    public Map<String, Object> processGuess(@RequestParam int guess) {
        int[] target = getDigits(targetNumber);
        int[] guessDigits = getDigits(guess);

        int correctPosition = 0;
        int correctButWrongPosition = 0;

        boolean[] used = new boolean[4];

        // Check for correct position
        for (int i = 0; i < 4; i++) {
            if (guessDigits[i] == target[i]) {
                correctPosition++;
                used[i] = true;
            }
        }

        // Check for correct but wrong position
        for (int i = 0; i < 4; i++) {
            if (guessDigits[i] != target[i]) {
                for (int j = 0; j < 4; j++) {
                    if (!used[j] && guessDigits[i] == target[j]) {
                        correctButWrongPosition++;
                        used[j] = true;
                        break;
                    }
                }
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("correct", correctPosition == 4);
        response.put("correctPosition", correctPosition);
        response.put("correctButWrongPosition", correctButWrongPosition);
        return response;
    }

    private int[] getDigits(int number) {
        int[] digits = new int[4];
        for (int i = 3; i >= 0; i--) {
            digits[i] = number % 10;
            number /= 10;
        }
        return digits;
    }
}