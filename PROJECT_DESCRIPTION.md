# NumVana - Bulls and Cows Game

## 📋 Project Overview

NumVana is a modern, full-stack web-based implementation of the classic **Bulls and Cows** code-breaking game. Players attempt to guess a secret code of unique digits within 10 attempts, receiving feedback in the form of "bulls" (correct digits in correct positions) and "cows" (correct digits in wrong positions).

The project features a complete authentication system, user profiles, achievement tracking, leaderboards, and a polished, responsive UI with both light and dark themes.

---

## 🛠️ Technology Stack

### **Backend**
- **Framework:** Spring Boot 3.1.0
- **Language:** Java 22
- **Database:** PostgreSQL
- **ORM:** Hibernate/JPA
- **Security:** JWT (JSON Web Tokens) for stateless authentication
- **Build Tool:** Maven
- **Dev Tools:** Spring DevTools (hot reload support)

### **Frontend**
- **HTML5** - Semantic markup
- **CSS3** - Custom styling with CSS variables for theming
- **Vanilla JavaScript** - No frameworks, pure ES6+
- **Font Awesome** - Icon library
- **Google Fonts** - Fredoka One & Quicksand

### **Architecture**
- **RESTful API** design
- **MVC Pattern** (Model-View-Controller)
- **Repository Pattern** for data access
- **Service Layer** for business logic
- **DTO Pattern** for data transfer

---

## ✨ Core Features Implemented

### **1. Game Mechanics**
- ✅ Three difficulty levels:
  - **Easy:** 3-digit code
  - **Medium:** 4-digit code
  - **Hard:** 5-digit code
- ✅ 10 attempts per game
- ✅ Real-time timer tracking
- ✅ Live attempts counter with visual progress
- ✅ Guess history with bulls/cows feedback
- ✅ Unique digit validation (no repeating numbers)
- ✅ Input validation (client-side and server-side)
- ✅ Confetti animation on game win
- ✅ Score calculation based on attempts and time

### **2. User Authentication & Authorization**
- ✅ User registration with email validation
- ✅ Secure login system
- ✅ JWT token-based authentication
- ✅ Password encryption (BCrypt)
- ✅ Session management
- ✅ Token expiration handling
- ✅ Protected API endpoints
- ✅ Guest mode support (local storage only)

### **3. User Profile System**
- ✅ Personal dashboard with statistics:
  - Total games played
  - Total wins/losses
  - Win rate percentage
  - Best score (fewest attempts)
  - Current win streak
  - Best win streak
  - Consecutive play days
  - Best play day streak
- ✅ Recent games history (last 10)
- ✅ Difficulty breakdown with win rates
- ✅ Achievement summary
- ✅ Profile modal with all stats

### **4. Achievement System**
- ✅ **19 unique achievements** across categories:
  - **First Steps:** First Win, Perfect Game, Speed Demon
  - **Winning Streaks:** Hot Streak, On Fire, Unstoppable
  - **Mastery:** Easy Master, Medium Master, Hard Master
  - **Dedication:** Marathon Runner, Century Club, Legendary
  - **Special:** Lucky Number, Comeback Kid, Early Bird, Night Owl, Weekend Warrior, Perfectionist
- ✅ Achievement notifications with toast popups
- ✅ Achievement modal with filters (All/Unlocked/Locked)
- ✅ Progress tracking
- ✅ Retroactive achievement awards
- ✅ Badge counter in header

### **5. Streak Tracking System**
- ✅ Win streak counter (consecutive wins)
- ✅ Best win streak tracking
- ✅ Daily play streak (consecutive days)
- ✅ Best daily streak tracking
- ✅ Streak reset on loss
- ✅ Visual streak display in header

### **6. Leaderboard**
- ✅ Global leaderboard (top 10 players)
- ✅ Ranking by best score and win rate
- ✅ Visual distinction for top 3 players (gold/silver/bronze)
- ✅ Real-time updates
- ✅ Player statistics display

### **7. User Interface & Experience**

#### **Visual Design**
- ✅ Modern, playful bubble design
- ✅ Gradient color schemes
- ✅ Smooth animations and transitions
- ✅ Hover effects and visual feedback
- ✅ Animated floating numbers background
- ✅ Confetti burst on win

#### **Theme System**
- ✅ Light mode (default)
- ✅ Dark mode toggle
- ✅ Theme persistence (localStorage)
- ✅ Smooth theme transitions
- ✅ Consistent color variables

#### **Responsive Design**
- ✅ Mobile-first approach
- ✅ Tablet optimization
- ✅ Desktop full-screen support
- ✅ Touch-friendly controls
- ✅ Adaptive layouts
- ✅ Responsive font sizes

