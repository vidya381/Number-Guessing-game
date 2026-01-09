# Time Attack Mode - Test Report

## Implementation Status: ✅ COMPLETE

All code has been implemented and structurally verified. This report documents verification results and provides a manual testing checklist.

---

## Code Verification Results

### ✅ Backend Verification

#### 1. Compilation Status
- **Status**: ✅ SUCCESS
- **Maven Compile**: Passed without errors
- **Files Compiled**: 31 source files including all new Time Attack classes

#### 2. Entity Structure (TimeAttackSession.java)
- ✅ All required fields present
- ✅ Proper JPA annotations (@Entity, @Table, @ManyToOne)
- ✅ User relationship with nullable support for guests
- ✅ LocalDateTime for timestamp tracking
- ✅ TEXT column for JSON game details storage

#### 3. Repository (TimeAttackSessionRepository.java)
- ✅ Extends JpaRepository
- ✅ Custom queries for leaderboards (@Query annotations)
- ✅ Aggregate queries for statistics
- ✅ Sorting by score DESC, wins DESC, avgAttempts ASC

#### 4. Service (TimeAttackService.java)
- ✅ Scoring algorithm implemented:
  - Base points: Easy=100, Medium=200, Hard=300
  - Speed bonus: (11 - attempts) × 10
  - Time bonus: <30s=+50, 30-60s=+30, 60-90s=+10
- ✅ Session save logic with guest handling
- ✅ Leaderboard retrieval by difficulty
- ✅ User statistics aggregation
- ✅ Rank calculation functionality

#### 5. Controller (TimeAttackController.java)
- ✅ All 5 endpoints implemented:
  - POST /api/time-attack/start?difficulty={0-2}
  - POST /api/time-attack/start-game?sessionId={id}
  - POST /api/time-attack/guess
  - POST /api/time-attack/end?sessionId={id}
  - GET /api/time-attack/leaderboard/{difficulty}
- ✅ JWT authentication extraction
- ✅ In-memory session management (ConcurrentHashMap)
- ✅ Session expiry checking
- ✅ Bulls and cows calculation
- ✅ Scheduled cleanup (@Scheduled every 10 minutes)
- ✅ Unique digit validation
- ✅ Guest vs authenticated flow handling

---

### ✅ Frontend Verification

#### 1. HTML Structure (index.html)
- ✅ Time Attack banner on home page (lines 130-159)
- ✅ Difficulty selection buttons with base points display
- ✅ Time Attack game page (lines 256-292)
  - Timer display
  - Score/wins counter
  - Input container
  - Feedback area
  - Quick stats section
- ✅ Time Attack result page (lines 295-347)
  - Final score display
  - Breakdown stats
  - Game-by-game list
  - Rank badge (conditional)
  - Action buttons
- ✅ Time Attack leaderboard modal (lines 687-709)

#### 2. JavaScript Implementation (script.js)
- ✅ State variables declared (lines 2318-2332)
- ✅ startTimeAttackSession() - Guest warning & session initialization
- ✅ startTimeAttackTimer() - Countdown timer (5:00 → 0:00)
  - Timer warning at <30s (orange)
  - Timer critical at <10s (red + pulse)
  - Auto-end at 0:00
- ✅ startTimeAttackGame() - New game within session
- ✅ submitTimeAttackGuess() - Guess validation & submission
  - Unique digit check
  - Length validation
  - Win handling with point calculation
  - Auto-start next game after 2s delay
- ✅ endTimeAttackSession() - Session termination & save
- ✅ displayTimeAttackResults() - Results page rendering
- ✅ loadTimeAttackLeaderboard() - Leaderboard fetching
- ✅ Event listeners setup:
  - Difficulty button clicks (line 3436)
  - Submit guess button (line 3444)
  - Quit button (line 3447)
  - Play again button (line 3454)
  - View leaderboard buttons (lines 3458, 3472)
  - Main menu button (line 3462)

#### 3. CSS Styling (styles.css)
- ✅ .time-attack-banner with purple gradient & pulse animation
- ✅ .ta-difficulty-btn with hover effects
- ✅ .timer-warning (orange, 1s pulse)
- ✅ .timer-critical (red, 0.5s fast pulse)
- ✅ .ta-game-card for history items
- ✅ .ta-result-main-score for large score display
- ✅ .ta-result-breakdown with grid layout
- ✅ Dark mode adjustments
- ✅ Responsive design for mobile
- ✅ Animations (@keyframes pulse, pulse-fast)

---

## Database Impact

