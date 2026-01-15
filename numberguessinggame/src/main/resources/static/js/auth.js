/**
 * Authentication System
 * Handles user login, signup, logout, and authentication UI updates
 */

window.Auth = {
    // ==========================================
    // INITIALIZATION & UI UPDATES
    // ==========================================

    initializeAuth: function() {
        const storedToken = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('currentUser');

        if (storedToken && storedUser) {
            GameState.authToken = storedToken;
            GameState.currentUser = JSON.parse(storedUser);
            GameState.currentStreak = GameState.currentUser.currentWinStreak || 0;
            if (UI) {
                UI.updateStreakStats();
            }
        }

        // Always call updateAuthUI to show correct controls (guest or user)
        this.updateAuthUI();
    },

    updateAuthUI: function() {
        const guestControls = document.getElementById('guest-controls');
        const userControls = document.getElementById('user-controls');
        const winStreakCount = document.getElementById('win-streak-count');
        const coinCount = document.getElementById('coin-count');
        const dropdownUsername = document.getElementById('dropdown-username');
        const dropdownEmail = document.getElementById('dropdown-email');

        if (!guestControls || !userControls) return;

        if (GameState.currentUser) {
            // Show user controls, hide guest controls
            guestControls.style.display = 'none';
            userControls.style.display = 'flex';

            // Update dropdown user info
            if (dropdownUsername) dropdownUsername.textContent = GameState.currentUser.username || 'User';
            if (dropdownEmail) dropdownEmail.textContent = GameState.currentUser.email || '';

            // Update streak display
            if (winStreakCount) {
                winStreakCount.textContent = GameState.currentStreak || 0;
            }

            // Update coin display
            if (coinCount) {
                coinCount.textContent = GameState.currentUser.coins || 0;
            }
        } else {
            // Show guest controls, hide user controls
            guestControls.style.display = 'flex';
            userControls.style.display = 'none';
        }

        // Update hint button state
        if (RegularGame && RegularGame.updateHintButton) {
            RegularGame.updateHintButton();
        }
    },

    // ==========================================
    // COIN DISPLAY & ANIMATIONS
    // ==========================================

    updateCoinDisplay: function() {
        const coinCount = document.getElementById('coin-count');
        if (coinCount && GameState.currentUser) {
            coinCount.textContent = GameState.currentUser.coins || 0;
        }
    },

    showCoinAnimation: function(amount) {
        if (!GameState.currentUser || amount === 0) {
            return;
        }

        const coinDisplay = document.getElementById('coin-display');
        if (!coinDisplay) {
            return;
        }

        const isDeduction = amount < 0;
        const absAmount = Math.abs(amount);

        const rect = coinDisplay.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Create multiple floating coin particles for a shower effect
        const particleCount = Math.min(5, Math.ceil(absAmount / 5)); // 1-5 particles based on amount

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.textContent = '🪙';
            particle.style.position = 'fixed';
            particle.style.left = `${centerX}px`;
            particle.style.top = `${centerY + 30}px`;
            particle.style.transform = 'translate(-50%, -50%)';
            particle.style.fontSize = '20px';
            particle.style.zIndex = '10000';
            particle.style.pointerEvents = 'none';
            particle.style.filter = isDeduction
                ? 'drop-shadow(0 0 8px rgba(231, 76, 60, 0.8))'
                : 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.8))';

            document.body.appendChild(particle);

            // Random angle for particle spread
            const angle = (Math.random() * 60 - 30) * (Math.PI / 180); // -30 to +30 degrees
            const distance = 40 + Math.random() * 30;
            const offsetX = Math.sin(angle) * distance;
            const offsetY = isDeduction
                ? (80 + Math.random() * 40) // Downward for deduction
                : (-80 - Math.random() * 40); // Upward for addition

            setTimeout(() => {
                particle.style.transition = `all ${0.8 + Math.random() * 0.3}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
                particle.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) rotate(${360 * (Math.random() > 0.5 ? 1 : -1)}deg) scale(0.5)`;
                particle.style.opacity = '0';
            }, i * 50);

            setTimeout(() => {
                if (particle.parentNode) particle.parentNode.removeChild(particle);
            }, 1200 + i * 50);
        }

        // Main text display - smaller and sleeker
        const textDisplay = document.createElement('div');
        textDisplay.textContent = isDeduction ? `-${absAmount}` : `+${absAmount}`;
        textDisplay.style.position = 'fixed';
        textDisplay.style.left = `${centerX}px`;
        textDisplay.style.top = `${centerY + 30}px`;
        textDisplay.style.transform = 'translate(-50%, -50%)';
        textDisplay.style.fontSize = '18px';
        textDisplay.style.fontWeight = '800';
        textDisplay.style.color = isDeduction ? '#e74c3c' : '#FFD700';
        textDisplay.style.textShadow = isDeduction
            ? '0 0 10px rgba(231, 76, 60, 0.9), 0 2px 4px rgba(0,0,0,0.3)'
            : '0 0 10px rgba(255, 215, 0, 0.9), 0 2px 4px rgba(0,0,0,0.3)';
        textDisplay.style.zIndex = '10001';
        textDisplay.style.pointerEvents = 'none';
        textDisplay.style.background = isDeduction
            ? 'linear-gradient(135deg, rgba(231, 76, 60, 0.2), rgba(192, 57, 43, 0.2))'
            : 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 165, 0, 0.2))';
        textDisplay.style.padding = '4px 10px';
        textDisplay.style.borderRadius = '20px';
        textDisplay.style.border = isDeduction
            ? '2px solid rgba(231, 76, 60, 0.5)'
            : '2px solid rgba(255, 215, 0, 0.5)';
        textDisplay.style.backdropFilter = 'blur(4px)';

        document.body.appendChild(textDisplay);

        setTimeout(() => {
            textDisplay.style.transition = 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)';
            textDisplay.style.transform = isDeduction
                ? 'translate(-50%, 120px) scale(1.3)' // Downward
                : 'translate(-50%, -120px) scale(1.3)'; // Upward
            textDisplay.style.opacity = '0';
        }, 10);

        setTimeout(() => {
            if (textDisplay.parentNode) textDisplay.parentNode.removeChild(textDisplay);
        }, 1100);

        // Pulse the coin counter in header
        const coinCount = document.getElementById('coin-count');
        if (coinCount && GameState.currentUser && GameState.currentUser.coins !== undefined) {
            coinCount.textContent = GameState.currentUser.coins;
            coinCount.style.animation = 'none';
            setTimeout(() => {
                coinCount.style.animation = 'coinPulse 0.6s ease-out';
            }, 10);
        }
    },

    // ==========================================
    // AUTH FORMS
    // ==========================================

    showLoginForm: function() {
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');

        if (loginForm && signupForm) {
            loginForm.style.display = 'block';
            signupForm.style.display = 'none';
            this.clearAuthForms();
        }
    },

    showSignupForm: function() {
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');

        if (loginForm && signupForm) {
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
            this.clearAuthForms();
        }
    },

    clearAuthForms: function() {
        const loginUsername = document.getElementById('login-username');
        const loginPassword = document.getElementById('login-password');
        const signupUsername = document.getElementById('signup-username');
        const signupEmail = document.getElementById('signup-email');
        const signupPassword = document.getElementById('signup-password');
        const loginError = document.getElementById('login-error');
        const signupError = document.getElementById('signup-error');

        if (loginUsername) loginUsername.value = '';
        if (loginPassword) loginPassword.value = '';
        if (signupUsername) signupUsername.value = '';
        if (signupEmail) signupEmail.value = '';
        if (signupPassword) signupPassword.value = '';
        if (loginError) loginError.textContent = '';
        if (signupError) signupError.textContent = '';
    },

    // ==========================================
    // AUTH ACTIONS (Login, Signup, Logout)
    // ==========================================

    handleLogin: async function(e) {
        e.preventDefault();

        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const errorDiv = document.getElementById('login-error');

        try {
            const response = await Utils.fetchWithTimeout('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            }, 8000);

            // Handle non-OK responses
            if (!response.ok) {
                const errorInfo = Utils.handleFetchError(new Error(`HTTP ${response.status}`), response);
                errorDiv.textContent = errorInfo.userMessage;
                return;
            }

            const data = await response.json();

            if (data.error) {
                errorDiv.textContent = data.error;
                return;
            }

            if (data.success) {
                GameState.authToken = data.token;
                GameState.currentUser = {
                    id: data.userId,
                    username: data.username,
                    email: data.email,
                    bestScore: data.bestScore,
                    totalGames: data.totalGames,
                    totalWins: data.totalWins,
                    currentWinStreak: data.currentWinStreak || 0,
                    bestWinStreak: data.bestWinStreak || 0,
                    consecutivePlayDays: data.consecutivePlayDays || 0,
                    coins: data.coins || 0
                };

                // Update global streak variable
                GameState.currentStreak = data.currentWinStreak || 0;

                localStorage.setItem('authToken', GameState.authToken);
                localStorage.setItem('currentUser', JSON.stringify(GameState.currentUser));

                this.updateAuthUI();
                if (UI) {
                    UI.updateStreakStats();
                }
                if (Utils) {
                    Utils.closeModalWithAnimation(document.getElementById('auth-modal'), () => this.clearAuthForms());
                }

                // Reload daily challenge info for the newly logged-in user
                if (DailyGame && DailyGame.loadDailyChallengeInfo) {
                    DailyGame.loadDailyChallengeInfo();
                }

                if (Achievements) {
                    Achievements.showToast('Welcome back, ' + GameState.currentUser.username + '!', 'success');
                }
            }
        } catch (error) {
            const errorInfo = Utils.handleFetchError(error);
            errorDiv.textContent = errorInfo.userMessage;
        }
    },

    handleSignup: async function(e) {
        e.preventDefault();

        const username = document.getElementById('signup-username').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const errorDiv = document.getElementById('signup-error');

        try {
            const response = await Utils.fetchWithTimeout('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            }, 8000);

            // Handle non-OK responses
            if (!response.ok) {
                const errorInfo = Utils.handleFetchError(new Error(`HTTP ${response.status}`), response);
                errorDiv.textContent = errorInfo.userMessage;
                return;
            }

            const data = await response.json();

            if (data.error) {
                errorDiv.textContent = data.error;
                return;
            }

            if (data.success) {
                GameState.authToken = data.token;
                GameState.currentUser = {
                    id: data.userId,
                    username: data.username,
                    email: data.email,
                    coins: data.coins || 0
                };

                localStorage.setItem('authToken', GameState.authToken);
                localStorage.setItem('currentUser', JSON.stringify(GameState.currentUser));

                this.updateAuthUI();
                if (Utils) {
                    Utils.closeModalWithAnimation(document.getElementById('auth-modal'), () => this.clearAuthForms());
                }
                this.clearAuthForms();

                // Reload daily challenge info for the newly signed-up user
                if (DailyGame && DailyGame.loadDailyChallengeInfo) {
                    DailyGame.loadDailyChallengeInfo();
                }

                if (Achievements) {
                    Achievements.showToast('Welcome to NumVana, ' + GameState.currentUser.username + '!', 'success');
                }
            }
        } catch (error) {
            const errorInfo = Utils.handleFetchError(error);
            errorDiv.textContent = errorInfo.userMessage;
        }
    },

    logout: function() {
        GameState.currentUser = null;
        GameState.authToken = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');

        // Clear daily challenge state to prevent showing previous user's status
        GameState.dailyChallenge = {
            info: null,
            sessionId: null,
            attempts: 0,
            startTime: null,
            timerInterval: null,
            guessHistory: [],
            digitCount: 0
        };

        this.updateAuthUI();

        // Reload daily challenge info for guest view
        if (DailyGame && DailyGame.loadDailyChallengeInfo) {
            DailyGame.loadDailyChallengeInfo();
        }

        if (Achievements) {
            Achievements.showToast('Logged out successfully!', 'success');
        }
    },

    // ==========================================
    // EVENT LISTENERS
    // ==========================================

    attachAuthListeners: function() {
        const loginBtn = document.getElementById('login-btn');
        const authModal = document.getElementById('auth-modal');
        const closeAuthBtn = document.getElementById('close-auth');
        const showSignup = document.getElementById('show-signup');
        const showLogin = document.getElementById('show-login');
        const loginFormElement = document.getElementById('login-form-element');
        const signupFormElement = document.getElementById('signup-form-element');

        if (!loginBtn || !authModal) return;

        loginBtn.addEventListener('click', () => {
            if (Utils) {
                Utils.openModalWithAnimation(authModal);
            }
            this.showLoginForm();
        });

        if (closeAuthBtn) {
            closeAuthBtn.addEventListener('click', () => {
                if (Utils) {
                    Utils.closeModalWithAnimation(authModal, () => this.clearAuthForms());
                }
            });
        }

        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                if (Utils) {
                    Utils.closeModalWithAnimation(authModal, () => this.clearAuthForms());
                }
            }
        });

        if (showSignup) {
            showSignup.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSignupForm();
            });
        }

        if (showLogin) {
            showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginForm();
            });
        }

        if (loginFormElement) {
            loginFormElement.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (signupFormElement) {
            signupFormElement.addEventListener('submit', (e) => this.handleSignup(e));
        }
    },

    // ==========================================
    // INITIALIZATION
    // ==========================================

    init: function() {
        this.initializeAuth();
        this.attachAuthListeners();
    }
};