#### **Modal System**
- ✅ Authentication modal (Login/Signup)
- ✅ User profile modal
- ✅ Settings modal
- ✅ Achievement modal
- ✅ Smooth open/close animations
- ✅ Click-outside-to-close functionality

#### **Notification System**
- ✅ Toast notifications for errors/success
- ✅ Achievement unlock notifications
- ✅ Auto-dismiss with timeout
- ✅ Stacking support
- ✅ Different styles (info/success/error/warning)

#### **Navigation**
- ✅ Fixed header with controls
- ✅ Profile dropdown menu
- ✅ Quick access to settings
- ✅ Logout functionality
- ✅ Home button (click logo)

### **8. Settings & Configuration**
- ✅ Sound volume control with slider
- ✅ Volume persistence (localStorage)
- ✅ Visual volume indicator
- ✅ **"How to Play" guide** with:
  - Game objective
  - Difficulty explanations
  - Bulls & Cows mechanics with examples
  - Scoring system
  - Pro tips for players

### **9. Sound Effects**
- ✅ Correct guess sound
- ✅ Incorrect guess sound
- ✅ Win sound with celebration
- ✅ Achievement unlock sound
- ✅ Volume control
- ✅ Mute functionality

### **10. Keyboard Shortcuts**
- ✅ `Enter` - Submit guess
- ✅ `Escape` - Close modals
- ✅ `Ctrl/Cmd + K` - Open settings
- ✅ Arrow keys - Navigate between input boxes
- ✅ Number keys - Auto-focus next input

### **11. Error Handling & Validation**

#### **User-Friendly Error Messages**
- ✅ Conversational, friendly tone
- ✅ Clear, actionable guidance
- ✅ No technical jargon
- ✅ Consistent across client/server
- ✅ Context-specific help

#### **Client-Side Validation**
- ✅ Real-time input validation
- ✅ Duplicate digit detection
- ✅ Empty input checking
- ✅ Format validation
- ✅ Visual error feedback

#### **Server-Side Validation**
- ✅ Game state validation
- ✅ Authentication checks
- ✅ Input sanitization
- ✅ Business rule enforcement
- ✅ Global exception handler

### **12. Game State Management**
- ✅ Session tracking with UUID
- ✅ Server-side game state
- ✅ Concurrent game support
- ✅ State persistence in database
- ✅ Game history tracking

### **13. Data Persistence**
- ✅ User accounts
- ✅ Game history
- ✅ Achievement unlocks
- ✅ Statistics tracking
- ✅ Streak data
- ✅ Leaderboard rankings

---

## 🗄️ Database Schema

### **Entities**

#### **User**
- `id` (Primary Key)
- `username` (Unique)
- `email` (Unique)
- `password` (Encrypted)
- `totalGames`
- `totalWins`
- `bestScore`
- `currentWinStreak`
- `bestWinStreak`
- `consecutivePlayDays`
- `bestPlayDayStreak`
- `lastPlayedDate`
- `createdAt`

#### **Game**
- `id` (Primary Key)
- `user_id` (Foreign Key)
- `difficulty` (0=Easy, 1=Medium, 2=Hard)
- `secretCode`
- `attempts`
- `won` (Boolean)
- `timeTaken`
- `playedAt`

#### **Achievement**
- `id` (Primary Key)
- `name`
- `description`
- `icon`
- `category`
- `points`

#### **UserAchievement**
- `id` (Primary Key)
- `user_id` (Foreign Key)
- `achievement_id` (Foreign Key)
- `unlockedAt`

#### **GameRepository**
- Stores active game sessions (UUID-based)
- In-memory or Redis cache

---

## 📁 Project Structure

```
numberguessinggame/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/example/numberguessinggame/
│   │   │       ├── controller/
│   │   │       │   ├── GameController.java
│   │   │       │   ├── AuthController.java
│   │   │       │   ├── UserController.java
│   │   │       │   └── AchievementController.java
│   │   │       ├── entity/
│   │   │       │   ├── User.java
│   │   │       │   ├── Game.java
│   │   │       │   ├── Achievement.java
│   │   │       │   └── UserAchievement.java
│   │   │       ├── repository/
│   │   │       │   ├── UserRepository.java
│   │   │       │   ├── GameRepository.java
│   │   │       │   ├── AchievementRepository.java
│   │   │       │   └── UserAchievementRepository.java
│   │   │       ├── service/
│   │   │       │   ├── GameService.java
│   │   │       │   ├── UserService.java
│   │   │       │   ├── AchievementService.java
│   │   │       │   └── JwtUtil.java
│   │   │       ├── config/
│   │   │       │   └── SecurityConfig.java
│   │   │       ├── GlobalExceptionHandler.java
│   │   │       └── NumberGuessingGameApplication.java
│   │   └── resources/
│   │       ├── static/
│   │       │   ├── css/
│   │       │   │   └── styles.css
│   │       │   ├── js/
│   │       │   │   └── script.js
│   │       │   ├── audio/
│   │       │   │   ├── correct-sound.mp3
│   │       │   │   ├── incorrect-sound.mp3
│   │       │   │   ├── win-sound.mp3
│   │       │   │   └── achievement-sound.mp3
│   │       │   └── favicon/
│   │       ├── templates/
│   │       │   └── index.html
│   │       ├── application.properties
│   │       └── application-local.properties
│   └── test/
└── pom.xml
```

