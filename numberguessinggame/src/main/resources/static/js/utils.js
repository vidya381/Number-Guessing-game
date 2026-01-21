/**
 * Utility Functions
 * Contains animations, modals, keyboard shortcuts, theme management, and formatting utilities
 */

window.Utils = {
    // ==========================================
    // ANIMATION UTILITIES
    // ==========================================

    fadeOutElement: function(element, callback) {
        if (!element) return;
        element.classList.add('page-exit');
        setTimeout(() => {
            element.style.display = 'none';
            element.classList.remove('page-exit');
            if (callback) callback();
        }, GameConfig.UI.MODAL_ANIMATION_DURATION_MS);
    },

    fadeInElement: function(element, displayType = 'block') {
        if (!element) return;
        element.style.display = displayType;
        // Force reflow to ensure animation triggers
        void element.offsetWidth;
        element.classList.add('page-enter');
        setTimeout(() => {
            element.classList.remove('page-enter');
        }, 300);
    },

    openModalWithAnimation: function(modal) {
        if (!modal) return;
        document.body.style.overflow = 'hidden'; // Prevent background scroll
        modal.style.display = 'flex';
        void modal.offsetWidth; // Force reflow
        modal.classList.add('modal-enter');
        setTimeout(() => {
            modal.classList.remove('modal-enter');
        }, 250);
    },

    closeModalWithAnimation: function(modal, callback) {
        if (!modal) return;
        modal.classList.add('modal-exit');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('modal-exit');
            document.body.style.overflow = ''; // Restore background scroll
            if (callback) callback();
        }, 250);
    },

    // ==========================================
    // SESSION HANDLING
    // ==========================================

    handleSessionExpired: function() {
        if (window.Achievements) {
            Achievements.showToast('Your session expired. Please log in again!', 'error');
        }
        setTimeout(() => {
            const authModal = document.getElementById('auth-modal');
            if (authModal) {
                this.openModalWithAnimation(authModal);
            }
        }, 1500);
    },

    // ==========================================
    // KEYBOARD SHORTCUTS
    // ==========================================

    getOpenModal: function() {
        const authModal = document.getElementById('auth-modal');
        if (authModal && authModal.style.display === 'flex') return authModal;

        const profileModal = document.getElementById('profile-modal');
        if (profileModal && profileModal.style.display === 'flex') return profileModal;

        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal && settingsModal.style.display === 'flex') return settingsModal;

        const dropdown = document.getElementById('profile-dropdown');
        if (dropdown && dropdown.style.display === 'block') return dropdown;

        return null;
    },

    isGameActive: function() {
        const gamePage = document.getElementById('game-page');
        return gamePage && gamePage.style.display !== 'none';
    },

    handleEscapeKey: function(event) {
        // Check profile dropdown first (highest visual priority)
        const dropdown = document.getElementById('profile-dropdown');
        if (dropdown && dropdown.style.display === 'block') {
            dropdown.classList.add('dropdown-exit');
            setTimeout(() => {
                dropdown.style.display = 'none';
                dropdown.classList.remove('dropdown-exit');
            }, 200);
            event.preventDefault();
            return;
        }

        // Check modals in order
        const authModal = document.getElementById('auth-modal');
        if (authModal && authModal.style.display === 'flex') {
            this.closeModalWithAnimation(authModal, window.Auth ? Auth.clearAuthForms : null);
            event.preventDefault();
            return;
        }

        const profileModal = document.getElementById('profile-modal');
        if (profileModal && profileModal.style.display === 'flex') {
            this.closeModalWithAnimation(profileModal);
            event.preventDefault();
            return;
        }

        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal && settingsModal.style.display === 'flex') {
            this.closeModalWithAnimation(settingsModal);
            event.preventDefault();
            return;
        }

        const leaderboardModal = document.getElementById('leaderboard-modal');
        if (leaderboardModal && leaderboardModal.style.display === 'flex') {
            this.closeModalWithAnimation(leaderboardModal);
            event.preventDefault();
            return;
        }

        const dailyLeaderboardModal = document.getElementById('daily-leaderboard-modal');
        if (dailyLeaderboardModal && dailyLeaderboardModal.style.display === 'flex') {
            this.closeModalWithAnimation(dailyLeaderboardModal);
            event.preventDefault();
            return;
        }

        const timeAttackLeaderboardModal = document.getElementById('time-attack-leaderboard-modal');
        if (timeAttackLeaderboardModal && timeAttackLeaderboardModal.style.display === 'flex') {
            this.closeModalWithAnimation(timeAttackLeaderboardModal);
            event.preventDefault();
            return;
        }

        const survivalLeaderboardModal = document.getElementById('survival-leaderboard-modal');
        if (survivalLeaderboardModal && survivalLeaderboardModal.style.display === 'flex') {
            this.closeModalWithAnimation(survivalLeaderboardModal);
            event.preventDefault();
            return;
        }
    },

    handleQuitShortcut: function(event) {
        // Only trigger if game is active
        if (!this.isGameActive()) return;

        // Don't quit if currently submitting
        if (GameState.isSubmitting) return;

        // Prevent default browser behavior (critical for Cmd+Q on Mac)
        event.preventDefault();

        // Call existing quit function (shows confirmation dialog)
        if (window.RegularGame) {
            RegularGame.quitGame();
        }
    },

    setupKeyboardShortcuts: function() {
        const self = this;
        document.addEventListener('keydown', function handleGlobalKeydown(event) {
            const key = event.key;
            const isCtrlOrCmd = event.ctrlKey || event.metaKey;

            // Check if user is typing in an input field
            const isTypingInInput = document.activeElement.tagName === 'INPUT' ||
                document.activeElement.tagName === 'TEXTAREA';

            // ESC to close modals (always allowed, even in inputs)
            if (key === 'Escape') {
                self.handleEscapeKey(event);
                return;
            }

            // Don't process other shortcuts if typing in input
            if (isTypingInInput) return;

            // Ctrl+Q (or Cmd+Q) to quit game
            if (isCtrlOrCmd && key === 'q') {
                self.handleQuitShortcut(event);
                return;
            }
        });
    },

    // ==========================================
    // THEME MANAGEMENT
    // ==========================================

    initializeDarkMode: function() {
        const darkModeEnabled = localStorage.getItem('darkMode') === 'true';
        this.setTheme(darkModeEnabled);
        this.updateThemeToggleButton(darkModeEnabled);
    },

    updateThemeToggleButton: function(isDarkMode) {
        const themeToggleButton = document.getElementById('theme-toggle');
        if (themeToggleButton) {
            const icon = themeToggleButton.querySelector('i');
            if (isDarkMode) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        }
    },

    toggleDarkMode: function() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        this.setTheme(!isDarkMode);
        localStorage.setItem('darkMode', !isDarkMode);
        this.updateThemeToggleButton(!isDarkMode);
    },

    setTheme: function(isDarkMode) {
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        this.updateThemeColors(isDarkMode);
    },

    updateThemeColors: function(isDarkMode) {
        const root = document.documentElement;
        if (isDarkMode) {
            // Dark mode: Orange primary, Blue secondary
            root.style.setProperty('--primary-color', '#f39c12');
            root.style.setProperty('--secondary-color', '#4a90e2');
            root.style.setProperty('--background-color', '#2c3e50');
            root.style.setProperty('--card-background', '#34495e');
            root.style.setProperty('--text-color', '#ecf0f1');
        } else {
            // Light mode: Purple primary, Orange secondary
            root.style.setProperty('--primary-color', '#6a4c93');
            root.style.setProperty('--secondary-color', '#f39c12');
            root.style.setProperty('--background-color', '#f0f0f0');
            root.style.setProperty('--card-background', '#ffffff');
            root.style.setProperty('--text-color', '#333333');
        }
    },

    updateVolumeIcon: function(volume) {
        const volumeIcon = document.getElementById('volume-icon');
        if (!volumeIcon) return;

        // Remove all volume icon classes
        volumeIcon.classList.remove('fa-volume-up', 'fa-volume-down', 'fa-volume-off');

        // Add appropriate icon based on volume level
        if (volume === 0) {
            volumeIcon.classList.add('fa-volume-off');
        } else if (volume < 0.5) {
            volumeIcon.classList.add('fa-volume-down');
        } else {
            volumeIcon.classList.add('fa-volume-up');
        }
    },

    // ==========================================
    // CONFETTI ANIMATIONS
    // ==========================================

    createConfetti: function() {
        const confettiContainer = document.getElementById('confetti-container');
        if (!confettiContainer) return;

        // Clear any existing timeout and confetti
        if (GameState.confettiTimeout) {
            clearTimeout(GameState.confettiTimeout);
        }
        confettiContainer.innerHTML = '';

        const numConfetti = GameConfig.CONFETTI.COUNT;

        for (let i = 0; i < numConfetti; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-number';

            confetti.textContent = Math.floor(Math.random() * 10);

            confetti.style.color = GameConfig.CONFETTI.COLORS[Math.floor(Math.random() * GameConfig.CONFETTI.COLORS.length)];
            confetti.style.left = '50%';
            confetti.style.top = '50%';

            const angle = Math.random() * Math.PI * 2;
            const distance = GameConfig.CONFETTI.MIN_DISTANCE + Math.random() * (GameConfig.CONFETTI.MAX_DISTANCE - GameConfig.CONFETTI.MIN_DISTANCE);
            const rotation = Math.random() * GameConfig.CONFETTI.MAX_ROTATION - GameConfig.CONFETTI.HALF_ROTATION;

            confetti.style.setProperty('--end-x', `${Math.cos(angle) * distance}vw`);
            confetti.style.setProperty('--end-y', `${Math.sin(angle) * distance}vh`);
            confetti.style.setProperty('--rotation', `${rotation}deg`);

            const size = GameConfig.CONFETTI.MIN_SIZE + Math.random() * (GameConfig.CONFETTI.MAX_SIZE - GameConfig.CONFETTI.MIN_SIZE);
            confetti.style.fontSize = `${size}px`;

            confetti.style.animationDuration = `${GameConfig.CONFETTI.MIN_DURATION + Math.random() * (GameConfig.CONFETTI.MAX_DURATION - GameConfig.CONFETTI.MIN_DURATION)}s`;
            confetti.style.animationDelay = `${Math.random() * GameConfig.CONFETTI.MAX_DELAY}s`;

            confettiContainer.appendChild(confetti);
        }

        GameState.confettiTimeout = setTimeout(() => {
            confettiContainer.innerHTML = '';
            GameState.confettiTimeout = null;
        }, GameConfig.CONFETTI.CLEANUP_TIMEOUT_MS);
    },

    createAchievementConfetti: function() {
        const container = document.getElementById('confetti-container');
        if (!container) return;

        const colors = GameConfig.CONFETTI.COLORS;
        const confettiCount = 50; // Smaller burst for achievements

        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-number';
            confetti.textContent = ['🎉', '⭐', '🏆', '✨', '🎊'][Math.floor(Math.random() * 5)];
            confetti.style.color = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.fontSize = Math.random() * 24 + 16 + 'px';

            // Position at top right (near notification)
            confetti.style.left = window.innerWidth - 200 + 'px';
            confetti.style.top = '100px';

            // Random burst direction
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 150 + 100;
            const endX = Math.cos(angle) * distance;
            const endY = Math.sin(angle) * distance;
            const rotation = Math.random() * 720 - 360;

            confetti.style.setProperty('--end-x', endX + 'px');
            confetti.style.setProperty('--end-y', endY + 'px');
            confetti.style.setProperty('--rotation', rotation + 'deg');

            container.appendChild(confetti);

            setTimeout(() => {
                if (confetti.parentNode) {
                    confetti.parentNode.removeChild(confetti);
                }
            }, 4000);
        }
    },

    shakeInputs: function() {
        const inputContainer = document.getElementById('input-container');
        inputContainer.classList.add('shake');
        setTimeout(() => inputContainer.classList.remove('shake'), GameConfig.ANIMATION.SHAKE_DURATION_MS);
    },

    // ==========================================
    // FLOATING NUMBERS ANIMATION
    // ==========================================

    createFloatingNumbers: function() {
        const container = document.body;
        const numberCount = GameConfig.FLOATING_NUMBERS.COUNT;
        const numbers = [];

        for (let i = 0; i < numberCount; i++) {
            const number = document.createElement('div');
            number.className = 'floating-number';
            number.style.left = `${Math.random() * 100}vw`;
            number.style.top = `${Math.random() * 200}vh`;
            number.style.animationDuration = `${GameConfig.FLOATING_NUMBERS.MIN_ANIMATION_DURATION + Math.random() * GameConfig.FLOATING_NUMBERS.MAX_ANIMATION_DURATION}s`;
            number.style.animationDelay = `${Math.random() * -GameConfig.FLOATING_NUMBERS.MIN_ANIMATION_DURATION}s`;
            number.textContent = Math.floor(Math.random() * 10);

            const fontSize = GameConfig.FLOATING_NUMBERS.MIN_FONT_SIZE + Math.random() * (GameConfig.FLOATING_NUMBERS.MAX_FONT_SIZE - GameConfig.FLOATING_NUMBERS.MIN_FONT_SIZE);
            number.style.fontSize = `${fontSize}px`;

            number.addEventListener('click', () => {
                number.style.color = this.getRandomColor();
            });
            container.appendChild(number);
            numbers.push(number);
        }

        GameState.floatingNumbersInterval = setInterval(() => {
            numbers.forEach(number => {
                if (Math.random() < GameConfig.FLOATING_NUMBERS.CHANGE_PROBABILITY) {
                    number.textContent = Math.floor(Math.random() * 10);
                }

                if (number.getBoundingClientRect().bottom < 0) {
                    number.style.top = `${100 + Math.random() * 100}vh`;
                    number.style.animationDuration = `${GameConfig.FLOATING_NUMBERS.MIN_ANIMATION_DURATION + Math.random() * GameConfig.FLOATING_NUMBERS.MAX_ANIMATION_DURATION}s`;
                }
            });
        }, GameConfig.FLOATING_NUMBERS.UPDATE_INTERVAL_MS);
    },

    cleanupFloatingNumbers: function() {
        if (GameState.floatingNumbersInterval) {
            clearInterval(GameState.floatingNumbersInterval);
            GameState.floatingNumbersInterval = null;
        }
    },

    getRandomColor: function() {
        const hue = Math.floor(Math.random() * GameConfig.COLOR.HSL_HUE_MAX);
        return `hsl(${hue}, ${GameConfig.COLOR.HSL_SATURATION}%, ${GameConfig.COLOR.HSL_LIGHTNESS}%)`;
    },

    // ==========================================
    // FORMATTING UTILITIES
    // ==========================================

    formatDate: function(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    formatRelativeDate: function(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    },

    formatGameTime: function(seconds) {
        if (!seconds) return 'N/A';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    formatDifficulty: function(difficulty) {
        const difficultyMap = {
            0: 'Easy',
            1: 'Medium',
            2: 'Hard',
            'EASY': 'Easy',
            'MEDIUM': 'Medium',
            'HARD': 'Hard'
        };
        return difficultyMap[difficulty] || difficulty;
    },

    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    getRankDisplay: function(rank) {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return rank;
    },

    // ==========================================
    // UI HELPERS
    // ==========================================

    setupHowToPlay: function() {
        const howToPlayToggle = document.getElementById('how-to-play-toggle');
        const howToPlayContent = document.getElementById('how-to-play-content');

        if (howToPlayToggle && howToPlayContent) {
            howToPlayToggle.addEventListener('click', function () {
                const isVisible = howToPlayContent.style.display !== 'none';

                if (isVisible) {
                    howToPlayContent.style.display = 'none';
                    howToPlayToggle.classList.remove('active');
                } else {
                    howToPlayContent.style.display = 'block';
                    howToPlayToggle.classList.add('active');
                }
            });
        }
    },

    updateGameStatus: function(status) {
        const statusIcon = document.getElementById('game-status-icon');
        const statusText = document.getElementById('game-status-text');

        switch (status) {
            case 'home':
                statusIcon.innerHTML = '<i class="fas fa-dice"></i>';
                statusText.textContent = 'Welcome to NumVana!';
                break;
            case 'regular-game':
                statusIcon.innerHTML = '<i class="fas fa-brain"></i>';
                statusText.textContent = 'Regular Game';
                break;
            case 'daily-challenge':
                statusIcon.innerHTML = '<i class="fas fa-calendar-day"></i>';
                statusText.textContent = 'Daily Challenge';
                break;
            case 'time-attack':
                statusIcon.innerHTML = '<i class="fas fa-bolt"></i>';
                statusText.textContent = 'Time Attack Mode';
                break;
            case 'multiplayer':
                statusIcon.innerHTML = '<i class="fas fa-users"></i>';
                statusText.textContent = 'Multiplayer Mode';
                break;
            case 'result':
                statusIcon.innerHTML = '<i class="fas fa-flag-checkered"></i>';
                statusText.textContent = 'Game Complete';
                break;
            case 'won':
                statusIcon.innerHTML = '<i class="fas fa-trophy"></i>';
                statusText.textContent = 'Congratulations! You Won!';
                break;
            case 'lost':
                statusIcon.innerHTML = '<i class="fas fa-undo"></i>';
                statusText.textContent = 'Game Over - Try Again!';
                break;
            // Legacy support
            case 'welcome':
                statusIcon.innerHTML = '<i class="fas fa-dice"></i>';
                statusText.textContent = 'Welcome to NumVana!';
                break;
            case 'playing':
                statusIcon.innerHTML = '<i class="fas fa-brain"></i>';
                statusText.textContent = 'Game in Progress';
                break;
        }
    },

    updateAttemptsProgress: function() {
        const attemptsText = document.getElementById('attempts');
        if (attemptsText) {
            attemptsText.textContent = GameState.attempts;
        }

        const progressCircle = document.querySelector('.attempts-progress');
        if (!progressCircle) return;

        const radius = progressCircle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        const progress = (GameState.attempts / GameConfig.MAX_ATTEMPTS) * circumference;

        progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
        progressCircle.style.strokeDashoffset = circumference - progress;

        let color;
        if (GameState.attempts <= GameConfig.ATTEMPTS.THRESHOLD_GREEN) {
            color = '#4CAF50'; // Green for first 3 attempts
        } else if (GameState.attempts <= GameConfig.ATTEMPTS.THRESHOLD_YELLOW) {
            color = '#FFC107'; // Yellow for next 3 attempts
        } else {
            color = '#F44336'; // Red for last 4 attempts
        }
        progressCircle.style.stroke = color;
    },

    // ==========================================
    // MODAL CLICK-OUTSIDE-TO-CLOSE
    // ==========================================

    setupModalClickOutside: function() {
        // Get all modal elements
        const modals = [
            document.getElementById('auth-modal'),
            document.getElementById('profile-modal'),
            document.getElementById('settings-modal'),
            document.getElementById('daily-leaderboard-modal'),
            document.getElementById('time-attack-leaderboard-modal'),
            document.getElementById('survival-leaderboard-modal')
        ];

        // Add click-outside-to-close functionality to each modal
        modals.forEach(modal => {
            if (modal) {
                // Remove any existing listeners to avoid duplicates
                const handler = (e) => {
                    // Only close if clicking the modal backdrop (not the content)
                    if (e.target === modal) {
                        // Special handling for auth modal to clear forms
                        if (modal.id === 'auth-modal') {
                            this.closeModalWithAnimation(modal, window.Auth ? Auth.clearAuthForms : null);
                        } else {
                            this.closeModalWithAnimation(modal);
                        }
                    }
                };
                modal.addEventListener('click', handler);
            }
        });
    },

    // ==========================================
    // FETCH ERROR HANDLING
    // ==========================================

    /**
     * Handles fetch errors and provides specific user-facing messages
     * @param {Error} error - The error object from catch block
     * @param {Response} response - The fetch response object (if available)
     * @returns {Object} - { type, message, userMessage }
     */
    handleFetchError: function(error, response = null) {
        // Network error (no internet, DNS failure, CORS)
        if (!response || error.message === 'Failed to fetch' || error.name === 'TypeError') {
            return {
                type: 'network',
                message: 'Network error: No internet connection or server unreachable',
                userMessage: 'No internet connection. Please check your network and try again.'
            };
        }

        // Timeout error
        if (error.name === 'AbortError') {
            return {
                type: 'timeout',
                message: 'Request timed out',
                userMessage: 'Request took too long. Please try again.'
            };
        }

        // Parse error (invalid JSON)
        if (error instanceof SyntaxError) {
            return {
                type: 'parse',
                message: 'Failed to parse server response',
                userMessage: 'Server returned invalid data. Please refresh and try again.'
            };
        }

        // Server errors (5xx)
        if (response && response.status >= 500) {
            const serverMessages = {
                500: 'Server encountered an error. Please try again in a moment.',
                502: 'Gateway error. The server is temporarily unavailable.',
                503: 'Service unavailable. Please try again later.',
                504: 'Gateway timeout. The server took too long to respond.'
            };
            return {
                type: 'server',
                message: `Server error ${response.status}`,
                userMessage: serverMessages[response.status] || 'Server is having issues. Please try again later.'
            };
        }

        // Client errors (4xx)
        if (response && response.status >= 400) {
            const clientMessages = {
                400: 'Invalid request. Please check your input and try again.',
                401: 'Session expired. Please log in again.',
                403: 'You don\'t have permission to perform this action.',
                404: 'Resource not found. Please refresh the page.',
                429: 'Too many requests. Please slow down and try again in a moment.'
            };
            return {
                type: 'client',
                message: `Client error ${response.status}`,
                userMessage: clientMessages[response.status] || 'Request failed. Please try again.'
            };
        }

        // Unknown error
        return {
            type: 'unknown',
            message: error.message || 'Unknown error occurred',
            userMessage: 'Something went wrong. Please try again.'
        };
    },

    /**
     * Wrapper for fetch with comprehensive error handling
     * @param {string} url - The URL to fetch
     * @param {Object} options - Fetch options
     * @param {number} timeout - Timeout in milliseconds (default: 10000)
     * @returns {Promise<Response>} - The fetch response
     */
    fetchWithTimeout: async function(url, options = {}, timeout = 10000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    },

    // ==========================================
    // FONT AWESOME FALLBACK DETECTION
    // ==========================================

    /**
     * Detects if Font Awesome has loaded successfully
     * If not loaded, adds 'fa-fallback' class to body to use emoji fallbacks
     */
    detectFontAwesome: function() {
        // Wait for fonts to load
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => {
                this.checkFontAwesomeLoaded();
            });
        } else {
            // Fallback for browsers without font loading API
            setTimeout(() => this.checkFontAwesomeLoaded(), 1000);
        }
    },

    checkFontAwesomeLoaded: function() {
        // Create a test element with Font Awesome icon
        const testEl = document.createElement('i');
        testEl.className = 'fas fa-test';
        testEl.style.position = 'absolute';
        testEl.style.left = '-9999px';
        testEl.style.fontSize = '100px';
        document.body.appendChild(testEl);

        // Get computed style
        const computedStyle = window.getComputedStyle(testEl, '::before');
        const fontFamily = computedStyle.getPropertyValue('font-family');

        // Check if Font Awesome font is loaded
        const isFontAwesomeLoaded = fontFamily.includes('Font Awesome');

        if (!isFontAwesomeLoaded) {
            // Font Awesome didn't load - add fallback class
            document.body.classList.add('fa-fallback');
            console.warn('Font Awesome failed to load. Using emoji fallbacks.');
        }

        // Clean up test element
        document.body.removeChild(testEl);
    },

    // ==========================================
    // INITIALIZATION
    // ==========================================

    init: function() {
        this.detectFontAwesome();
        this.initializeDarkMode();
        this.setupKeyboardShortcuts();
        this.createFloatingNumbers();
        this.setupHowToPlay();
        this.setupModalClickOutside();

        // Attach theme toggle button event listener
        const themeToggleButton = document.getElementById('theme-toggle');
        if (themeToggleButton) {
            themeToggleButton.addEventListener('click', () => {
                this.toggleDarkMode();
            });
        }

        // Cleanup intervals when page unloads to prevent memory leaks
        window.addEventListener('beforeunload', () => {
            this.cleanupFloatingNumbers();
            if (GameState.timerInterval) {
                clearInterval(GameState.timerInterval);
            }
        });
    }
};
