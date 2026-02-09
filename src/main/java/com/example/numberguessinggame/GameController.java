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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.numberguessinggame.entity.Achievement;
import com.example.numberguessinggame.entity.Game;
import com.example.numberguessinggame.entity.User;
import com.example.numberguessinggame.repository.GameRepository;
import com.example.numberguessinggame.repository.UserRepository;
import com.example.numberguessinggame.service.AchievementService;
import com.example.numberguessinggame.service.UserService;

import jakarta.servlet.http.HttpSession;

@RestController
public class GameController {

    private static final Logger logger = LoggerFactory.getLogger(GameController.class);

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
    private UserRepository userRepository;

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
            errorResponse.put("error", "Please choose Easy, Medium, or Hard difficulty!");
            return ResponseEntity.badRequest().body(errorResponse);
        }

        String sessionId = session.getId();
        // Generate tabId server-side for security
        String tabId = java.util.UUID.randomUUID().toString();
        String compositeKey = sessionId + ":" + tabId;
        int targetNumber = generateUniqueDigitNumber(difficulty);
        GameSession gameSession = new GameSession(tabId, targetNumber, difficulty, userId);
        gameSessions.put(compositeKey, gameSession);

        // Log target number for reference
        String difficultyName = difficulty == DIFFICULTY_EASY ? "Easy" : difficulty == DIFFICULTY_MEDIUM ? "Medium" : "Hard";
        if (userId != null) {
            userRepository.findById(userId).ifPresent(user ->
                logger.info("[ADMIN] Practice Mode Start | User: {} | Difficulty: {} | Target: {} | Session: {}",
                        user.getUsername(), difficultyName, targetNumber, compositeKey)
            );
        } else {
            logger.info("[ADMIN] Practice Mode Start | Guest | Difficulty: {} | Target: {} | Session: {}",
                    difficultyName, targetNumber, compositeKey);
        }

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
            throw new IllegalStateException("Your game session expired. Let's start a new one!");
        }

        int targetNumber = gameSession.getTargetNumber();
        int difficulty = gameSession.getDifficulty();
        int expectedDigits = (difficulty == DIFFICULTY_EASY) ? EASY_DIGITS : (difficulty == DIFFICULTY_MEDIUM) ? MEDIUM_DIGITS : HARD_DIGITS;

        // Validate input
        if (guess == null || guess.isEmpty()) {
            throw new IllegalArgumentException("Please enter your guess!");
        }
        if (!guess.matches("\\d+")) {
            throw new IllegalArgumentException("Only numbers allowed in your guess!");
        }
        if (guess.length() != expectedDigits) {
            throw new IllegalArgumentException("Your guess needs exactly " + expectedDigits + " digits!");
        }
        if (guess.chars().distinct().count() != guess.length()) {
            throw new IllegalArgumentException("Each digit must be different. No repeats!");
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
            GameSaveResult saveResult = saveGameToDatabase(gameSession, true);

            // Include coins earned in response
            if (saveResult.coinsAwarded > 0) {
                response.put("coinsAwarded", saveResult.coinsAwarded);
            }

            // Include newly unlocked achievements in response
            if (!saveResult.newAchievements.isEmpty()) {
                List<Map<String, Object>> achievementData = new ArrayList<>();
                for (Achievement achievement : saveResult.newAchievements) {
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

            // Include updated streak data and total coins in response
            if (gameSession.getUserId() != null) {
                Optional<User> userOptional = userService.findById(gameSession.getUserId());
                if (userOptional.isPresent()) {
                    User user = userOptional.get();
                    response.put("currentWinStreak", user.getCurrentWinStreak() != null ? user.getCurrentWinStreak() : 0);
                    response.put("bestWinStreak", user.getBestWinStreak() != null ? user.getBestWinStreak() : 0);
                    response.put("consecutivePlayDays", user.getConsecutivePlayDays() != null ? user.getConsecutivePlayDays() : 0);
                    response.put("totalCoins", user.getCoins() != null ? user.getCoins() : 0);
                }
            }

            gameSessions.remove(compositeKey);
        }

        return response;
    }

    @PostMapping("/get-hint")
    public ResponseEntity<Map<String, Object>> getHint(
            @RequestParam String tabId,
            @RequestParam(required = false) Long userId,
            HttpSession session) {

        Map<String, Object> response = new HashMap<>();

        // Validate user authentication - hints require login
        if (userId == null) {
            response.put("error", "Please log in to use hints!");
            return ResponseEntity.badRequest().body(response);
        }

        // Retrieve game session
        String sessionId = session.getId();
        String compositeKey = sessionId + ":" + tabId;
        GameSession gameSession = gameSessions.get(compositeKey);

        if (gameSession == null) {
            response.put("error", "Game session not found. Please start a new game!");
            return ResponseEntity.badRequest().body(response);
        }

        // Check if user matches session
        if (!userId.equals(gameSession.getUserId())) {
            response.put("error", "Invalid session!");
            return ResponseEntity.badRequest().body(response);
        }

        // Get target number digits
        int[] targetDigits = getDigits(gameSession.getTargetNumber());

        // Check if all positions already revealed
        if (gameSession.getRevealedHints().size() >= targetDigits.length) {
            response.put("error", "All positions already revealed!");
            return ResponseEntity.badRequest().body(response);
        }

        // Calculate hint cost based on difficulty
        // Easy (0) = 5 coins, Medium (1) = 8 coins, Hard (2) = 10 coins
        int hintCost = switch(gameSession.getDifficulty()) {
            case 0 -> 5;  // Easy
            case 1 -> 8;  // Medium
            case 2 -> 10; // Hard
            default -> 10;
        };

        // Get user and verify coins
        Optional<User> userOptional = userService.findById(userId);
        if (userOptional.isEmpty()) {
            response.put("error", "User not found!");
            return ResponseEntity.badRequest().body(response);
        }

        User user = userOptional.get();

        // Check sufficient coins
        if (user.getCoins() < hintCost) {
            response.put("error", "Not enough coins! Need " + hintCost + " coins.");
            response.put("required", hintCost);
            response.put("current", user.getCoins());
            return ResponseEntity.badRequest().body(response);
        }

        // Deduct coins
        if (!user.deductCoins(hintCost)) {
            response.put("error", "Failed to deduct coins!");
            return ResponseEntity.badRequest().body(response);
        }
        userRepository.save(user);

        // Select random unrevealed position
        List<Integer> unrevealedPositions = new ArrayList<>();
        for (int i = 0; i < targetDigits.length; i++) {
            if (!gameSession.getRevealedHints().containsKey(i)) {
                unrevealedPositions.add(i);
            }
        }

        int randomIndex = new java.util.Random().nextInt(unrevealedPositions.size());
        int position = unrevealedPositions.get(randomIndex);
        int digit = targetDigits[position];

        // Record hint
        gameSession.recordHint(position, digit);

        // Build success response
        response.put("success", true);
        response.put("position", position);
        response.put("digit", digit);
        response.put("costPaid", hintCost);
        response.put("remainingCoins", user.getCoins());
        response.put("hintsUsed", gameSession.getHintsUsed());

        return ResponseEntity.ok(response);
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

    // Inner class to hold game save results
    private static class GameSaveResult {
        List<Achievement> newAchievements;
        int coinsAwarded;

        GameSaveResult(List<Achievement> achievements, int coins) {
            this.newAchievements = achievements;
            this.coinsAwarded = coins;
        }
    }

    private GameSaveResult saveGameToDatabase(GameSession gameSession, boolean won) {
        List<Achievement> newAchievements = new ArrayList<>();
        int coinsAwarded = 0;

        // Only save if user is logged in
        if (gameSession.getUserId() == null) {
            return new GameSaveResult(newAchievements, coinsAwarded);
        }

        Optional<User> userOptional = userService.findById(gameSession.getUserId());
        if (userOptional.isEmpty()) {
            return new GameSaveResult(newAchievements, coinsAwarded);
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
                timeTaken,
                gameSession.getHintsUsed()
        );
        gameRepository.save(game);

        // Update user stats
        userService.updateUserStats(user.getId(), won, gameSession.getAttemptsCount());

        // Award coins if won
        if (won) {
            coinsAwarded = userService.awardCoins(user.getId(), gameSession.getDifficulty());
        }

        // Check and unlock achievements
        try {
            newAchievements = achievementService.checkAndUnlockAchievements(user, game);
        } catch (Exception e) {
            // Don't fail game save if achievement check fails
            // Silent failure - achievements will be checked on next game
        }

        return new GameSaveResult(newAchievements, coinsAwarded);
    }

}