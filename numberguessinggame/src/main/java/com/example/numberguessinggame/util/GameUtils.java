package com.example.numberguessinggame.util;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Utility class for game-related helper methods
 */
public class GameUtils {

    /**
     * Generate a number with unique digits
     *
     * @param digitCount Number of digits (3-5)
     * @return Integer with unique digits, first digit is never 0
     */
    public static int generateUniqueDigitNumber(int digitCount) {
        if (digitCount < 3 || digitCount > 10) {
            throw new IllegalArgumentException("digitCount must be between 3 and 10");
        }

        List<Integer> digits = new ArrayList<>();
        for (int i = 0; i <= 9; i++) {
            digits.add(i);
        }
        Collections.shuffle(digits);

        // Select digits, ensuring first digit is not 0
        List<Integer> selectedDigits = new ArrayList<>();
        for (int digit : digits) {
            if (selectedDigits.isEmpty() && digit == 0) {
                continue; // Skip 0 for first digit
            }
            selectedDigits.add(digit);
            if (selectedDigits.size() == digitCount) {
                break;
            }
        }

        // Build the number
        int result = 0;
        for (int digit : selectedDigits) {
            result = result * 10 + digit;
        }

        return result;
    }
}
