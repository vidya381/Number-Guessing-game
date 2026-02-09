# Bulls & Cows Game

Code-breaking game with 5 modes, real-time multiplayer, achievements, and daily challenges. Guess the secret number using bulls (correct position) and cows (wrong position) feedback.

![Java](https://img.shields.io/badge/Java-17-ED8B00?style=flat&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.1.0-6DB33F?style=flat&logo=spring-boot&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14-336791?style=flat&logo=postgresql&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-STOMP-010101?style=flat&logo=socket.io&logoColor=white)

**Live Demo:** https://bulls-cows-game.onrender.com

> Hosted on Render free tier - first load takes 30-60 seconds if instance is sleeping.

## What it does

Code-breaking game. Guess a secret number with unique digits, get feedback after each guess: bulls (correct digit in correct spot) and cows (correct digit in wrong spot). Five game modes, real-time multiplayer battles, 34 achievements, and global leaderboards.

## Game Modes

**Practice Mode**
- 3 difficulty levels
- Easy: 3 digits, 7 attempts, 3 coins
- Medium: 4 digits, 10 attempts, 6 coins
- Hard: 5 digits, 13 attempts, 9 coins

**Daily Challenge**
- Same puzzle for everyone, resets every 24 hours
- One puzzle per day, multiple guesses allowed
- Leaderboard ranks by attempts and time
- Bonus coins and exclusive achievements

**Time Attack**
- 5-minute session, complete as many games as possible
- Pick difficulty at start
- 10-second penalty per hint
- Coins per win: 3/6/9 by difficulty

**Survival Mode**
- 5 rounds at chosen difficulty
- Attempts per round: 7/10/13 by difficulty
- Can retry wrong guesses until attempts run out
- Game ends if you exhaust attempts without solving
- Coins per round cleared, bonus for completing all 5

**Multiplayer 1v1**
- Challenge friends to real-time battles
- Same secret number for both players
- Attempt limits: 7/10/13 per difficulty
- First to solve wins (or fewest attempts if both solve)
- Forfeit and draw handling

## Features

**Hint System**
- Reveals one random unrevealed digit position
- Costs: Easy=5 coins, Medium=8 coins, Hard=10 coins
- Available in Practice, Time Attack, Survival
- Can reveal all positions if you have enough coins

**Authentication**
- JWT auth with BCrypt password hashing
- Guest mode (can't access multiplayer or friends)
- Secure password change and account deletion

**Friends System**
- Search users by username
- Send/accept/decline friend requests
- Online/offline presence indicators
- Challenge friends to multiplayer

**Achievements**
- 34 achievements across multiple categories
- First Steps: First Win, Perfect Game, Speed Demon
- Winning Streaks: Hot Streak (3), On Fire (5), Unstoppable (10)
- Mastery: Win 10/25/50 games per difficulty
- Dedication: Marathon Runner, Century Club, Legendary
- Special: Lucky Number, Comeback Kid, Early Bird, Night Owl, Weekend Warrior
- Mode-specific for Daily, Time Attack, Survival, Multiplayer
- Coin rewards on unlock

**User Profile**
- Total games, wins, win rate
- Best score and win streaks
- Consecutive play days tracker
- Stats by difficulty and mode
- Recent game history
- Coin balance

**Leaderboards**
- Global rankings by score and win rate
- Mode-specific leaderboards
- Difficulty filters
- Top 10 displayed

**UI/UX**
- Light and dark theme toggle
- Fully responsive (mobile, tablet, desktop)
- Keyboard shortcuts (Enter, Escape, Ctrl+K)
- Sound effects with volume control
- Auto-submit when all digits filled
- Guess history with bulls/cows feedback
- Confetti on wins

## Technology Stack

### Frontend
- Vanilla JavaScript (ES6+), HTML5, CSS3
- STOMP.js for WebSocket client
- Font Awesome 6 icons
- Google Fonts (Fredoka One, Quicksand)
- No frameworks - lightweight pure JS

### Backend
- Spring Boot 3.1.0 (Java 17)
- PostgreSQL (Neon hosted)
- Hibernate/JPA with HikariCP connection pooling
- JWT auth with BCrypt
- WebSocket (STOMP over SockJS)
- Maven build

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Frontend (Vanilla JS SPA)                   │
│  Game Modes │ Auth │ Friends │ Achievements │ Leaderboards  │
└─────────────────┬───────────────┬───────────────────────────┘
                  │               │
            REST API          WebSocket
                  │               │
┌─────────────────▼───────────────▼───────────────────────────┐
│                   Spring Boot Backend                       │
│  Controllers → Services → Repositories                      │
│  JWT Auth │ Session Management (ConcurrentHashMap)          │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│              PostgreSQL Database (Neon)                     │
│  13 entities: users, games, achievements, multiplayer, etc  │
└─────────────────────────────────────────────────────────────┘

REST API: Game actions, stats, CRUD operations (40+ endpoints)
WebSocket: Real-time multiplayer, friend presence, notifications
```

**Design patterns:**
- MVC with service and repository layers
- JWT stateless authentication
- WebSocket event-driven architecture
- ConcurrentHashMap for thread-safe session management
- Repository pattern with custom JPQL queries
- Scheduled tasks for daily challenges and cleanup

## Database Schema

**13 entities:**
- `users` - Accounts, stats, coins, preferences
- `games` - Game history across all modes
- `achievements` / `user_achievements` - Definitions and unlocks
- `daily_challenges` / `daily_challenge_attempts` - Daily puzzle system
- `time_attack_sessions` - Active time attack games
- `survival_sessions` - Active survival games
- `friendships` / `friend_requests` - Friends system
- `multiplayer_challenges` / `multiplayer_game_sessions` / `multiplayer_player_progress` - Multiplayer system

**Relationships:**
- One-to-Many: User → Games, User → Achievements
- Many-to-Many: User ↔ Friends, User ↔ Multiplayer Sessions
- Cascade deletes for data integrity

## Local Setup

### Prerequisites
- Java 17+
- Maven 3.6+
- PostgreSQL 12+

### Installation

1. **Clone**
```bash
git clone https://github.com/vidya381/bulls-cows-game.git
cd bulls-cows-game
```

2. **Configure database**

Create `src/main/resources/application-local.properties`:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/bulls_cows_db
spring.datasource.username=your_username
spring.datasource.password=your_password

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true

jwt.secret=your-secret-key-here
jwt.expiration=86400000
```

3. **Build and run**
```bash
mvn spring-boot:run -Dspring-boot.run.profiles=local

# Or build JAR
mvn clean package
java -jar target/number-guessing-game-0.0.1-SNAPSHOT.jar
```

4. **Access**
```
http://localhost:8080
```

## Project Structure

```
bulls-cows-game/
├── src/main/java/com/example/numberguessinggame/
│   ├── controller/          # REST + WebSocket endpoints (9 controllers)
│   ├── entity/              # JPA entities (13 models)
│   ├── repository/          # Data access with JPQL
│   ├── service/             # Business logic (9 services)
│   ├── config/              # Security & WebSocket config
│   └── util/                # Helper utilities
├── src/main/resources/
│   ├── static/
│   │   ├── css/             # 15 modular stylesheets
│   │   ├── js/              # Modular JS (game modes, auth, UI)
│   │   └── audio/           # Sound effects
│   └── templates/
│       └── index.html       # Main SPA page
└── pom.xml
```

## How it Works

**Game Rules**
- Secret code has unique digits (no repeats)
- Bulls = correct digit in correct position
- Cows = correct digit in wrong position
- Win by guessing exact code within attempt limit

**Example:**
```
Secret:  1 2 3
Guess:   1 3 2
Result:  1 Bull (the "1") + 2 Cows (the "2" and "3")
```

**Coin Economy**
- Earn: 3/6/9 coins per win (Easy/Medium/Hard)
- Spend: 5/8/10 coins per hint (by difficulty)
- Some achievements award bonus coins

**Multiplayer**
- Both players get same secret number
- First to solve wins
- Tiebreaker: fewest attempts wins
- No solution within attempts: draw
- Real-time updates via WebSocket

**Real-time Features**
- Live multiplayer game updates
- Friend online/offline presence
- Challenge notifications
- Auto-reconnection with SockJS fallback

## Security

- JWT stateless authentication
- BCrypt password hashing
- Parameterized queries (SQL injection protection)
- Input sanitization (XSS prevention)
- CORS configuration
- Client and server-side validation

## Performance

- Thread-safe concurrent session management
- HikariCP connection pooling
- Scheduled cleanup (expired sessions, old games)
- Modular frontend (separate files per game mode)
- CSS custom properties for theming

---

Built with Spring Boot, PostgreSQL, and Vanilla JavaScript. Uses WebSocket for real-time multiplayer and JWT for authentication.
