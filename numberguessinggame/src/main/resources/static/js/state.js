/**
 * Global State Management
 * Contains all global state variables for the game
 */

window.GameState = {
    // Regular game state
    attempts: 0,
    startTime: null,
    timerInterval: null,
    floatingNumbersInterval: null,
    confettiTimeout: null,
    currentDifficulty: 1,
    isSubmitting: false,
    guessHistory: [],
    tabId: null, // Will be generated server-side for security

    // Best score and recent scores
    bestScore: localStorage.getItem('bestScore') || 'Not set',
    recentScores: (function() {
        try {
            const stored = localStorage.getItem('recentScores');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            // If corrupted, reset to empty array
            localStorage.removeItem('recentScores');
            return [];
        }
    })(),

    // Hint system state
    hintsUsed: 0,
    revealedHints: new Map(), // position -> digit
    nextHintCost: 3,

    // Auth state
    currentUser: null,
    authToken: null,
    currentStreak: 0,

    // Sound volume
    soundVolume: parseFloat(localStorage.getItem('soundVolume')) || 0.7, // 0.0 to 1.0

    // Achievement state
    achievementCount: 0,
    achievementSummary: null,
    achievementQueue: [],
    isShowingAchievement: false,
    currentAchievements: [],
    currentFilter: 'all',

    // Profile state
    profileCurrentFilter: 'all',
    profileAchievements: [],

    // Daily Challenge state
    dailyChallenge: {
        info: null,
        sessionId: null,
        attempts: 0,
        startTime: null,
        timerInterval: null,
        guessHistory: [],
        digitCount: 0
    },

    // Time Attack state
    timeAttack: {
        sessionId: null,
        difficulty: null,
        timeRemaining: 300, // 5 minutes in seconds
        timerInterval: null,
        score: 0,
        wins: 0,
        gamesPlayed: 0,
        currentGame: {
            target: null,
            attempts: 0,
            startTime: null
        },
        gameHistory: [],
        digitCount: 0
    },

    // Survival Mode state
    survival: {
        sessionId: null,
        difficulty: null,
        digitCount: 0,
        currentRound: 1,
        totalRounds: 5,
        maxAttemptsPerRound: 0,
        coinsPerRound: 0,
        completionBonus: 0,
        currentRoundAttempts: 0,
        totalCoinsEarned: 0,
        guessHistory: []
    },

    // Multiplayer state
    multiplayer: {
        websocket: null,
        stompClient: null,
        connected: false,
        sessionId: null,
        difficulty: null,
        digitCount: 0,
        currentGame: {
            myAttempts: 0,
            opponentAttempts: 0,
            guessHistory: [],
            opponentUsername: null,
            opponentId: null,
            startTime: null
        },
        friends: [],
        pendingRequests: [],
        pendingChallenges: [],
        sentChallenges: [],
        stats: {
            totalGames: 0,
            wins: 0,
            losses: 0,
            winRate: '0.0%'
        }
    },

    // Reset functions
    resetRegularGame: function() {
        this.attempts = 0;
        this.startTime = null;
        this.guessHistory = [];
        this.hintsUsed = 0;
        this.revealedHints.clear();
        this.nextHintCost = 3;
        this.isSubmitting = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    },

    resetDailyChallenge: function() {
        this.dailyChallenge = {
            info: this.dailyChallenge.info, // Keep info
            sessionId: null,
            attempts: 0,
            startTime: null,
            timerInterval: null,
            guessHistory: [],
            digitCount: 0
        };
    },

    resetTimeAttack: function() {
        if (this.timeAttack.timerInterval) {
            clearInterval(this.timeAttack.timerInterval);
        }
        this.timeAttack = {
            sessionId: null,
            difficulty: null,
            timeRemaining: 300,
            timerInterval: null,
            score: 0,
            wins: 0,
            gamesPlayed: 0,
            currentGame: {
                target: null,
                attempts: 0,
                startTime: null
            },
            gameHistory: [],
            digitCount: 0
        };
    },

    resetSurvival: function() {
        this.survival = {
            sessionId: null,
            difficulty: null,
            digitCount: 0,
            currentRound: 1,
            totalRounds: 5,
            maxAttemptsPerRound: 0,
            coinsPerRound: 0,
            completionBonus: 0,
            currentRoundAttempts: 0,
            totalCoinsEarned: 0,
            guessHistory: []
        };
    },

    resetMultiplayer: function() {
        // Don't reset WebSocket connection or friends list
        this.multiplayer.sessionId = null;
        this.multiplayer.difficulty = null;
        this.multiplayer.digitCount = 0;
        this.multiplayer.currentGame = {
            myAttempts: 0,
            opponentAttempts: 0,
            guessHistory: [],
            opponentUsername: null,
            opponentId: null,
            startTime: null
        };
    }
};