---

## 🔒 Security Features

1. **Authentication**
   - JWT token-based authentication
   - Secure password hashing (BCrypt)
   - Token expiration (configurable)
   - Protected API endpoints

2. **Authorization**
   - User-specific data access
   - Game session validation
   - Token verification on each request

3. **Input Validation**
   - SQL injection prevention
   - XSS protection
   - Input sanitization
   - Length restrictions

4. **CORS Configuration**
   - Allowed origins control
   - Method restrictions

---

## 🎨 UI/UX Highlights

### **Design Principles**
- **Clean & Modern:** Minimalist bubble design
- **Intuitive:** Clear navigation and controls
- **Responsive:** Works on all devices
- **Accessible:** Keyboard shortcuts, ARIA labels
- **Performant:** Optimized animations, lazy loading

### **Color Scheme**
- **Primary:** Purple (#8b7abf)
- **Secondary:** Blue (#4ea8de)
- **Accent:** Teal (#5dd3b3)
- **Success:** Green (#52c98c)
- **Danger:** Red (#ef6f6f)
- **Warning:** Orange (#f0b347)

### **Typography**
- **Headers:** Fredoka One (playful, bold)
- **Body:** Quicksand (clean, rounded)

---

## 🚀 Key Improvements in Latest Session

### **Error Message Overhaul**
- ✅ Replaced blocking `alert()` with non-blocking toast notifications
- ✅ Made all error messages friendly and conversational
- ✅ Removed technical jargon
- ✅ Added actionable guidance
- ✅ Consistent tone across 37 error messages

### **Game Rules & Help System**
- ✅ Removed scattered info icons (cluttered UI)
- ✅ Centralized all game rules in **"How to Play"** section
- ✅ Added comprehensive guide in Settings:
  - Game objective
  - Difficulty levels explained
  - Bulls & Cows mechanics with examples
  - Scoring system
  - Pro tips
- ✅ Collapsible section with smooth animations
- ✅ Clean, organized presentation

### **UI Refinements**
- ✅ Simplified difficulty buttons (removed badges)
- ✅ Cleaner section headers
- ✅ Improved visual hierarchy
- ✅ Better mobile experience

---

## 📊 Performance Optimizations

1. **Frontend**
   - CSS animations with `will-change` hints
   - Debounced input handlers
   - Lazy loading for modals
   - Efficient event delegation
   - LocalStorage caching

2. **Backend**
   - Connection pooling (HikariCP)
   - Query optimization
   - Indexed database columns
   - Stateless JWT (no session storage)
   - Efficient data fetching

3. **DevTools**
   - Hot reload for rapid development
   - LiveReload server
   - Auto-restart on code changes

---

## 🧪 Testing Capabilities

- ✅ Unit testing support (JUnit)
- ✅ Integration testing ready
- ✅ API endpoint testing
- ✅ Service layer tests
- ✅ Repository tests

---

## 📦 Deployment

### **Build**
```bash
mvn clean package
```

### **Run (Local)**
```bash
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

### **Run (Production)**
```bash
java -jar target/number-guessing-game-0.0.1-SNAPSHOT.jar
```

### **Database Setup**
1. Create PostgreSQL database
2. Configure credentials in `application-local.properties`
3. Hibernate auto-creates schema on first run

---

## 🎯 Future Enhancement Ideas

- [ ] Multiplayer mode (compete in real-time)
- [ ] Daily challenges
- [ ] Social features (friend challenges)
- [ ] Statistics graphs and charts
- [ ] Mobile app (React Native)
- [ ] Internationalization (i18n)
- [ ] Custom difficulty (user-defined code length)
- [ ] Hint system (with penalty)
- [ ] Tournament mode
- [ ] Achievement sharing

---

## 📝 Credits

**Game Concept:** Based on the classic Bulls and Cows code-breaking game

**Development:** Full-stack implementation with modern technologies

**Design:** Custom UI/UX with playful, accessible design

---

## 📄 License

This project is for educational and portfolio purposes.

---

**Version:** 1.0
**Last Updated:** January 2026
**Status:** ✅ Production Ready
