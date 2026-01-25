/**
 * Utility Functions
 * Contains animations, modals, keyboard shortcuts, theme management, and formatting utilities
 */

// Debug Configuration
// Set to false in production to disable all console logs
const DEBUG = false;

// Debug utility - all console logs go through this
window.debug = {
    log: (...args) => DEBUG && console.log(...args),
    error: (...args) => DEBUG && console.error(...args),
    warn: (...args) => DEBUG && console.warn(...args),
    info: (...args) => DEBUG && console.info(...args)
};

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
        const themeCheckbox = document.getElementById('theme-toggle-checkbox');
        const themeIcon = document.getElementById('theme-icon');

        if (themeCheckbox) {
            themeCheckbox.checked = isDarkMode;
        }

        if (themeIcon) {
            if (isDarkMode) {
                themeIcon.classList.remove('fa-moon');
                themeIcon.classList.add('fa-sun');
            } else {
                themeIcon.classList.remove('fa-sun');
                themeIcon.classList.add('fa-moon');
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
        // Check if animations are enabled
        if (!this.getGameplayPreference('animations')) {
            return;
        }

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
        // Check if animations are enabled
        if (!this.getGameplayPreference('animations')) {
            return;
        }

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
        // Check if animations are enabled
        if (!this.getGameplayPreference('animations')) {
            return;
        }

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

        // Setup collapsible game mode items
        const gameModeItems = document.querySelectorAll('.game-mode-item');
        gameModeItems.forEach(item => {
            const header = item.querySelector('.mode-header');
            const content = item.querySelector('.mode-content');
            const arrow = item.querySelector('.mode-arrow');

            if (header && content && arrow) {
                header.addEventListener('click', function() {
                    const isVisible = content.style.display !== 'none';

                    if (isVisible) {
                        content.style.display = 'none';
                        arrow.classList.remove('fa-chevron-up');
                        arrow.classList.add('fa-chevron-down');
                        item.classList.remove('active');
                    } else {
                        content.style.display = 'block';
                        arrow.classList.remove('fa-chevron-down');
                        arrow.classList.add('fa-chevron-up');
                        item.classList.add('active');
                    }
                });
            }
        });
    },

    setupGameplayPreferences: function() {
        // Main gameplay preferences toggle
        const gameplayPreferencesToggle = document.getElementById('gameplay-preferences-toggle');
        const gameplayPreferencesContent = document.getElementById('gameplay-preferences-content');

        if (gameplayPreferencesToggle && gameplayPreferencesContent) {
            gameplayPreferencesToggle.addEventListener('click', function () {
                const isVisible = gameplayPreferencesContent.style.display !== 'none';

                if (isVisible) {
                    gameplayPreferencesContent.style.display = 'none';
                    gameplayPreferencesToggle.classList.remove('active');
                } else {
                    gameplayPreferencesContent.style.display = 'block';
                    gameplayPreferencesToggle.classList.add('active');
                }
            });
        }

        // Load saved preferences
        this.loadGameplayPreferences();

        // Auto-Submit toggle
        const autoSubmitToggle = document.getElementById('auto-submit-toggle');
        if (autoSubmitToggle) {
            autoSubmitToggle.addEventListener('change', () => {
                const enabled = autoSubmitToggle.checked;
                localStorage.setItem('autoSubmitEnabled', enabled);
                debug.log('Auto-submit:', enabled ? 'enabled' : 'disabled');
            });
        }

        // Animations toggle
        const animationsToggle = document.getElementById('animations-toggle');
        if (animationsToggle) {
            animationsToggle.addEventListener('change', () => {
                const enabled = animationsToggle.checked;
                localStorage.setItem('animationsEnabled', enabled);
                debug.log('Animations:', enabled ? 'enabled' : 'disabled');

                // Apply immediately - stop/start floating numbers
                if (enabled) {
                    this.createFloatingNumbers();
                } else {
                    if (GameState.floatingNumbersInterval) {
                        clearInterval(GameState.floatingNumbersInterval);
                        GameState.floatingNumbersInterval = null;
                    }
                    // Clear existing floating numbers
                    const floatingNumbers = document.querySelectorAll('.floating-number');
                    floatingNumbers.forEach(num => num.remove());
                }
            });
        }
    },

    loadGameplayPreferences: function() {
        // Auto-Submit (default: false)
        const autoSubmitEnabled = localStorage.getItem('autoSubmitEnabled') === 'true';
        const autoSubmitToggle = document.getElementById('auto-submit-toggle');
        if (autoSubmitToggle) {
            autoSubmitToggle.checked = autoSubmitEnabled;
        }

        // Animations (default: true)
        const animationsEnabled = localStorage.getItem('animationsEnabled');
        const animationsToggle = document.getElementById('animations-toggle');
        if (animationsToggle) {
            animationsToggle.checked = animationsEnabled === null ? true : animationsEnabled === 'true';
        }

        // If animations disabled, don't create floating numbers
        if (animationsEnabled === 'false') {
            if (GameState.floatingNumbersInterval) {
                clearInterval(GameState.floatingNumbersInterval);
                GameState.floatingNumbersInterval = null;
            }
        }
    },

    getGameplayPreference: function(key) {
        switch (key) {
            case 'autoSubmit':
                return localStorage.getItem('autoSubmitEnabled') === 'true';
            case 'animations':
                const value = localStorage.getItem('animationsEnabled');
                return value === null ? true : value === 'true';
            default:
                return null;
        }
    },

    setupAccountManagement: function() {
        // Main account management toggle
        const accountManagementToggle = document.getElementById('account-management-toggle');
        const accountManagementContent = document.getElementById('account-management-content');

        if (accountManagementToggle && accountManagementContent) {
            accountManagementToggle.addEventListener('click', function () {
                const isVisible = accountManagementContent.style.display !== 'none';

                if (isVisible) {
                    accountManagementContent.style.display = 'none';
                    accountManagementToggle.classList.remove('active');
                } else {
                    accountManagementContent.style.display = 'block';
                    accountManagementToggle.classList.add('active');
                }
            });
        }

        // Change Password Toggle
        const changePasswordToggle = document.getElementById('change-password-toggle');
        const changePasswordForm = document.getElementById('change-password-form');

        if (changePasswordToggle && changePasswordForm) {
            changePasswordToggle.addEventListener('click', function () {
                const isVisible = changePasswordForm.style.display !== 'none';

                if (isVisible) {
                    changePasswordForm.style.display = 'none';
                    changePasswordToggle.classList.remove('active');
                } else {
                    changePasswordForm.style.display = 'block';
                    changePasswordToggle.classList.add('active');
                }
            });
        }

        // Change Email Toggle
        const changeEmailToggle = document.getElementById('change-email-toggle');
        const changeEmailForm = document.getElementById('change-email-form');

        if (changeEmailToggle && changeEmailForm) {
            changeEmailToggle.addEventListener('click', function () {
                const isVisible = changeEmailForm.style.display !== 'none';

                if (isVisible) {
                    changeEmailForm.style.display = 'none';
                    changeEmailToggle.classList.remove('active');
                } else {
                    changeEmailForm.style.display = 'block';
                    changeEmailToggle.classList.add('active');
                }
            });
        }

        // Delete Account Toggle
        const deleteAccountToggle = document.getElementById('delete-account-toggle');
        const deleteAccountForm = document.getElementById('delete-account-form');

        if (deleteAccountToggle && deleteAccountForm) {
            deleteAccountToggle.addEventListener('click', function () {
                const isVisible = deleteAccountForm.style.display !== 'none';

                if (isVisible) {
                    deleteAccountForm.style.display = 'none';
                    deleteAccountToggle.classList.remove('active');
                } else {
                    deleteAccountForm.style.display = 'block';
                    deleteAccountToggle.classList.add('active');
                }
            });
        }

        // Change Password Button
        const changePasswordBtn = document.getElementById('change-password-btn');
        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', () => this.handleChangePassword());
        }

        // Change Email Button
        const changeEmailBtn = document.getElementById('change-email-btn');
        if (changeEmailBtn) {
            changeEmailBtn.addEventListener('click', () => this.handleChangeEmail());
        }

        // Delete Account Button
        const deleteAccountBtn = document.getElementById('delete-account-btn');
        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', () => this.handleDeleteAccount());
        }
    },

    handleChangePassword: async function() {
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-new-password').value;
        const errorDiv = document.getElementById('change-password-error');

        errorDiv.textContent = '';

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            errorDiv.textContent = 'All fields are required';
            return;
        }

        if (newPassword.length < 6) {
            errorDiv.textContent = 'New password must be at least 6 characters';
            return;
        }

        if (newPassword !== confirmPassword) {
            errorDiv.textContent = 'New passwords do not match';
            return;
        }

        if (!GameState.authToken) {
            errorDiv.textContent = 'Please log in first';
            return;
        }

        try {
            const response = await fetch('/api/user/change-password', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + GameState.authToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword: currentPassword,
                    newPassword: newPassword
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                if (Achievements) {
                    Achievements.showToast('Password updated successfully!', 'success');
                }
                // Clear inputs
                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-new-password').value = '';
            } else {
                errorDiv.textContent = data.error || 'Failed to update password';
            }
        } catch (error) {
            debug.error('Error changing password:', error);
            errorDiv.textContent = 'Failed to update password. Try again!';
        }
    },

    handleChangeEmail: async function() {
        const newEmail = document.getElementById('new-email').value;
        const password = document.getElementById('email-confirm-password').value;
        const errorDiv = document.getElementById('change-email-error');

        errorDiv.textContent = '';

        // Validation
        if (!newEmail || !password) {
            errorDiv.textContent = 'All fields are required';
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            errorDiv.textContent = 'Invalid email format';
            return;
        }

        if (!GameState.authToken) {
            errorDiv.textContent = 'Please log in first';
            return;
        }

        try {
            const response = await fetch('/api/user/change-email', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + GameState.authToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    newEmail: newEmail,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                if (Achievements) {
                    Achievements.showToast('Email updated successfully!', 'success');
                }
                // Update current user email
                if (GameState.currentUser) {
                    GameState.currentUser.email = newEmail;
                    localStorage.setItem('currentUser', JSON.stringify(GameState.currentUser));
                }
                // Clear inputs
                document.getElementById('new-email').value = '';
                document.getElementById('email-confirm-password').value = '';
            } else {
                errorDiv.textContent = data.error || 'Failed to update email';
            }
        } catch (error) {
            debug.error('Error changing email:', error);
            errorDiv.textContent = 'Failed to update email. Try again!';
        }
    },

    handleDeleteAccount: async function() {
        const password = document.getElementById('delete-confirm-password').value;
        const errorDiv = document.getElementById('delete-account-error');

        errorDiv.textContent = '';

        if (!password) {
            errorDiv.textContent = 'Password is required';
            return;
        }

        if (!GameState.authToken) {
            errorDiv.textContent = 'Please log in first';
            return;
        }

        // Double confirmation
        const confirmed = confirm(
            '⚠️ FINAL WARNING ⚠️\n\n' +
            'This will permanently delete your account and all your data:\n' +
            '• All game statistics\n' +
            '• All achievements\n' +
            '• All coins\n' +
            '• Friend connections\n\n' +
            'This action CANNOT be undone!\n\n' +
            'Are you absolutely sure?'
        );

        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch('/api/user/delete-account', {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + GameState.authToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                if (Achievements) {
                    Achievements.showToast('Account deleted. Goodbye! 👋', 'info');
                }
                // Log out and clear all data
                setTimeout(() => {
                    if (Auth && Auth.logout) {
                        Auth.logout();
                    }
                }, 1500);
            } else {
                errorDiv.textContent = data.error || 'Failed to delete account';
            }
        } catch (error) {
            debug.error('Error deleting account:', error);
            errorDiv.textContent = 'Failed to delete account. Try again!';
        }
    },

    setupNotificationsModal: function() {
        // Notification bell button
        const notificationsBell = document.getElementById('notifications-bell');
        const notificationsModal = document.getElementById('notifications-modal');

        if (notificationsBell && notificationsModal) {
            notificationsBell.addEventListener('click', () => {
                this.openModalWithAnimation(notificationsModal);

                // Load notifications when opening
                if (typeof Notifications !== 'undefined') {
                    Notifications.loadFriendRequests();
                    Notifications.loadChallengeNotifications();
                }
            });
        }

        // Close notification modal button
        const closeNotificationsModal = document.getElementById('close-notifications-modal');
        if (closeNotificationsModal && notificationsModal) {
            closeNotificationsModal.addEventListener('click', () => {
                this.closeModalWithAnimation(notificationsModal);
            });
        }

        // Close notification modal when clicking outside
        if (notificationsModal) {
            notificationsModal.addEventListener('click', (e) => {
                if (e.target === notificationsModal) {
                    this.closeModalWithAnimation(notificationsModal);
                }
            });
        }

        // Setup collapsible notification items
        const notificationItems = document.querySelectorAll('#notifications-modal .notification-item');
        notificationItems.forEach(item => {
            const header = item.querySelector('.notification-header');
            const container = item.querySelector('.notification-list-container');
            const arrow = item.querySelector('.notification-arrow');

            if (header && container && arrow) {
                header.addEventListener('click', function() {
                    const isVisible = container.style.display !== 'none';

                    if (isVisible) {
                        container.style.display = 'none';
                        arrow.classList.remove('fa-chevron-up');
                        arrow.classList.add('fa-chevron-down');
                        item.classList.remove('active');
                    } else {
                        container.style.display = 'block';
                        arrow.classList.remove('fa-chevron-down');
                        arrow.classList.add('fa-chevron-up');
                        item.classList.add('active');
                    }
                });
            }
        });
    },

    updateGameStatus: function(status) {
        const statusIcon = document.getElementById('game-status-icon');
        const statusText = document.getElementById('game-status-text');

        switch (status) {
            case 'home':
                statusIcon.innerHTML = '<i class="fas fa-dice"></i>';
                statusText.textContent = 'Welcome to Bulls & Cows!';
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
                statusText.textContent = 'Welcome to Bulls & Cows!';
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
            debug.warn('Font Awesome failed to load. Using emoji fallbacks.');
        }

        // Clean up test element
        document.body.removeChild(testEl);
    },

    // ==========================================
    // INITIALIZATION
    // ==========================================

    setupBottomNav: function() {
        const bottomNavHome = document.getElementById('bottom-nav-home');
        const bottomNavProfile = document.getElementById('bottom-nav-profile');
        const bottomNavSettings = document.getElementById('bottom-nav-settings');

        if (!bottomNavHome || !bottomNavProfile || !bottomNavSettings) return;

        // Home button
        bottomNavHome.addEventListener('click', () => {
            this.setActiveBottomNavItem('home');
            if (RegularGame && RegularGame.showHomePage) {
                RegularGame.showHomePage();
            }
        });

        // Profile button
        bottomNavProfile.addEventListener('click', () => {
            this.setActiveBottomNavItem('profile');
            // If logged in, load and show profile; if logged out, show login modal
            if (GameState.authToken && GameState.currentUser) {
                // Load and show profile with data
                if (UI && UI.loadAndShowProfile) {
                    UI.loadAndShowProfile();
                }
            } else {
                // Show login modal for guests
                const authModal = document.getElementById('auth-modal');
                if (authModal) {
                    authModal.style.display = 'flex';
                }
                if (Auth && Auth.showLoginForm) {
                    Auth.showLoginForm();
                }
            }
        });

        // Settings button
        bottomNavSettings.addEventListener('click', () => {
            this.setActiveBottomNavItem('settings');
            const settingsModal = document.getElementById('settings-modal');
            if (settingsModal) {
                settingsModal.style.display = 'flex';
            }
        });
    },

    setActiveBottomNavItem: function(page) {
        const allItems = document.querySelectorAll('.bottom-nav-item');
        allItems.forEach(item => {
            if (item.dataset.page === page) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    },

    setupMobileTiles: function() {
        const tiles = document.querySelectorAll('.mode-tile');

        tiles.forEach(tile => {
            tile.addEventListener('click', () => {
                const mode = tile.dataset.mode;
                let modalId = '';

                switch(mode) {
                    case 'daily':
                        modalId = 'daily-challenge-tile-modal';
                        // Load daily challenge info
                        if (DailyGame && DailyGame.loadDailyChallengeInfo) {
                            DailyGame.loadDailyChallengeInfo();
                        }
                        // Load leaderboard when modal opens
                        if (RegularGame && RegularGame.loadModalLeaderboard) {
                            setTimeout(() => RegularGame.loadModalLeaderboard('daily-challenge'), 100);
                        }
                        break;
                    case 'multiplayer':
                        modalId = 'multiplayer-tile-modal';
                        break;
                    case 'timeattack':
                        modalId = 'time-attack-modal';
                        // Load leaderboard when modal opens
                        if (RegularGame && RegularGame.loadModalLeaderboard) {
                            setTimeout(() => RegularGame.loadModalLeaderboard('time-attack', 0), 100);
                        }
                        break;
                    case 'survival':
                        modalId = 'survival-modal';
                        // Load leaderboard when modal opens
                        if (RegularGame && RegularGame.loadModalLeaderboard) {
                            setTimeout(() => RegularGame.loadModalLeaderboard('survival', 0), 100);
                        }
                        break;
                    case 'practice':
                        modalId = 'practice-tile-modal';
                        break;
                }

                if (modalId) {
                    const modal = document.getElementById(modalId);
                    if (modal) {
                        this.openModalWithAnimation(modal);
                    }
                }
            });
        });

        // Setup tile modal button handlers
        this.setupTileModalHandlers();

        // Setup close buttons for tile modals
        this.setupTileModalCloseButtons();
    },

    setupTileModalCloseButtons: function() {
        const tileModals = [
            'daily-challenge-tile-modal',
            'multiplayer-tile-modal',
            'practice-tile-modal'
        ];

        tileModals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (!modal) return;

            // Close button
            const closeBtn = modal.querySelector('.modal-close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.closeModalWithAnimation(modal);
                });
            }

            // Click outside to close
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModalWithAnimation(modal);
                }
            });
        });
    },

    setupTileModalHandlers: function() {
        // Daily Challenge tile modal
        const playDailyTile = document.getElementById('play-daily-tile');
        const viewDailyLeaderboardTile = document.getElementById('view-daily-leaderboard-tile');
        const dailyTileModal = document.getElementById('daily-challenge-tile-modal');

        if (playDailyTile && DailyGame) {
            playDailyTile.addEventListener('click', () => {
                if (dailyTileModal) dailyTileModal.style.display = 'none';
                DailyGame.playDailyChallenge();
            });
        }

        if (viewDailyLeaderboardTile && DailyGame) {
            viewDailyLeaderboardTile.addEventListener('click', () => {
                if (dailyTileModal) dailyTileModal.style.display = 'none';
                DailyGame.loadDailyLeaderboard();
            });
        }

        // Multiplayer tile modal
        const playMultiplayerTile = document.getElementById('play-multiplayer-tile');
        const multiplayerStatsTile = document.getElementById('multiplayer-stats-tile');
        const multiplayerTileModal = document.getElementById('multiplayer-tile-modal');

        if (playMultiplayerTile) {
            playMultiplayerTile.addEventListener('click', () => {
                if (multiplayerTileModal) multiplayerTileModal.style.display = 'none';

                // Check login
                if (!GameState.currentUser) {
                    if (Achievements) {
                        Achievements.showToast('Please log in to play multiplayer mode! 🔑', 'info');
                    }
                    const authModal = document.getElementById('auth-modal');
                    if (authModal) {
                        this.openModalWithAnimation(authModal);
                    }
                    if (Auth && Auth.showLoginForm) {
                        Auth.showLoginForm();
                    }
                    return;
                }

                // Navigate to multiplayer
                const homePage = document.getElementById('home-page');
                const multiplayerTab = document.getElementById('multiplayer-tab');

                if (homePage && multiplayerTab) {
                    this.fadeOutElement(homePage, () => {
                        multiplayerTab.style.display = 'flex';
                        this.fadeInElement(multiplayerTab);
                    });
                }

                if (typeof MultiplayerGame !== 'undefined') {
                    MultiplayerGame.init();
                }

                this.updateGameStatus('multiplayer');
            });
        }

        if (multiplayerStatsTile) {
            multiplayerStatsTile.addEventListener('click', () => {
                // Check login
                if (!GameState.currentUser) {
                    if (Achievements) {
                        Achievements.showToast('Please log in to view multiplayer stats! 🔑', 'info');
                    }
                    const authModal = document.getElementById('auth-modal');
                    if (authModal) {
                        this.openModalWithAnimation(authModal);
                    }
                    if (Auth && Auth.showLoginForm) {
                        Auth.showLoginForm();
                    }
                    return;
                }

                // Close tile modal and open stats modal
                if (multiplayerTileModal) multiplayerTileModal.style.display = 'none';

                const multiplayerStatsModal = document.getElementById('multiplayer-stats-modal');
                if (multiplayerStatsModal) {
                    multiplayerStatsModal.style.display = 'flex';
                    // Load stats if MultiplayerGame is available
                    if (typeof MultiplayerGame !== 'undefined' && MultiplayerGame.loadStats) {
                        MultiplayerGame.loadStats();
                    }
                }
            });
        }

        // Practice tile modal
        const playEasyTile = document.getElementById('play-easy-tile');
        const playMediumTile = document.getElementById('play-medium-tile');
        const playHardTile = document.getElementById('play-hard-tile');
        const practiceTileModal = document.getElementById('practice-tile-modal');

        if (playEasyTile && RegularGame) {
            playEasyTile.addEventListener('click', () => {
                if (practiceTileModal) practiceTileModal.style.display = 'none';
                RegularGame.startGame(0);
            });
        }

        if (playMediumTile && RegularGame) {
            playMediumTile.addEventListener('click', () => {
                if (practiceTileModal) practiceTileModal.style.display = 'none';
                RegularGame.startGame(1);
            });
        }

        if (playHardTile && RegularGame) {
            playHardTile.addEventListener('click', () => {
                if (practiceTileModal) practiceTileModal.style.display = 'none';
                RegularGame.startGame(2);
            });
        }
    },

    init: function() {
        this.detectFontAwesome();
        this.initializeDarkMode();
        this.setupKeyboardShortcuts();
        this.createFloatingNumbers();
        this.setupHowToPlay();
        this.setupGameplayPreferences();
        this.setupAccountManagement();
        this.setupNotificationsModal();
        this.setupBottomNav();
        this.setupMobileTiles();
        this.setupModalClickOutside();

        // Attach theme toggle checkbox event listener (in Settings)
        const themeToggleCheckbox = document.getElementById('theme-toggle-checkbox');
        if (themeToggleCheckbox) {
            themeToggleCheckbox.addEventListener('change', () => {
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
