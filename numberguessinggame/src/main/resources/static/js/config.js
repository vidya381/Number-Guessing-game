/**
 * Game Configuration & Constants
 * Contains all game configuration objects and sound initialization
 */

window.GameConfig = {
    // Game configuration
    MAX_ATTEMPTS: 10,
    MAX_RECENT_SCORES: 5,
    EASY_DIGITS: 3,
    MEDIUM_DIGITS: 4,
    HARD_DIGITS: 5,
    DIFFICULTY_NAMES: ['Easy', 'Medium', 'Hard'],

    // Timer configuration
    TIMER: {
        UPDATE_INTERVAL_MS: 1000,
        MAX_SECONDS: 600, // 10 minutes
        SVG_CIRCUMFERENCE: 283,
        COLOR_THRESHOLD_HALF: 0.5,
        COLOR_THRESHOLD_THREE_QUARTERS: 0.75
    },

    // Attempts progress configuration
    ATTEMPTS: {
        THRESHOLD_GREEN: 3,
        THRESHOLD_YELLOW: 6
    },

    // Floating numbers animation configuration
    FLOATING_NUMBERS: {
        COUNT: 50,
        MIN_ANIMATION_DURATION: 40,
        MAX_ANIMATION_DURATION: 60,
        MIN_FONT_SIZE: 12,
        MAX_FONT_SIZE: 21,
        CHANGE_PROBABILITY: 0.1,
        UPDATE_INTERVAL_MS: 5000
    },

    // Confetti animation configuration
    CONFETTI: {
        COUNT: 150,
        MIN_DISTANCE: 30,
        MAX_DISTANCE: 70,
        MAX_ROTATION: 720,
        HALF_ROTATION: 360,
        MIN_SIZE: 16,
        MAX_SIZE: 40,
        MIN_DURATION: 3,
        MAX_DURATION: 5,
        MAX_DELAY: 0.5,
        CLEANUP_TIMEOUT_MS: 6000,
        COLORS: ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f7797d', '#6a0dad', '#1e90ff']
    },

    // Animation configuration
    ANIMATION: {
        SHAKE_DURATION_MS: 500
    },

    // Color configuration
    COLOR: {
        RGB_MAX: 256,
        HSL_HUE_MAX: 360,
        HSL_SATURATION: 70,
        HSL_LIGHTNESS: 50
    },

    // Sound objects
    sounds: {
        correct: new Audio('/audio/correct-sound.mp3'),
        incorrect: new Audio('/audio/incorrect-sound.mp3'),
        win: new Audio('/audio/win-sound.mp3'),
        achievement: new Audio('/audio/achievement-sound.mp3')
    },

    // Update sound volumes based on user setting
    updateSoundVolumes: function(volume) {
        this.sounds.correct.volume = volume;
        this.sounds.incorrect.volume = volume;
        this.sounds.win.volume = volume;
        this.sounds.achievement.volume = volume;
    }
};
