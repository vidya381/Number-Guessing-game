# Bulls & Cows Game 🎮

A modern, full-stack web implementation of the classic **Bulls and Cows** code-breaking game. Featuring **5 unique game modes**, real-time multiplayer battles, a friends system, daily challenges, and survival mode, this game offers endless ways to test your code-breaking skills. Track your progress with achievements, compete on global leaderboards, earn coins, unlock hints, and enjoy a beautifully crafted gaming experience with both light and dark themes.

![Number-Guessing-Game](https://github.com/user-attachments/assets/d1dbb0c7-9b11-4a60-9fea-8471eafd2764)

---

## 🌟 Key Features

### 🎮 **Five Game Modes**
1. **Practice Mode** - Classic gameplay with three difficulty levels (Easy: 3-digit, Medium: 4-digit, Hard: 5-digit), perfect for honing your skills
2. **Daily Challenge** - New puzzle every 24 hours, compete globally for the best score, earn bonus coins and exclusive achievements
3. **Time Attack** - Race against the clock! 60 seconds on Easy, 90 on Medium, 120 on Hard. Quick thinking required!
4. **Survival Mode** - Endless progression with escalating difficulty. Start with Easy 3-digit codes, advance through Medium and Hard. One life - how far can you go?
5. **Multiplayer 1v1 Race** - Challenge friends to real-time battles! First to solve wins, with attempt limits (7/10/13 per difficulty). Draws and forfeit handling included!

### 🎯 **Game Mechanics**
- **Three Difficulty Levels**: Easy (3-digit, 7 attempts), Medium (4-digit, 10 attempts), Hard (5-digit, 13 attempts)
- **Bulls & Cows Feedback**:
  - 🐂 **Bulls**: Correct digit in correct position
  - 🐄 **Cows**: Correct digit in wrong position
- **Real-time Timer**: Track how fast you solve the puzzle (crucial for Time Attack!)
- **Visual Progress Indicators**: Animated attempt counter and timer
- **Unique Digit Validation**: No repeating numbers allowed
- **Confetti Celebration**: Epic win animations
- **Coin Economy**: Earn coins for wins, spend on hints
- **Hint System**: Reveal digits when stuck (costs coins)

### 👤 **User System**
- **Secure Authentication**: JWT-based login/registration
- **Guest Mode**: Play without signing up (local stats only, no multiplayer/friends)
- **User Profiles**: Comprehensive dashboard with:
  - Total games & win rate
  - Best score tracking
  - Win streak counter
  - Consecutive play days
  - Difficulty breakdown with stats
  - Mode-specific stats (Practice, Daily, Time Attack, Survival, Multiplayer)
  - Recent game history
  - Coin balance and achievements unlocked

### 👥 **Friends & Multiplayer**
- **Friends System**:
  - Search and add friends by username
  - Real-time online/offline presence indicators
  - Friend request management (send, accept, decline)
  - Friends list with activity status
- **1v1 Multiplayer Racing**:
  - Challenge friends to real-time code-breaking battles
  - Same secret number for both players - first to solve wins!
  - Attempt limits per difficulty (7/10/13)
  - Draw scenarios if no one solves or both solve in same attempts
  - Fewest-attempts-wins tiebreaker
  - Forfeit handling with proper notifications
  - Live opponent progress tracking
  - WebSocket-powered real-time updates
  - Winner earns coins, stats update for both players
  - Dedicated result pages for wins, losses, draws, and forfeits

### 🏆 **Achievement System**
- **25+ Unique Achievements** across multiple categories:
  - **First Steps**: First Win, Perfect Game, Speed Demon
  - **Winning Streaks**: Hot Streak, On Fire, Unstoppable
  - **Mastery**: Easy Master, Medium Master, Hard Master
  - **Dedication**: Marathon Runner, Century Club, Legendary
  - **Special**: Lucky Number, Comeback Kid, Early Bird, Night Owl, Weekend Warrior, Perfectionist
  - **Mode-Specific**: Daily Challenge Champion, Time Attack Master, Survival achievements
  - **Multiplayer**: First multiplayer win, winning streaks, rival achievements
- **Achievement Notifications**: Beautiful toast popups on unlock with coin rewards
- **Progress Tracking**: Filter by unlocked/locked achievements, view completion dates

### 📊 **Leaderboard**
- **Global Rankings**: Top 10 players by score and win rate
- **Visual Distinctions**: Gold, silver, bronze for top 3
- **Real-time Updates**: See where you rank among players

### 🎨 **Beautiful UI/UX**
- **Dual Themes**: Toggle between light and dark mode
- **Responsive Design**: Perfect on mobile, tablet, and desktop
- **Smooth Animations**: Polished transitions and effects
- **Floating Numbers Background**: Animated decorative elements
- **Modern Bubble Design**: Playful, colorful interface
- **Intuitive Controls**: Easy to learn, satisfying to use

### ⚙️ **Settings & Customization**
- **Sound Volume Control**: Adjust or mute game sounds
- **Theme Persistence**: Your preferences are saved
- **"How to Play" Guide**: Comprehensive in-app tutorial with:
  - Game objective and rules
  - Difficulty explanations
  - Bulls & Cows mechanics with examples
  - Scoring system details
  - Pro tips for players

### 🎵 **Sound Effects**
- Correct guess feedback
- Incorrect guess feedback
- Victory celebration
- Achievement unlock sounds
- Volume control with visual slider

### ⌨️ **Keyboard Shortcuts**
- `Enter` - Submit your guess
- `Escape` - Close modals
- `Ctrl/Cmd + K` - Quick access to settings
- **Arrow Keys** - Navigate between input boxes
- **Number Keys** - Auto-advance to next input

### 🔄 **Real-time Features (WebSocket)**
- **Live Multiplayer Updates**: See opponent's progress in real-time
- **Friend Presence**: Know when friends are online/offline
- **Instant Notifications**: Challenge invites, game results, friend requests
- **Automatic Reconnection**: SockJS fallback for reliability
- **Event-Driven Architecture**: Efficient push-based updates
- **Session Management**: Thread-safe concurrent game handling

### 💬 **Smart Error Handling**
- **User-Friendly Messages**: Clear, conversational error feedback
- **Non-blocking Toasts**: Errors don't interrupt your flow
- **Actionable Guidance**: Always tells you what to do next
- **Consistent Tone**: Friendly throughout the entire app

---

## 🛠️ Technology Stack

### **Backend**
- **Framework**: Spring Boot 3.1.0
- **Language**: Java 17
- **Database**: PostgreSQL (Supabase hosted)
- **ORM**: Hibernate/JPA with HikariCP connection pooling
- **Security**: JWT Authentication with BCrypt password hashing
- **Real-time**: WebSocket with STOMP protocol over SockJS
- **Build Tool**: Maven
- **Scheduled Tasks**: Spring @Scheduled for cleanups and daily challenges

### **Frontend**
- **Core**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Real-time**: STOMP.js client for WebSocket communication
- **Icons**: Font Awesome 6
- **Fonts**: Google Fonts (Fredoka One, Quicksand)
- **Audio**: HTML5 Audio API for sound effects
- **No Framework**: Pure, lightweight implementation
- **State Management**: Centralized state.js module

### **Architecture**
- RESTful API design (40+ endpoints)
- MVC Pattern (Model-View-Controller)
- Repository Pattern for data access with custom JPQL queries
- Service Layer with @Transactional business logic
- JWT stateless authentication
- WebSocket event-driven architecture for real-time features
- ConcurrentHashMap for thread-safe session management
- Modular frontend with separated game mode files

---

## 🎮 How to Play

### **Getting Started**
1. Visit **[Bulls & Cows Game](https://bulls-cows-game.onrender.com)** or run locally
2. Optional: Sign up for achievements, leaderboard access, and multiplayer features
3. Choose from 5 game modes:
   - **Practice**: Learn the ropes with classic gameplay
   - **Daily Challenge**: Compete globally on the same daily puzzle
   - **Time Attack**: Race against the clock
   - **Survival**: Endless progression with escalating difficulty
   - **Multiplayer**: Challenge friends to 1v1 battles
4. Select your difficulty level and start guessing!

### **Game Rules**
- The secret code contains **unique digits only** (no repeating numbers)
- Attempt limits vary by difficulty: Easy (7), Medium (10), Hard (13)
- After each guess, you'll receive feedback:
  - **Bulls (🐂)**: Correct digit in the correct position
  - **Cows (🐄)**: Correct digit but in the wrong position
- Earn coins for wins, unlock achievements, and climb leaderboards

### **Example**
```
Secret Code:  1 2 3
Your Guess:   1 3 2
Feedback:     1 Bull (the "1") + 2 Cows (the "2" and "3")
```

### **Multiplayer Rules**
- Both players solve the same secret number
- First to solve wins the match
- If no one solves, it's a draw
- If both solve, fewest attempts wins
- Winner earns coins and stats update for both players

### **Coin Economy**
- **Earn Coins**: Win games in any mode
- **Spend Coins**: Purchase hints to reveal digits
- **Achievements**: Some achievements award bonus coins

---

## 🚀 Local Development

### **Prerequisites**
- Java 17 or higher
- Maven 3.6+
- PostgreSQL 12+

### **Setup Instructions**

1. **Clone the repository**
   ```bash
   git clone https://github.com/vidya381/bulls-cows-game.git
   cd bulls-cows-game
   ```

2. **Configure Database**

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

3. **Build and Run**
   ```bash
   # Using Maven
   mvn spring-boot:run -Dspring-boot.run.profiles=local

   # Or build JAR and run
   mvn clean package
   java -jar target/number-guessing-game-0.0.1-SNAPSHOT.jar
   ```

4. **Access the Application**
   ```
   http://localhost:8080
   ```

### **Development Features**
- **Hot Reload**: Spring DevTools enabled
- **LiveReload**: Auto-refresh on file changes
- **H2 Console**: Available at `/h2-console` (if configured)

---

## 📁 Project Structure

```
bulls-cows-game/                 # Git repository root
├── src/
│   ├── main/
│   │   ├── java/com/example/numberguessinggame/
│   │   │   ├── controller/      # REST API endpoints
│   │   │   │   ├── AuthController.java
│   │   │   │   ├── GameController.java
│   │   │   │   ├── DailyChallengeController.java
│   │   │   │   ├── SurvivalController.java
│   │   │   │   ├── FriendsController.java
│   │   │   │   └── MultiplayerController.java
│   │   │   ├── entity/          # JPA entities (13)
│   │   │   │   ├── User.java
│   │   │   │   ├── Game.java
│   │   │   │   ├── Achievement.java
│   │   │   │   ├── DailyChallenge.java
│   │   │   │   ├── SurvivalSession.java
│   │   │   │   ├── Friendship.java
│   │   │   │   ├── FriendRequest.java
│   │   │   │   ├── MultiplayerChallenge.java
│   │   │   │   ├── MultiplayerGameSession.java
│   │   │   │   └── ... (and more)
│   │   │   ├── repository/      # Data access layer with JPQL
│   │   │   ├── service/         # Business logic
│   │   │   │   ├── UserService.java
│   │   │   │   ├── GameService.java
│   │   │   │   ├── DailyChallengeService.java
│   │   │   │   ├── SurvivalService.java
│   │   │   │   ├── FriendsService.java
│   │   │   │   ├── MultiplayerService.java
│   │   │   │   └── PresenceService.java
│   │   │   ├── config/          # Security & WebSocket config
│   │   │   │   ├── SecurityConfig.java
│   │   │   │   ├── WebSocketConfig.java
│   │   │   │   └── WebSocketEventListener.java
│   │   │   ├── util/            # Helper utilities
│   │   │   └── GlobalExceptionHandler.java
│   │   └── resources/
│   │       ├── static/
│   │       │   ├── css/         # Stylesheets
│   │       │   │   ├── styles.css
│   │       │   │   ├── game-daily.css
│   │       │   │   ├── game-timeattack.css
│   │       │   │   ├── game-survival.css
│   │       │   │   ├── game-multiplayer.css
│   │       │   │   └── components.css
│   │       │   ├── js/          # Modular frontend logic
│   │       │   │   ├── state.js
│   │       │   │   ├── auth.js
│   │       │   │   ├── game.js
│   │       │   │   ├── game-daily.js
│   │       │   │   ├── game-timeattack.js
│   │       │   │   ├── game-survival.js
│   │       │   │   ├── game-multiplayer.js
│   │       │   │   └── main.js
│   │       │   ├── audio/       # Sound effects
│   │       │   └── favicon/     # Icons
│   │       └── templates/
│   │           └── index.html   # Main SPA page
│   └── test/                    # Unit & integration tests
├── pom.xml                      # Maven dependencies
├── Dockerfile                   # Container configuration
├── README.md                    # This file
└── .gitignore                   # Git ignore rules
```

---

## 🔒 Security Features

- **JWT Authentication**: Stateless, secure token-based auth
- **Password Encryption**: BCrypt hashing
- **Input Validation**: Client and server-side
- **SQL Injection Protection**: Parameterized queries
- **XSS Prevention**: Input sanitization
- **CORS Configuration**: Controlled access

---

## 📊 Database Schema

### **13 Database Entities**

**Core Tables:**
- **users**: Player accounts, statistics, coin balance, preferences
- **games**: Game history and results across all modes
- **achievements**: Achievement definitions with coin rewards
- **user_achievements**: Unlocked achievements per user with timestamps

**Daily Challenge:**
- **daily_challenges**: Daily puzzle configuration and metadata
- **daily_challenge_attempts**: User attempts on daily challenges

**Time Attack Mode:**
- **time_attack_sessions**: Active time attack game sessions with timer state

**Survival Mode:**
- **survival_sessions**: Active survival game sessions with current level and progression

**Friends System:**
- **friendships**: Bidirectional friend relationships
- **friend_requests**: Pending, accepted, and declined friend requests

**Multiplayer System:**
- **multiplayer_challenges**: Challenge requests with expiration (10 min)
- **multiplayer_game_sessions**: Active/completed 1v1 game sessions
- **multiplayer_player_progress**: Per-player state in multiplayer games

### **Key Relationships**
- User → Games (One-to-Many)
- User → Achievements (Many-to-Many)
- User → Friends (Many-to-Many bidirectional)
- User → Multiplayer Sessions (Many-to-Many)
- User → Daily Challenge Attempts (One-to-Many)
- User → Survival Sessions (One-to-Many)
- Proper foreign keys with CASCADE delete for data integrity

---

## 🎨 UI/UX Highlights

### **Design Philosophy**
- **Clean & Modern**: Minimalist bubble design
- **Intuitive**: Clear navigation and feedback
- **Performant**: Optimized animations
- **Accessible**: Keyboard shortcuts, ARIA labels

### **Color Palette**
- **Primary**: Purple (#8b7abf)
- **Secondary**: Blue (#4ea8de)
- **Accent**: Teal (#5dd3b3)
- **Success**: Green (#52c98c)
- **Danger**: Red (#ef6f6f)

### **Typography**
- **Headings**: Fredoka One (playful, bold)
- **Body**: Quicksand (clean, rounded)

---

## 🌐 Live Demo

**Play Now**: [https://bulls-cows-game.onrender.com](https://bulls-cows-game.onrender.com)

> Note: Hosted on Render free tier - initial load may take 30-60 seconds if the instance is sleeping.

---

## 📈 Project Stats

- **Lines of Code**: 26,000+ (Java + JavaScript + CSS)
- **Game Modes**: 5 unique game modes
- **Achievements**: 25+ unique achievements
- **API Endpoints**: 40+ RESTful endpoints
- **Database Tables**: 13 entities with complex relationships
- **WebSocket Events**: 10+ real-time event types
- **Sound Effects**: 4 audio files
- **JavaScript Modules**: 11+ modular files (game modes, auth, UI, state, utils, achievements)
- **Responsive Breakpoints**: 3 (mobile, tablet, desktop)
- **Concurrent Session Support**: Thread-safe game session management

---

## 🎯 Future Enhancements

- [ ] Tournament mode with brackets and prizes
- [ ] Mobile native app (React Native/Flutter)
- [ ] Player profiles with customizable avatars

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is open source and available for educational and portfolio purposes.

---

## 🙏 Acknowledgments

- Inspired by the classic Bulls and Cows code-breaking game
- Built with passion for clean code and great UX
- Thanks to the Spring Boot and open-source communities

---

## 📞 Support

If you encounter any issues or have questions:
- Open an [Issue](https://github.com/vidya381/bulls-cows-game/issues)
- Check the **"How to Play"** guide in Settings
- Review this README for feature details and technical information

---

**Enjoy the game and may your guesses be ever in your favor!** 🎲🔢✨
