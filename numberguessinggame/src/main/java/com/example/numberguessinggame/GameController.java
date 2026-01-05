package com.example.numberguessinggame;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.numberguessinggame.entity.Achievement;
import com.example.numberguessinggame.entity.Game;
import com.example.numberguessinggame.entity.User;
import com.example.numberguessinggame.repository.GameRepository;
import com.example.numberguessinggame.service.AchievementService;
import com.example.numberguessinggame.service.UserService;

import jakarta.servlet.http.HttpSession;

@RestController
public class GameController {

    // Game configuration constants
    private static final int DIFFICULTY_EASY = 0;
    private static final int DIFFICULTY_MEDIUM = 1;
    private static final int DIFFICULTY_HARD = 2;
    private static final int EASY_DIGITS = 3;
    private static final int MEDIUM_DIGITS = 4;
    private static final int HARD_DIGITS = 5;
    private static final int MIN_DIGIT = 0;
    private static final int MAX_DIGIT = 9;

    @Autowired
    private UserService userService;

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private AchievementService achievementService;

    private Map<String, GameSession> gameSessions = new ConcurrentHashMap<>();

    @PostMapping("/start-game")
    public ResponseEntity<Map<String, Object>> startNewGame(
            @RequestParam int difficulty,
            @RequestParam(required = false) Long userId,
            HttpSession session) {
        if (difficulty < DIFFICULTY_EASY || difficulty > DIFFICULTY_HARD) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Invalid difficulty level. Please try again...!");
            return ResponseEntity.badRequest().body(errorResponse);
        }

        String sessionId = session.getId();
        // Generate tabId server-side for security
        String tabId = java.util.UUID.randomUUID().toString();
        String compositeKey = sessionId + ":" + tabId;
        int targetNumber = generateUniqueDigitNumber(difficulty);
        GameSession gameSession = new GameSession(tabId, targetNumber, difficulty, userId);
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
        int expectedDigits = (difficulty == DIFFICULTY_EASY) ? EASY_DIGITS : (difficulty == DIFFICULTY_MEDIUM) ? MEDIUM_DIGITS : HARD_DIGITS;

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

        // Increment attempts count
        gameSession.incrementAttempts();

        Map<String, Object> response = new HashMap<>();
        response.put("correct", isCorrect);
        response.put("correctPosition", correctPosition);
        response.put("correctButWrongPosition", correctButWrongPosition);

        // Save game and clean up session when game ends (won)
        if (isCorrect) {
            List<Achievement> newAchievements = saveGameToDatabase(gameSession, true);

            // Include newly unlocked achievements in response
            if (!newAchievements.isEmpty()) {
                List<Map<String, Object>> achievementData = new ArrayList<>();
                for (Achievement achievement : newAchievements) {
                    Map<String, Object> achData = new HashMap<>();
                    achData.put("name", achievement.getName());
                    achData.put("description", achievement.getDescription());
                    achData.put("iconClass", achievement.getIconClass());
                    achData.put("iconColor", achievement.getIconColor());
                    achData.put("points", achievement.getPoints());
                    achievementData.add(achData);
                }
                response.put("newAchievements", achievementData);
            }

            // Include updated streak data in response
            if (gameSession.getUserId() != null) {
                Optional<User> userOptional = userService.findById(gameSession.getUserId());
                if (userOptional.isPresent()) {
                    User user = userOptional.get();
                    response.put("currentWinStreak", user.getCurrentWinStreak() != null ? user.getCurrentWinStreak() : 0);
                    response.put("bestWinStreak", user.getBestWinStreak() != null ? user.getBestWinStreak() : 0);
                    response.put("consecutivePlayDays", user.getConsecutivePlayDays() != null ? user.getConsecutivePlayDays() : 0);
                }
            }

            gameSessions.remove(compositeKey);
        }

        return response;
    }

    @PostMapping("/end-game")
    public ResponseEntity<String> endGame(@RequestParam String tabId, HttpSession session) {
        String sessionId = session.getId();
        String compositeKey = sessionId + ":" + tabId;
        GameSession gameSession = gameSessions.get(compositeKey);

        // Save game as lost if session exists
        if (gameSession != null) {
            saveGameToDatabase(gameSession, false);
        }

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
        int digitCount = (difficulty == DIFFICULTY_EASY) ? EASY_DIGITS : (difficulty == DIFFICULTY_MEDIUM) ? MEDIUM_DIGITS : HARD_DIGITS;
        List<Integer> digits = new ArrayList<>();
        for (int i = MIN_DIGIT; i <= MAX_DIGIT; i++) {
            digits.add(i);
        }
        Collections.shuffle(digits);

        StringBuilder numberBuilder = new StringBuilder();
        for (int i = 0; i < digitCount; i++) {
            if (i == 0 && digits.get(i) == MIN_DIGIT) {
                // Swap with a non-zero digit if the first digit is 0
                Collections.swap(digits, i, digits.indexOf(Collections.max(digits)));
            }
            numberBuilder.append(digits.get(i));
        }

        return Integer.parseInt(numberBuilder.toString());
    }

    private List<Achievement> saveGameToDatabase(GameSession gameSession, boolean won) {
        List<Achievement> newAchievements = new ArrayList<>();

        // Only save if user is logged in
        if (gameSession.getUserId() == null) {
            return newAchievements;
        }

        Optional<User> userOptional = userService.findById(gameSession.getUserId());
        if (userOptional.isEmpty()) {
            return newAchievements;
        }

        User user = userOptional.get();

        // Calculate time taken
        Duration duration = Duration.between(gameSession.getStartTime(), LocalDateTime.now());
        long seconds = duration.getSeconds();
        String timeTaken = String.format("%02d:%02d", seconds / 60, seconds % 60);

        // Create and save game record
        Game game = new Game(
                user,
                gameSession.getDifficulty(),
                gameSession.getTargetNumber(),
                gameSession.getAttemptsCount(),
                won,
                timeTaken
        );
        gameRepository.save(game);

        // Update user stats
        userService.updateUserStats(user.getId(), won, gameSession.getAttemptsCount());

        // Check and unlock achievements
        try {
            newAchievements = achievementService.checkAndUnlockAchievements(user, game);
            if (!newAchievements.isEmpty()) {
                System.out.println("User " + user.getUsername() + " unlocked " + newAchievements.size() + " achievement(s)");
            }
        } catch (Exception e) {
            // Don't fail game save if achievement check fails
            System.err.println("Achievement check failed: " + e.getMessage());
        }

        return newAchievements;
    }

}