### New Table Created
When the application starts with `spring.jpa.hibernate.ddl-auto=update`, Hibernate will automatically create:

```sql
CREATE TABLE time_attack_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,  -- Nullable for guests
    difficulty INTEGER NOT NULL,
    total_score INTEGER NOT NULL,
    games_won INTEGER NOT NULL,
    games_played INTEGER NOT NULL,
    average_attempts DOUBLE PRECISION,
    fastest_win_seconds INTEGER,
    session_time_seconds INTEGER,
    game_details TEXT,
    played_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**No migration script required** - Hibernate handles table creation automatically.

---

## Manual Testing Checklist

### Prerequisites
- [ ] Database credentials set in environment: `export DB_PASSWORD="your-password"`
- [ ] Backend running: `mvn spring-boot:run`
- [ ] Browser opened to: `http://localhost:8080`

### Test 1: Guest Flow
- [ ] Logout if logged in
- [ ] Click "EASY" difficulty button on Time Attack banner
- [ ] Confirm guest warning dialog appears
- [ ] Click "OK" to proceed
- [ ] Verify timer starts counting down from 5:00
- [ ] Submit a correct guess
- [ ] Verify win animation shows
- [ ] Verify score increases
- [ ] Verify new game auto-starts after 2 seconds
- [ ] Wait for timer to reach 0:00
- [ ] Verify results page shows (without rank badge)
- [ ] Verify "Sign up to save scores!" message appears

### Test 2: Authenticated Flow
- [ ] Login with a test account
- [ ] Click "MEDIUM" difficulty button
- [ ] Verify no guest warning appears
- [ ] Play and win at least 3 games
- [ ] Click "END SESSION" button
- [ ] Verify session saves successfully
- [ ] Verify results page shows rank badge
- [ ] Verify rank number appears

### Test 3: Timer Warnings
- [ ] Start a Time Attack session
- [ ] Wait until timer reaches 29 seconds
- [ ] Verify timer badge turns orange (warning)
- [ ] Wait until timer reaches 9 seconds
- [ ] Verify timer badge turns red with fast pulse (critical)
- [ ] Let timer reach 0:00
- [ ] Verify session auto-ends

### Test 4: Scoring System
- [ ] Start EASY session
- [ ] Win with 1 attempt in <30s
  - Expected: 100 (base) + 100 (speed) + 50 (time) = **250 points**
- [ ] Win with 5 attempts in 45s
  - Expected: 100 + 60 + 30 = **190 points**
- [ ] Verify points display correctly on result page

### Test 5: Leaderboard
- [ ] Click "LEADERBOARD" button from home page
- [ ] Verify modal opens with 3 tabs (Easy/Medium/Hard)
- [ ] Click each tab and verify different leaderboards load
- [ ] Verify table shows: Rank | Username | Score | Wins | Avg Attempts | Date
- [ ] Verify entries are sorted by score descending
- [ ] Close modal with X button

### Test 6: Quick Consecutive Wins
- [ ] Start HARD session (5 digits)
- [ ] Use a cheat sheet to win quickly (use target number patterns)
- [ ] Win 5+ games in quick succession
- [ ] Verify all wins are recorded in history
- [ ] Verify score accumulates correctly
- [ ] Verify session stats update in real-time

### Test 7: Navigation Cleanup
- [ ] Start a Time Attack session
- [ ] While timer is running, click "HOME" in top navigation
- [ ] Verify timer stops
- [ ] Verify session is cleaned up
- [ ] Verify no UI artifacts remain on home page

### Test 8: API Endpoint Testing (Postman/curl)

#### Start Session
```bash
curl -X POST "http://localhost:8080/api/time-attack/start?difficulty=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
**Expected**: `{"sessionId": "...", "difficulty": 1, "digitCount": 4, "isGuest": false}`

#### Start Game
```bash
curl -X POST "http://localhost:8080/api/time-attack/start-game?sessionId=SESSION_ID"
```
**Expected**: `{"digitCount": 4, "remainingTimeMs": 295000}`

#### Submit Guess (Wrong)
```bash
curl -X POST "http://localhost:8080/api/time-attack/guess" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "SESSION_ID", "guess": "1234"}'
```
**Expected**: `{"bulls": 1, "cows": 2, "won": false, "attempts": 1}`

#### Submit Guess (Correct - use actual target from logs)
```bash
curl -X POST "http://localhost:8080/api/time-attack/guess" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "SESSION_ID", "guess": "TARGET_NUMBER"}'
```
**Expected**: `{"bulls": 4, "cows": 0, "won": true, "attempts": 2, "points": 280, "totalScore": 280, "gamesWon": 1}`

#### End Session
```bash
curl -X POST "http://localhost:8080/api/time-attack/end?sessionId=SESSION_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
**Expected**: `{"totalScore": 280, "gamesWon": 1, "gamesPlayed": 1, "averageAttempts": 2.0, "fastestWinSeconds": 15, "rank": 1}`

