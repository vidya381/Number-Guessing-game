# NumVana: The Ultimate Bulls & Cows Game 🎮

NumVana is a modern, full-stack web implementation of the classic **Bulls and Cows** code-breaking game. Challenge yourself to guess a secret code of unique digits within 10 attempts, track your progress with achievements, compete on global leaderboards, and enjoy a beautifully crafted gaming experience with both light and dark themes.

![Number-Guessing-Game](https://github.com/user-attachments/assets/d1dbb0c7-9b11-4a60-9fea-8471eafd2764)

---

## 🌟 Key Features

### 🎯 **Game Mechanics**
- **Three Difficulty Levels**: Easy (3-digit), Medium (4-digit), Hard (5-digit)
- **10 Attempts Per Game**: Strategic guessing with limited tries
- **Bulls & Cows Feedback**:
  - 🐂 **Bulls**: Correct digit in correct position
  - 🐄 **Cows**: Correct digit in wrong position
- **Real-time Timer**: Track how fast you solve the puzzle
- **Visual Progress Indicators**: Animated attempt counter and timer
- **Unique Digit Validation**: No repeating numbers allowed
- **Confetti Celebration**: Epic win animations

### 👤 **User System**
- **Secure Authentication**: JWT-based login/registration
- **Guest Mode**: Play without signing up (local stats only)
- **User Profiles**: Comprehensive dashboard with:
  - Total games & win rate
  - Best score tracking
  - Win streak counter
  - Consecutive play days
  - Difficulty breakdown with stats
  - Recent game history

### 🏆 **Achievement System**
- **19 Unique Achievements** across 5 categories:
  - **First Steps**: First Win, Perfect Game, Speed Demon
  - **Winning Streaks**: Hot Streak, On Fire, Unstoppable
  - **Mastery**: Easy Master, Medium Master, Hard Master
  - **Dedication**: Marathon Runner, Century Club, Legendary
  - **Special**: Lucky Number, Comeback Kid, Early Bird, Night Owl, Weekend Warrior, Perfectionist
- **Achievement Notifications**: Beautiful toast popups on unlock
- **Progress Tracking**: Filter by unlocked/locked achievements

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

### 💬 **Smart Error Handling**
- **User-Friendly Messages**: Clear, conversational error feedback
- **Non-blocking Toasts**: Errors don't interrupt your flow
- **Actionable Guidance**: Always tells you what to do next
- **Consistent Tone**: Friendly throughout the entire app

---

## 🛠️ Technology Stack

### **Backend**
- **Framework**: Spring Boot 3.1.0
- **Language**: Java 22
- **Database**: PostgreSQL
- **ORM**: Hibernate/JPA
- **Security**: JWT Authentication
- **Build Tool**: Maven

### **Frontend**
- **Core**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Icons**: Font Awesome 6
- **Fonts**: Google Fonts (Fredoka One, Quicksand)
- **No Framework**: Pure, lightweight implementation

### **Architecture**
- RESTful API design
- MVC Pattern (Model-View-Controller)
- Repository Pattern for data access
- Service Layer for business logic
- JWT stateless authentication

---

## 🎮 How to Play

### **Getting Started**
1. Visit **[NumVana](https://numvana.onrender.com)** or run locally
2. Optional: Sign up for achievements and leaderboard access
3. Choose your difficulty level
4. Start guessing!

### **Game Rules**
- The secret code contains **unique digits only** (no repeating numbers)
- You have **10 attempts** to crack the code
- After each guess, you'll receive feedback:
  - **Bulls (🐂)**: Correct digit in the correct position
  - **Cows (🐄)**: Correct digit but in the wrong position

### **Example**
```
Secret Code:  1 2 3
Your Guess:   1 3 2
Feedback:     1 Bull (the "1") + 2 Cows (the "2" and "3")
```

### **Scoring**
- **Lower is better**: Fewer attempts = better score
- **Compete globally**: Climb the leaderboard
- **Build streaks**: Win consecutive games for achievements

---

## 🚀 Local Development

### **Prerequisites**
- Java 22 or higher
- Maven 3.6+
- PostgreSQL 12+

### **Setup Instructions**

1. **Clone the repository**
   ```bash
   git clone https://github.com/vidyasagarpogiri/Number-Guessing-game.git
   cd Number-Guessing-game/numberguessinggame
   ```

2. **Configure Database**

   Create `src/main/resources/application-local.properties`:
   ```properties
   spring.datasource.url=jdbc:postgresql://localhost:5432/numvana
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
numberguessinggame/
├── src/
│   ├── main/
│   │   ├── java/com/example/numberguessinggame/
│   │   │   ├── controller/      # REST API endpoints
│   │   │   ├── entity/          # JPA entities
│   │   │   ├── repository/      # Data access layer
│   │   │   ├── service/         # Business logic
│   │   │   ├── config/          # Security & app config
│   │   │   └── GlobalExceptionHandler.java
│   │   └── resources/
│   │       ├── static/
│   │       │   ├── css/         # Stylesheets
│   │       │   ├── js/          # Frontend logic
│   │       │   ├── audio/       # Sound effects
│   │       │   └── favicon/     # Icons
│   │       └── templates/
│   │           └── index.html   # Main SPA page
│   └── test/                    # Unit & integration tests
└── pom.xml                      # Maven dependencies
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

### **Core Tables**
- **users**: Player accounts and statistics
- **games**: Game history and results
- **achievements**: Achievement definitions
- **user_achievements**: Unlocked achievements per user

### **Key Relationships**
- User → Games (One-to-Many)
- User → Achievements (Many-to-Many)
- Achievement categories and tracking

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

**Play Now**: [https://numvana.onrender.com](https://numvana.onrender.com)

> Note: Hosted on Render free tier - initial load may take 30-60 seconds if the instance is sleeping.

---

## 📈 Project Stats

- **Lines of Code**: 3000+ (Java + JavaScript + CSS)
- **Achievements**: 19 unique achievements
- **Error Messages**: 37 user-friendly messages
- **API Endpoints**: 15+ RESTful endpoints
- **Database Tables**: 4 core entities
- **Sound Effects**: 4 audio files
- **Responsive Breakpoints**: 3 (mobile, tablet, desktop)

---

## 🎯 Future Enhancements

- [ ] Multiplayer mode (real-time competition)
- [ ] Daily challenges with special rewards
- [ ] Social features (friend challenges)
- [ ] Statistics graphs and charts
- [ ] Mobile native app (React Native)
- [ ] Internationalization (i18n support)
- [ ] Custom difficulty settings
- [ ] Hint system with penalties
- [ ] Tournament mode
- [ ] Achievement sharing to social media

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

## 👨‍💻 Author

**Vidya Sagar Pogiri**

- GitHub: [@vidyasagarpogiri](https://github.com/vidyasagarpogiri)
- LinkedIn: [Vidya Sagar Pogiri](https://www.linkedin.com/in/vidyasagarpogiri/)

---

## 🙏 Acknowledgments

- Inspired by the classic Bulls and Cows code-breaking game
- Built with passion for clean code and great UX
- Thanks to the Spring Boot and open-source communities

---

## 📞 Support

If you encounter any issues or have questions:
- Open an [Issue](https://github.com/vidyasagarpogiri/Number-Guessing-game/issues)
- Check the **"How to Play"** guide in Settings
- Review the [Project Description](./PROJECT_DESCRIPTION.md) for technical details

---

**Enjoy NumVana and may your guesses be ever in your favor!** 🎲🔢✨
