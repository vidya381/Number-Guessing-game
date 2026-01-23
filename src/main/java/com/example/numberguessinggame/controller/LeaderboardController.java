package com.example.numberguessinggame.controller;

import com.example.numberguessinggame.entity.User;
import com.example.numberguessinggame.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/leaderboard")
public class LeaderboardController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getLeaderboard(
            @RequestParam(defaultValue = "10") int limit) {

        if (limit < 1 || limit > 100) {
            limit = 10;
        }

        Pageable pageable = PageRequest.of(0, limit);
        List<User> topPlayers = userRepository.findTopPlayersByBestScore(pageable);

        List<Map<String, Object>> leaderboard = new ArrayList<>();
        int rank = 1;

        for (User user : topPlayers) {
            Map<String, Object> playerData = new HashMap<>();
            playerData.put("rank", rank++);
            playerData.put("username", user.getUsername());
            playerData.put("bestScore", user.getBestScore());
            playerData.put("totalGames", user.getTotalGames());
            playerData.put("totalWins", user.getTotalWins());

            // Calculate win rate percentage
            double winRate = user.getTotalGames() > 0
                ? (double) user.getTotalWins() / user.getTotalGames() * 100
                : 0.0;
            playerData.put("winRate", Math.round(winRate * 10.0) / 10.0);

            leaderboard.add(playerData);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("leaderboard", leaderboard);
        response.put("total", leaderboard.size());

        return ResponseEntity.ok(response);
    }
}