#### Get Leaderboard
```bash
curl -X GET "http://localhost:8080/api/time-attack/leaderboard/1?limit=10"
```
**Expected**: Array of top 10 sessions for Medium difficulty

### Test 9: Edge Cases
- [ ] Submit guess with repeated digits - verify error message
- [ ] Submit guess with wrong length - verify error message
- [ ] Submit guess exactly at 0:00 - verify session expires
- [ ] Refresh browser mid-game - verify session is lost (expected)
- [ ] Start multiple sessions concurrently with different users
- [ ] Wait 10+ minutes - verify scheduled cleanup removes expired sessions

### Test 10: Mobile Responsiveness
- [ ] Open browser DevTools, toggle device toolbar
- [ ] Test on iPhone SE (375px width)
- [ ] Test on iPad (768px width)
- [ ] Verify all buttons are tappable
- [ ] Verify timer is visible
- [ ] Verify score display is readable
- [ ] Verify difficulty buttons stack properly

---

## Known Limitations

1. **Session Persistence**: Sessions are stored in-memory (ConcurrentHashMap)
   - Browser refresh loses active session
   - Server restart clears all sessions
   - **Future Enhancement**: Add Redis or database persistence

2. **Network Issues**: No reconnection logic
   - Connection drop during game = session lost
   - **Future Enhancement**: Add heartbeat mechanism

3. **Anti-Cheat**: Basic validation only
   - No prevention of automated guessing
   - **Future Enhancement**: Rate limiting, CAPTCHA

---

## Browser Console Errors to Watch For

### Expected (No Errors)
```
✅ No errors in console
✅ All API calls return 200 OK
✅ WebSocket not used (no WS errors expected)
```

### Common Issues & Fixes

#### "playSound is not defined"
**Status**: ✅ Fixed in previous bug fix
**Location**: script.js:2556, 3136, 3153

#### "Cannot read property 'style' of null"
**Possible Cause**: Missing HTML element ID
**Check**: Ensure all element IDs match between HTML and JavaScript

#### "Failed to fetch"
**Possible Cause**: Backend not running
**Fix**: Ensure Spring Boot application is running on port 8080

#### "401 Unauthorized"
**Possible Cause**: JWT token expired
**Fix**: Logout and login again

---

## Performance Expectations

### Backend
- Session start: <50ms
- Guess submission: <30ms
- Session end & save: <100ms
- Leaderboard fetch (50 entries): <200ms

### Frontend
- Page transitions: <300ms (fade animations)
- Timer update: Every 1000ms (1 second intervals)
- Win animation: 2000ms delay before next game

### Database
- New table creation: Automatic on first startup
- Session insert: <50ms
- Leaderboard query: <100ms (with proper indexes)

---

## Success Criteria

All tests must pass:
- ✅ Backend compiles without errors
- ✅ Frontend code structure validated
- [ ] Guest flow works end-to-end
- [ ] Authenticated flow saves to database
- [ ] Timer countdown works with visual warnings
- [ ] Scoring calculation is accurate
- [ ] Leaderboard displays correctly per difficulty
- [ ] Navigation cleanup prevents UI artifacts
- [ ] Mobile responsive design works
- [ ] No console errors during gameplay

---

## Next Steps for User

1. **Set Database Password**:
   ```bash
   export DB_PASSWORD="your-supabase-password"
   ```

2. **Start Backend**:
   ```bash
   cd numberguessinggame
   mvn spring-boot:run
   ```

3. **Test in Browser**:
   - Open http://localhost:8080
   - Follow Manual Testing Checklist above

4. **Report Issues**:
   - Check browser console for errors
   - Check backend logs for stack traces
   - Note specific steps to reproduce

---

## Verification Summary

✅ **Backend**: Compiles successfully, all endpoints implemented correctly
✅ **Frontend**: HTML structure complete, JavaScript logic implemented, CSS styling added
✅ **Integration**: Event listeners properly connected, API calls structured correctly
⏳ **Manual Testing**: Awaiting user testing with database credentials

**Status**: READY FOR MANUAL TESTING
