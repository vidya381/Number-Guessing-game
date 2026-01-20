# Multiplayer Integration - Final Steps

## What's Complete
✅ All backend code (Phases 1-4)
✅ Frontend JavaScript and CSS (Phase 5)

## Final Integration Required in index.html

### 1. Add CSS in `<head>` section (after line 15):
```html
<link rel="stylesheet" href="/css/game-multiplayer.css">
```

### 2. Add Multiplayer Banner (after Survival Mode section, around line 194):
```html
<!-- Multiplayer Mode Banner -->
<section class="section multiplayer-banner">
    <div class="multiplayer-header">
        <h2>🎮 MULTIPLAYER MODE</h2>
        <div class="multiplayer-badge">1v1</div>
    </div>
    <p class="multiplayer-description">
        Challenge your friends to a head-to-head race! First to solve wins!
    </p>
    <button id="play-multiplayer" class="multiplayer-btn">
        <i class="fas fa-users"></i> PLAY MULTIPLAYER
    </button>
</section>
```

### 3. Add Multiplayer Tab Content (after other game pages, around line 360):
```html
<!-- Multiplayer Game Page -->
<div id="multiplayer-tab" class="tab-content">
    <div id="ws-connection-status" class="disconnected">Connecting...</div>

    <!-- Friends View -->
    <div id="mp-friends-view">
        <!-- Friend Search -->
        <div class="mp-section friend-search">
            <div class="section-header">Find Friends</div>
            <input type="text" id="friend-search-input" placeholder="Search users by username...">
            <div id="user-search-results"></div>
        </div>

        <!-- Pending Friend Requests -->
        <div class="mp-section">
            <div id="pending-requests"></div>
        </div>

        <!-- Pending Challenges -->
        <div class="mp-section">
            <div id="pending-challenges"></div>
        </div>

        <!-- Sent Challenges -->
        <div class="mp-section">
            <div id="sent-challenges"></div>
        </div>

        <!-- Friends List -->
        <div class="mp-section">
            <div class="section-header">Your Friends</div>
            <div id="friends-list"></div>
        </div>

        <!-- Stats -->
        <div class="mp-section">
            <div class="section-header">Your Multiplayer Stats</div>
            <div id="mp-stats"></div>
        </div>
    </div>

    <!-- Game View -->
    <div id="mp-game-view" style="display: none;">
        <div class="game-header">
            <div class="opponent-info">
                <i class="fas fa-user"></i>
                <span class="opponent-name" id="mp-opponent-name">Opponent</span>
            </div>

            <div class="attempts-display">
                <div class="attempt-counter">
                    <div class="attempt-label">Your Attempts</div>
                    <div class="attempt-value" id="mp-my-attempts">0</div>
                </div>
                <div class="attempt-counter">
                    <div class="attempt-label">Opponent Attempts</div>
                    <div class="attempt-value" id="mp-opponent-attempts">0</div>
                </div>
            </div>
        </div>

        <div class="guess-input-section">
            <input type="text" id="mp-guess-input" placeholder="Enter your guess" maxlength="5" pattern="[0-9]*" inputmode="numeric">
            <button class="submit-guess-btn" onclick="MultiplayerGame.submitGuess()">
                <i class="fas fa-paper-plane"></i> SUBMIT GUESS
            </button>
        </div>

        <div class="guess-history-container">
            <div class="guess-history-title">Your Guess History</div>
            <div id="mp-guess-history"></div>
        </div>
    </div>
</div>

<!-- Challenge Modal -->
<div id="challenge-modal" class="challenge-modal">
    <div class="challenge-modal-content">
        <h3 class="modal-title">Challenge Friend</h3>
        <div class="difficulty-selection">
            <button class="difficulty-btn easy" data-difficulty="0">
                Easy (3 digits)
            </button>
            <button class="difficulty-btn medium" data-difficulty="1">
                Medium (4 digits)
            </button>
            <button class="difficulty-btn hard" data-difficulty="2">
                Hard (5 digits)
            </button>
        </div>
        <button class="cancel-modal-btn" onclick="MultiplayerGame.closeChallengeModal()">Cancel</button>
    </div>
</div>

<!-- Game Result Modal -->
<div id="game-result-modal" class="game-result-modal">
    <div class="game-result-content">
        <h2 class="result-title">Result</h2>
        <p class="result-message">Message</p>
    </div>
</div>
```

### 4. Add JavaScript includes (before closing `</body>` tag, after other game scripts):
```html
<!-- Multiplayer Game -->
<script src="/js/game-multiplayer.js"></script>

<!-- SockJS and STOMP for WebSocket -->
<script src="https://cdn.jsdelivr.net/npm/sockjs-client@1/dist/sockjs.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/stompjs@2.3.3/lib/stomp.min.js"></script>
```

### 5. Add button click handler in main.js initialization:
```javascript
// Multiplayer button
document.getElementById('play-multiplayer')?.addEventListener('click', () => {
    switchTab('multiplayer');
    MultiplayerGame.init();
});
```

## Database Migration

Run the SQL migration file:
```bash
psql -h YOUR_SUPABASE_HOST -U postgres -d postgres -f numberguessinggame/src/main/resources/db_migration_multiplayer_friends.sql
```

Or copy and paste the contents of `db_migration_multiplayer_friends.sql` into Supabase SQL Editor.

## Testing Checklist

1. **Friends System:**
   - Search for users
   - Send friend requests
   - Accept/decline friend requests
   - Remove friends
   - View friends list with online status

2. **Challenge Flow:**
   - Challenge a friend (Easy/Medium/Hard)
   - Receive challenge notification
   - Accept challenge → game starts for both players
   - Decline challenge

3. **Multiplayer Game:**
   - Both players see same digit count
   - Submit guesses
   - Opponent attempt counter updates in real-time
   - First solver wins
   - Winner receives coins
   - Stats update correctly

4. **WebSocket:**
   - Connection status indicator works
   - Real-time notifications appear
   - Presence updates show online/offline friends

## Important Notes

- Multiplayer requires authentication (guests cannot play)
- WebSocket connection is established when entering multiplayer tab
- All game sessions are tracked both in-memory and database
- Expired challenges are cleaned up every 5 minutes
- Abandoned sessions are cleaned up every 10 minutes
- Coins are awarded to winners based on difficulty (3/6/9)
