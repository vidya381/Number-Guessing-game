// Game Constants
const GAME_CONFIG = {
    MAX_ATTEMPTS: 10,
    MAX_RECENT_SCORES: 5,
    EASY_DIGITS: 3,
    MEDIUM_DIGITS: 4,
    HARD_DIGITS: 5,
    DIFFICULTY_NAMES: ['Easy', 'Medium', 'Hard']
};

const TIMER_CONFIG = {
    UPDATE_INTERVAL_MS: 1000,
    MAX_SECONDS: 600, // 10 minutes
    SVG_CIRCUMFERENCE: 283,
    COLOR_THRESHOLD_HALF: 0.5,
    COLOR_THRESHOLD_THREE_QUARTERS: 0.75
};

const ATTEMPTS_CONFIG = {
    THRESHOLD_GREEN: 3,
    THRESHOLD_YELLOW: 6
};

const FLOATING_NUMBERS_CONFIG = {
    COUNT: 50,
    MIN_ANIMATION_DURATION: 40,
    MAX_ANIMATION_DURATION: 60,
    MIN_FONT_SIZE: 12,
    MAX_FONT_SIZE: 21,
    CHANGE_PROBABILITY: 0.1,
    UPDATE_INTERVAL_MS: 5000
};

const CONFETTI_CONFIG = {
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
};

const ANIMATION_CONFIG = {
    SHAKE_DURATION_MS: 500
};

const COLOR_CONFIG = {
    RGB_MAX: 256,
    HSL_HUE_MAX: 360,
    HSL_SATURATION: 70,
    HSL_LIGHTNESS: 50
};

// Global variables
let attempts = 0;
let startTime;
let timerInterval;
let floatingNumbersInterval;
let confettiTimeout;
let bestScore = localStorage.getItem('bestScore') || 'Not set';
let currentDifficulty = 1;
let soundVolume = parseFloat(localStorage.getItem('soundVolume')) || 0.7; // 0.0 to 1.0
let isSubmitting = false;
let recentScores = [];

// Auth state
let currentUser = null;
let authToken = null;
let currentStreak = 0;

// Hint system state
let hintsUsed = 0;
let revealedHints = new Map(); // position -> digit
let nextHintCost = 3;
try {
    const stored = localStorage.getItem('recentScores');
    if (stored) {
        recentScores = JSON.parse(stored);
    }
} catch (error) {
    // If corrupted, reset to empty array
    recentScores = [];
    localStorage.removeItem('recentScores');
}
let guessHistory = [];
let tabId = null; // Will be generated server-side for security

// Achievement state
let achievementCount = 0;
let achievementSummary = null;
let achievementQueue = [];
let isShowingAchievement = false;

// Sound effects
const correctSound = new Audio('/audio/correct-sound.mp3');
const incorrectSound = new Audio('/audio/incorrect-sound.mp3');
const winSound = new Audio('/audio/win-sound.mp3');
const achievementSound = new Audio('/audio/achievement-sound.mp3');

// Set initial volume for all sounds
function updateSoundVolumes() {
    correctSound.volume = soundVolume;
    incorrectSound.volume = soundVolume;
    winSound.volume = soundVolume;
    achievementSound.volume = soundVolume;
}

// Animation utility functions
function fadeOutElement(element, callback) {
    if (!element) return;
    element.classList.add('page-exit');
    setTimeout(() => {
        element.style.display = 'none';
        element.classList.remove('page-exit');
        if (callback) callback();
    }, 300); // Match CSS animation duration
}

function fadeInElement(element, displayType = 'block') {
    if (!element) return;
    element.style.display = displayType;
    // Force reflow to ensure animation triggers
    void element.offsetWidth;
    element.classList.add('page-enter');
    setTimeout(() => {
        element.classList.remove('page-enter');
    }, 300);
}

function openModalWithAnimation(modal) {
    if (!modal) return;
    modal.style.display = 'flex';
    void modal.offsetWidth; // Force reflow
    modal.classList.add('modal-enter');
    setTimeout(() => {
        modal.classList.remove('modal-enter');
    }, 250);
}

function closeModalWithAnimation(modal, callback) {
    if (!modal) return;
    modal.classList.add('modal-exit');
    setTimeout(() => {
        modal.style.display = 'none';
        modal.classList.remove('modal-exit');
        if (callback) callback();
    }, 250);
}

// Show login modal when session expires
function handleSessionExpired() {
    showToast('Your session expired. Please log in again!', 'error');
    setTimeout(() => {
        const authModal = document.getElementById('auth-modal');
        if (authModal) {
            openModalWithAnimation(authModal);
        }
    }, 1500);
}

// ==========================================
// KEYBOARD SHORTCUTS
// ==========================================
// Global keyboard shortcut handler for:
// - ESC: Close open modals/dropdowns
// - Ctrl+Q / Cmd+Q: Quit current game
// - Enter: Submit guess (handled in input handlers)
// ==========================================

// Get currently open modal (if any)
function getOpenModal() {
    const authModal = document.getElementById('auth-modal');
    if (authModal && authModal.style.display === 'flex') return authModal;

    const profileModal = document.getElementById('profile-modal');
    if (profileModal && profileModal.style.display === 'flex') return profileModal;

    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal && settingsModal.style.display === 'flex') return settingsModal;

    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown && dropdown.style.display === 'block') return dropdown;

    return null;
}

// Check if game is currently active
function isGameActive() {
    const gamePage = document.getElementById('game-page');
    return gamePage && gamePage.style.display !== 'none';
}

// Handle ESC key to close modals
function handleEscapeKey(event) {
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
        closeModalWithAnimation(authModal, clearAuthForms);
        event.preventDefault();
        return;
    }

    const profileModal = document.getElementById('profile-modal');
    if (profileModal && profileModal.style.display === 'flex') {
        closeModalWithAnimation(profileModal);
        event.preventDefault();
        return;
    }

    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal && settingsModal.style.display === 'flex') {
        closeModalWithAnimation(settingsModal);
        event.preventDefault();
        return;
    }

    const leaderboardModal = document.getElementById('leaderboard-modal');
    if (leaderboardModal && leaderboardModal.style.display === 'flex') {
        closeModalWithAnimation(leaderboardModal);
        event.preventDefault();
        return;
    }

    const dailyLeaderboardModal = document.getElementById('daily-leaderboard-modal');
    if (dailyLeaderboardModal && dailyLeaderboardModal.style.display === 'flex') {
        closeModalWithAnimation(dailyLeaderboardModal);
        event.preventDefault();
        return;
    }

    const timeAttackLeaderboardModal = document.getElementById('time-attack-leaderboard-modal');
    if (timeAttackLeaderboardModal && timeAttackLeaderboardModal.style.display === 'flex') {
        closeModalWithAnimation(timeAttackLeaderboardModal);
        event.preventDefault();
        return;
    }
}

// Handle Ctrl+Q / Cmd+Q to quit game
function handleQuitShortcut(event) {
    // Only trigger if game is active
    if (!isGameActive()) return;

    // Don't quit if currently submitting
    if (isSubmitting) return;

    // Prevent default browser behavior (critical for Cmd+Q on Mac)
    event.preventDefault();

    // Call existing quit function (shows confirmation dialog)
    quitGame();
}

// Setup global keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function handleGlobalKeydown(event) {
        const key = event.key;
        const isCtrlOrCmd = event.ctrlKey || event.metaKey;

        // Check if user is typing in an input field
        const isTypingInInput = document.activeElement.tagName === 'INPUT' ||
            document.activeElement.tagName === 'TEXTAREA';

        // ESC to close modals (always allowed, even in inputs)
        if (key === 'Escape') {
            handleEscapeKey(event);
            return;
        }

        // Don't process other shortcuts if typing in input
        if (isTypingInInput) return;

        // Ctrl+Q (or Cmd+Q) to quit game
        if (isCtrlOrCmd && key === 'q') {
            handleQuitShortcut(event);
            return;
        }
    });
}

document.addEventListener('DOMContentLoaded', function () {
    updateSoundVolumes(); // Set initial sound volumes
    initializeAuth();
    updateBestScore();
    updateRecentScores();
    attachEventListeners();
    attachAuthListeners();
    setupProfileListeners();
    initializeDarkMode();
    createFloatingNumbers();
    updateGameStatus('home');
    showHomePage();
    setupKeyboardShortcuts(); // Initialize keyboard shortcuts
    setupHowToPlay(); // Initialize How to Play toggle
    updateHintButton(); // Initialize hint button state
});

// Cleanup intervals when page unloads to prevent memory leaks
window.addEventListener('beforeunload', function () {
    cleanupFloatingNumbers();
    if (timerInterval) {
        clearInterval(timerInterval);
    }
});


function updateBestScore() {
    document.getElementById('best-score').textContent = bestScore;
}

function updateStreakStats() {
    const streakStatsElement = document.getElementById('streak-stats');
    const currentStreakStat = document.getElementById('current-streak-stat');
    const bestStreakStat = document.getElementById('best-streak-stat');

    if (!streakStatsElement || !currentStreakStat || !bestStreakStat) return;

    if (currentUser && authToken) {
        // Show streak stats for logged-in users
        streakStatsElement.style.display = 'block';
        currentStreakStat.textContent = currentUser.currentWinStreak || 0;
        bestStreakStat.textContent = currentUser.bestWinStreak || 0;
    } else {
        // Hide streak stats for guests
        streakStatsElement.style.display = 'none';
    }
}

function updateRecentScores() {
    const recentScoresList = document.getElementById('recent-scores');
    recentScoresList.innerHTML = '';
    recentScores.slice(0, GAME_CONFIG.MAX_RECENT_SCORES).forEach(score => {
        const li = document.createElement('li');
        li.textContent = `${score.difficulty} - ${score.attempts} attempts, ${score.time}`;
        recentScoresList.appendChild(li);
    });
}

function attachEventListeners() {
    document.getElementById('play-easy').addEventListener('click', () => startGame(0));
    document.getElementById('play-medium').addEventListener('click', () => startGame(1));
    document.getElementById('play-hard').addEventListener('click', () => startGame(2));
    document.getElementById('submit-guess').addEventListener('click', submitGuess);
    document.getElementById('play-again').addEventListener('click', () => startGame(currentDifficulty));
    document.getElementById('game-title-header').addEventListener('click', showHomePage);
    document.getElementById('quit').addEventListener('click', showHomePage);
    document.getElementById('quit-game').addEventListener('click', quitGame);
    document.getElementById('theme-toggle').addEventListener('click', toggleDarkMode);

    // Hint button
    const hintBtn = document.getElementById('hint-btn');
    if (hintBtn) {
        hintBtn.addEventListener('click', requestHint);
        console.log('✅ Hint button event listener attached');
    } else {
        console.error('❌ Hint button not found in DOM');
    }

    // Sound toggle moved to settings modal - handled by setupSettingsModal()
}

/**
 * Setup How to Play collapsible section in Settings
 */
function setupHowToPlay() {
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
}

function createFloatingNumbers() {
    const container = document.body;
    const numberCount = FLOATING_NUMBERS_CONFIG.COUNT;
    const numbers = [];

    for (let i = 0; i < numberCount; i++) {
        const number = document.createElement('div');
        number.className = 'floating-number';
        number.style.left = `${Math.random() * 100}vw`;
        number.style.top = `${Math.random() * 200}vh`;
        number.style.animationDuration = `${FLOATING_NUMBERS_CONFIG.MIN_ANIMATION_DURATION + Math.random() * FLOATING_NUMBERS_CONFIG.MAX_ANIMATION_DURATION}s`;
        number.style.animationDelay = `${Math.random() * -FLOATING_NUMBERS_CONFIG.MIN_ANIMATION_DURATION}s`;
        number.textContent = Math.floor(Math.random() * 10);

        const fontSize = FLOATING_NUMBERS_CONFIG.MIN_FONT_SIZE + Math.random() * (FLOATING_NUMBERS_CONFIG.MAX_FONT_SIZE - FLOATING_NUMBERS_CONFIG.MIN_FONT_SIZE);
        number.style.fontSize = `${fontSize}px`;

        number.addEventListener('click', () => {
            number.style.color = getRandomColor();
        });
        container.appendChild(number);
        numbers.push(number);
    }

    floatingNumbersInterval = setInterval(() => {
        numbers.forEach(number => {
            if (Math.random() < FLOATING_NUMBERS_CONFIG.CHANGE_PROBABILITY) {
                number.textContent = Math.floor(Math.random() * 10);
            }

            if (number.getBoundingClientRect().bottom < 0) {
                number.style.top = `${100 + Math.random() * 100}vh`;
                number.style.animationDuration = `${FLOATING_NUMBERS_CONFIG.MIN_ANIMATION_DURATION + Math.random() * FLOATING_NUMBERS_CONFIG.MAX_ANIMATION_DURATION}s`;
            }
        });
    }, FLOATING_NUMBERS_CONFIG.UPDATE_INTERVAL_MS);
}

function cleanupFloatingNumbers() {
    if (floatingNumbersInterval) {
        clearInterval(floatingNumbersInterval);
        floatingNumbersInterval = null;
    }
}

function getRandomColor() {
    const hue = Math.floor(Math.random() * COLOR_CONFIG.HSL_HUE_MAX);
    return `hsl(${hue}, ${COLOR_CONFIG.HSL_SATURATION}%, ${COLOR_CONFIG.HSL_LIGHTNESS}%)`;
}

function initializeDarkMode() {
    const darkModeEnabled = localStorage.getItem('darkMode') === 'true';
    setTheme(darkModeEnabled);
    updateThemeToggleButton(darkModeEnabled);
}

function updateThemeToggleButton(isDarkMode) {
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
}

function toggleDarkMode() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    setTheme(!isDarkMode);
    localStorage.setItem('darkMode', !isDarkMode);
    updateThemeToggleButton(!isDarkMode);
}

function updateVolumeIcon(volume) {
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
}

function setTheme(isDarkMode) {
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    updateThemeColors(isDarkMode);
}

function updateThemeColors(isDarkMode) {
    const root = document.documentElement;
    if (isDarkMode) {
        root.style.setProperty('--primary-color', '#f39c12');  // Orange for dark mode
        root.style.setProperty('--secondary-color', '#4a90e2'); // Blue for dark mode
        root.style.setProperty('--background-color', '#2c3e50');
        root.style.setProperty('--card-background', '#34495e');
        root.style.setProperty('--text-color', '#ecf0f1');
    } else {
        root.style.setProperty('--primary-color', '#6a4c93');  // purple for light mode
        root.style.setProperty('--secondary-color', '#f39c12'); // Orange for light mode
        root.style.setProperty('--background-color', '#f0f0f0');
        root.style.setProperty('--card-background', '#ffffff');
        root.style.setProperty('--text-color', '#333333');
    }
}

function startGame(difficulty) {
    currentDifficulty = difficulty;
    attempts = 0;
    guessHistory = [];
    resetHintState();

    // Clear any existing timer to prevent race conditions
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    updateGamePage();
    startTimer();
    updateGameStatus('regular-game');

    // Include userId if user is logged in
    const userId = currentUser ? currentUser.id : '';
    const bodyParams = userId ? `difficulty=${difficulty}&userId=${userId}` : `difficulty=${difficulty}`;

    fetch('/start-game', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: bodyParams,
        credentials: 'include' // This ensures cookies (including session ID) are sent with the request
    })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(text || 'Failed to start game');
                });
            }
            return response.json();
        })
        .then(data => {
            // Check for error response from server
            if (data.error) {
                showToast(`Couldn't start the game. Check your connection and try again!`, 'error');
                showHomePage();
                return;
            }

            // Store server-generated tabId for security
            if (data.tabId) {
                tabId = data.tabId;
                updateInputFields(difficulty);
                updateGuessHistory();
            } else {
                showToast('Oops! Couldn\'t start the game. Try again in a moment!', 'error');
                showHomePage();
            }
        })
        .catch(error => {
            showToast('Couldn\'t start the game. Check your connection and try again!', 'error');
            showHomePage();
        });
}

function updateGamePage() {
    const homePage = document.getElementById('home-page');
    const gamePage = document.getElementById('game-page');
    const resultPage = document.getElementById('result-page');

    fadeOutElement(homePage, () => {
        fadeInElement(gamePage, 'flex');
        document.getElementById('attempts').textContent = attempts;
        document.getElementById('feedback').textContent = '';
        updateAttemptsProgress();
    });

    resultPage.style.display = 'none';
}

function updateInputFields(difficulty) {
    const inputContainer = document.getElementById('input-container');
    if (!inputContainer) return;

    inputContainer.innerHTML = '';
    const digitCount = difficulty === 0 ? GAME_CONFIG.EASY_DIGITS : (difficulty === 1 ? GAME_CONFIG.MEDIUM_DIGITS : GAME_CONFIG.HARD_DIGITS);

    // Add class for dynamic sizing
    inputContainer.className = '';
    if (digitCount === 5) {
        inputContainer.classList.add('digits-5');
    } else if (digitCount === 6) {
        inputContainer.classList.add('digits-6');
    }

    for (let i = 0; i < digitCount; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.inputMode = 'numeric';
        input.pattern = '[0-9]*';
        input.maxLength = 1;
        input.className = 'digit-input';

        input.addEventListener('input', function (e) {
            this.value = this.value.replace(/[^0-9]/g, '');
            if (this.value) {
                if (this.nextElementSibling) {
                    this.nextElementSibling.focus();
                } else {
                    document.getElementById('submit-guess').focus();
                }
            }
        });

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Backspace' && !this.value && this.previousElementSibling) {
                this.previousElementSibling.focus();
            }
            // Submit on Enter key
            if (e.key === 'Enter') {
                submitGuess();
            }
        });

        inputContainer.appendChild(input);
    }

    // Focus on the first input
    if (inputContainer.firstElementChild) {
        inputContainer.firstElementChild.focus();
    }
}

function submitGuess() {
    // Prevent double submission
    if (isSubmitting) return;

    // Check if game session exists
    if (!tabId) {
        showToast('Your game session expired. Let\'s start a fresh game!', 'error');
        setTimeout(() => showHomePage(), 2000);
        return;
    }

    const inputContainer = document.getElementById('input-container');
    const inputs = inputContainer ? inputContainer.querySelectorAll('.digit-input') : [];
    let guess = '';
    for (let input of inputs) {
        guess += input.value;
    }

    if (guess.length !== inputs.length) {
        showToast('Please fill in all digit boxes to make your guess!', 'info');
        return;
    }

    if (!/^\d+$/.test(guess) || new Set(guess).size !== guess.length) {
        showToast('Oops! Each digit must be different. Try again!', 'error');
        return;
    }

    // Set loading state
    isSubmitting = true;
    const submitButton = document.getElementById('submit-guess');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.style.opacity = '0.6';
        submitButton.style.cursor = 'not-allowed';
    }

    attempts++;
    updateAttemptsProgress();

    document.getElementById('attempts').textContent = attempts;
    updateAttemptsProgress();

    fetch('/submit-guess', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `guess=${guess}&tabId=${tabId}`,
        credentials: 'include' // This ensures cookies (including session ID) are sent with the request
    })
        .then(response => response.json())
        .then(data => {
            // Check for error response from server
            if (data.error) {
                showToast(`Something went wrong: ${data.error}. Let's try that again!`, 'error');
                // Reset attempts counter since this wasn't a valid guess
                attempts--;
                updateAttemptsProgress();
                document.getElementById('attempts').textContent = attempts;
                return;
            }

            if (data.correct) {
                if (soundVolume > 0) winSound.play();

                // Update streak data if available
                if (data.currentWinStreak !== undefined) {
                    currentStreak = data.currentWinStreak;
                    if (currentUser) {
                        currentUser.currentWinStreak = data.currentWinStreak;
                        currentUser.bestWinStreak = data.bestWinStreak;
                        currentUser.consecutivePlayDays = data.consecutivePlayDays;
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    }
                    updateAuthUI();
                }

                // Update coins and show animation
                if (data.coinsAwarded && data.coinsAwarded > 0 && currentUser) {
                    currentUser.coins = data.totalCoins || (currentUser.coins + data.coinsAwarded);
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    showCoinAnimation(data.coinsAwarded);
                }

                // Check for newly unlocked achievements
                if (data.newAchievements && data.newAchievements.length > 0) {
                    // Show achievement notifications
                    showAchievementNotifications(data.newAchievements);
                }

                endGame(true);
            } else {
                if (soundVolume > 0) incorrectSound.play();
                // displayFeedback removed - redundant with guess history
                addToGuessHistory(guess, data.correctPosition, data.correctButWrongPosition);
                shakeInputs();
                if (attempts >= GAME_CONFIG.MAX_ATTEMPTS) {
                    endGame(false);
                }
            }
        })
        .catch(error => {
            showToast('Hmm, couldn\'t submit that guess. Check your connection and try again!', 'error');
            // Reset attempts counter on error
            attempts--;
            updateAttemptsProgress();
            document.getElementById('attempts').textContent = attempts;
        })
        .finally(() => {
            // Reset loading state
            isSubmitting = false;
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.style.opacity = '1';
                submitButton.style.cursor = 'pointer';
            }
        });

    for (let input of inputs) {
        input.value = '';
    }
    if (inputs[0]) inputs[0].focus();
}

/**
 * Request a hint from the backend
 */
async function requestHint() {
    console.log('💡 requestHint called');
    console.log('Current user:', currentUser);
    console.log('Auth token:', authToken);
    console.log('TabId:', tabId);

    // Check if user is logged in
    if (!currentUser || !authToken) {
        showToast('Please log in to use hints! 🔑', 'info');
        return;
    }

    // Check if tabId exists (game session active)
    if (!tabId) {
        showToast('Start a game first to use hints!', 'error');
        return;
    }

    // Disable button during request (keep same size to prevent layout shift)
    const hintBtn = document.getElementById('hint-btn');
    const originalHTML = hintBtn.innerHTML;
    hintBtn.disabled = true;
    hintBtn.style.opacity = '0.5';

    try {
        const response = await fetch('/get-hint', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `tabId=${tabId}&userId=${currentUser.id}`,
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Update local state
            revealedHints.set(data.position, data.digit);
            hintsUsed = data.hintsUsed;
            nextHintCost = data.nextHintCost;

            // Update user coins
            currentUser.coins = data.remainingCoins;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            // Update UI (this will re-enable button and update cost display)
            displayHint(data.position, data.digit);
            updateHintButton(); // This updates the button HTML with new cost
            hintBtn.style.opacity = '1'; // Reset opacity after updateHintButton
            updateCoinDisplay();

            // Show success animation
            showCoinAnimation(-data.costPaid); // Negative for deduction
            showToast(`Hint revealed! Position ${data.position + 1} is ${data.digit} 💡`, 'success');

        } else {
            // Handle errors - restore button state
            updateHintButton();
            hintBtn.style.opacity = '1'; // Reset opacity
            showToast(data.error || 'Failed to get hint. Try again!', 'error');

            // Special handling for insufficient coins
            if (data.required && data.current) {
                const needed = data.required - data.current;
                showToast(`You need ${needed} more coins! Win games to earn coins. 🪙`, 'warning');
            }
        }

    } catch (error) {
        console.error('Hint request failed:', error);
        showToast('Connection error. Check your network and try again!', 'error');
        // Restore button state on network error
        const hintBtn = document.getElementById('hint-btn');
        updateHintButton();
        if (hintBtn) hintBtn.style.opacity = '1'; // Reset opacity
    }
}

/**
 * Display a revealed hint in the UI
 */
function displayHint(position, digit) {
    const hintsContainer = document.getElementById('hints-container');
    const hintsList = document.getElementById('hints-list');

    if (!hintsContainer || !hintsList) return;

    // Show container if first hint
    if (hintsContainer.style.display === 'none') {
        hintsContainer.style.display = 'block';
    }

    // Create hint item
    const hintItem = document.createElement('div');
    hintItem.className = 'hint-item';
    hintItem.textContent = `Position ${position + 1} = ${digit}`;

    // Add with animation
    hintsList.appendChild(hintItem);

    // Play sound effect (reuse correct sound)
    if (soundVolume > 0 && correctSound) {
        correctSound.currentTime = 0;
        correctSound.play().catch(err => console.log('Sound play failed:', err));
    }
}

/**
 * Update hint button state and cost display
 */
function updateHintButton() {
    const hintBtn = document.getElementById('hint-btn');

    if (!hintBtn) {
        console.log('⚠️ Hint button not found');
        return;
    }

    console.log('🔄 Updating hint button. Cost:', nextHintCost, 'User coins:', currentUser?.coins);

    // Recreate button HTML with simplified clean design
    hintBtn.innerHTML = `<span class="hint-text">Hint</span> <span class="hint-cost" id="hint-cost">${nextHintCost}</span> <i class="fas fa-coins"></i>`;

    // Disable if not logged in
    if (!currentUser || !authToken) {
        hintBtn.disabled = true;
        hintBtn.setAttribute('data-locked', 'true');
        hintBtn.setAttribute('data-tooltip', 'Login required for hints');
        console.log('🔒 Hint button disabled - user not logged in');
        return;
    }

    // Disable if insufficient coins
    if (currentUser.coins < nextHintCost) {
        hintBtn.disabled = true;
        hintBtn.setAttribute('data-locked', 'true');
        hintBtn.setAttribute('data-tooltip', `Need ${nextHintCost} coins (you have ${currentUser.coins})`);
        console.log('🔒 Hint button disabled - insufficient coins');
        return;
    }

    // Enable button
    hintBtn.disabled = false;
    hintBtn.removeAttribute('data-locked');
    hintBtn.setAttribute('data-tooltip', 'Reveal one digit position');
    console.log('✅ Hint button enabled');
}

/**
 * Update coin display in header
 */
function updateCoinDisplay() {
    const coinCount = document.getElementById('coin-count');
    if (coinCount && currentUser) {
        coinCount.textContent = currentUser.coins || 0;
    }
}

/**
 * Reset hint state when starting new game
 */
function resetHintState() {
    hintsUsed = 0;
    revealedHints.clear();
    nextHintCost = 3;

    // Hide hints container
    const hintsContainer = document.getElementById('hints-container');
    if (hintsContainer) {
        hintsContainer.style.display = 'none';
    }

    // Clear hints list
    const hintsList = document.getElementById('hints-list');
    if (hintsList) {
        hintsList.innerHTML = '';
    }

    // Update button
    updateHintButton();
}

function addToGuessHistory(guess, correctPosition, correctButWrongPosition) {
    guessHistory.unshift({ guess, correctPosition, correctButWrongPosition });
    updateGuessHistoryAnimated();
}

function updateGuessHistoryAnimated() {
    const historyContainer = document.getElementById('guess-history');
    historyContainer.innerHTML = '';

    guessHistory.forEach((entry, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';

        // Add animation class only to the newest item
        if (index === 0) {
            historyItem.classList.add('new-item');
        }

        const guessSpan = document.createElement('span');
        guessSpan.className = 'guess';
        guessSpan.textContent = entry.guess;

        const correctSpan = document.createElement('span');
        correctSpan.className = 'correct';
        correctSpan.textContent = `🐂 Correct: ${entry.correctPosition}`;

        const misplacedSpan = document.createElement('span');
        misplacedSpan.className = 'misplaced';
        misplacedSpan.textContent = `🐄 Misplaced: ${entry.correctButWrongPosition}`;

        historyItem.appendChild(guessSpan);
        historyItem.appendChild(correctSpan);
        historyItem.appendChild(misplacedSpan);
        historyContainer.appendChild(historyItem);
    });
}

function updateGuessHistory() {
    const historyContainer = document.getElementById('guess-history');
    historyContainer.innerHTML = '';
    guessHistory.forEach(entry => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';

        const guessSpan = document.createElement('span');
        guessSpan.className = 'guess';
        guessSpan.textContent = entry.guess;

        const correctSpan = document.createElement('span');
        correctSpan.className = 'correct';
        correctSpan.textContent = `🐂 Correct: ${entry.correctPosition}`;

        const misplacedSpan = document.createElement('span');
        misplacedSpan.className = 'misplaced';
        misplacedSpan.textContent = `🐄 Misplaced: ${entry.correctButWrongPosition}`;

        historyItem.appendChild(guessSpan);
        historyItem.appendChild(correctSpan);
        historyItem.appendChild(misplacedSpan);
        historyContainer.appendChild(historyItem);
    });
}

function displayFeedback(correctPosition, correctButWrongPosition) {
    const feedbackElement = document.getElementById('feedback');
    feedbackElement.textContent = '';

    const p1 = document.createElement('p');
    p1.textContent = `Correct digits in correct position: ${correctPosition}`;

    const p2 = document.createElement('p');
    p2.textContent = `Correct digits in wrong position: ${correctButWrongPosition}`;

    feedbackElement.appendChild(p1);
    feedbackElement.appendChild(p2);

    // Remove both animation classes
    feedbackElement.classList.remove('fade-in', 'update');
    void feedbackElement.offsetWidth; // Force reflow
    // Add update animation for subsequent guesses
    feedbackElement.classList.add('update');
    setTimeout(() => {
        feedbackElement.classList.remove('update');
    }, 300);
}

function startTimer() {
    startTime = new Date();
    timerInterval = setInterval(updateTimer, TIMER_CONFIG.UPDATE_INTERVAL_MS);
}

function updateTimer() {
    const currentTime = new Date();
    const elapsedTime = new Date(currentTime - startTime);
    const minutes = elapsedTime.getMinutes().toString().padStart(2, '0');
    const seconds = elapsedTime.getSeconds().toString().padStart(2, '0');
    const timeString = `${minutes}:${seconds}`;

    // Update timer display (only exists in Time Attack mode)
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        timerElement.textContent = timeString;
    }

    // Update circular progress bar (if element exists)
    const timerProgress = document.querySelector('.timer-progress');
    if (timerProgress) {
        const totalSeconds = elapsedTime.getTime() / 1000;
        const maxSeconds = TIMER_CONFIG.MAX_SECONDS;
        const progress = (totalSeconds / maxSeconds) * TIMER_CONFIG.SVG_CIRCUMFERENCE;
        timerProgress.style.strokeDasharray = TIMER_CONFIG.SVG_CIRCUMFERENCE;
        timerProgress.style.strokeDashoffset = TIMER_CONFIG.SVG_CIRCUMFERENCE - progress;

        // Change color based on time remaining
        let color;
        if (totalSeconds < maxSeconds * TIMER_CONFIG.COLOR_THRESHOLD_HALF) {
            color = '#4CAF50'; // Green for first half
        } else if (totalSeconds < maxSeconds * TIMER_CONFIG.COLOR_THRESHOLD_THREE_QUARTERS) {
            color = '#FFC107'; // Yellow for next quarter
        } else {
            color = '#F44336'; // Red for last quarter
        }
        timerProgress.style.stroke = color;

        if (totalSeconds >= maxSeconds) {
            endGame(false); // End the game with a loss
        }
    }
}

function endGame(won) {
    clearInterval(timerInterval);

    // Calculate time from startTime (works for both regular and Time Attack)
    const currentTime = new Date();
    const elapsedTime = new Date(currentTime - startTime);
    const minutes = elapsedTime.getMinutes().toString().padStart(2, '0');
    const seconds = elapsedTime.getSeconds().toString().padStart(2, '0');
    const time = `${minutes}:${seconds}`;

    const gamePage = document.getElementById('game-page');
    const resultPage = document.getElementById('result-page');

    updateGameStatus(won ? 'won' : 'lost');
    gameJustCompleted = true;

    // Reset streak to 0 on loss
    if (!won && currentUser) {
        currentStreak = 0;
        currentUser.currentWinStreak = 0;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateAuthUI();
    }

    // Clean up server session when game ends
    if (!won && tabId) {
        fetch('/end-game', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `tabId=${tabId}`,
            credentials: 'include'
        }).catch(() => { });
    }

    // Prepare stats content - Modern Card Design
    const statsContainer = document.getElementById('game-stats');
    statsContainer.textContent = '';

    const difficultyNames = ['Easy', 'Medium', 'Hard'];
    const difficultyName = difficultyNames[currentDifficulty] || 'Unknown';

    // Hero Section - Win/Loss Status
    const heroSection = document.createElement('div');
    heroSection.style.cssText = 'text-align: center; margin-bottom: 25px;';

    if (won) {
        heroSection.innerHTML = `
            <div style="background: linear-gradient(135deg, #52c98c 0%, #4ea8de 100%); padding: 25px; border-radius: 20px; box-shadow: 0 8px 24px rgba(82, 201, 140, 0.3);">
                <div style="font-size: 2.5em; margin-bottom: 10px;">🎉</div>
                <div style="font-size: 2em; font-weight: 800; color: white; line-height: 1.2;">YOU WIN!</div>
                <div style="font-size: 1.2em; color: rgba(255,255,255,0.9); margin-top: 8px;">${attempts} ${attempts === 1 ? 'Attempt' : 'Attempts'}</div>
                <div style="font-size: 0.85em; color: rgba(255,255,255,0.8); margin-top: 5px;">${difficultyName} Mode</div>
            </div>
        `;
    } else {
        heroSection.innerHTML = `
            <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); padding: 25px; border-radius: 20px; box-shadow: 0 8px 24px rgba(231, 76, 60, 0.3);">
                <div style="font-size: 2.5em; margin-bottom: 10px;">😔</div>
                <div style="font-size: 2em; font-weight: 800; color: white; line-height: 1.2;">GAME OVER</div>
                <div style="font-size: 1.2em; color: rgba(255,255,255,0.9); margin-top: 8px;">Out of attempts</div>
                <div style="font-size: 0.85em; color: rgba(255,255,255,0.8); margin-top: 5px;">${difficultyName} Mode</div>
            </div>
        `;
    }
    statsContainer.appendChild(heroSection);

    // Stats Grid - 2x2 Cards
    const statsGrid = document.createElement('div');
    statsGrid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px;';

    const createStatCard = (icon, value, label) => {
        const card = document.createElement('div');
        card.style.cssText = `
            background: rgba(167, 139, 250, 0.1);
            padding: 18px;
            border-radius: 12px;
            text-align: center;
            border: 1px solid rgba(167, 139, 250, 0.2);
        `;
        card.innerHTML = `
            <i class="${icon}" style="font-size: 2em; color: var(--primary-color); margin-bottom: 8px;"></i>
            <div style="font-size: 1.8em; font-weight: 700; color: var(--text-color); line-height: 1.2;">${value}</div>
            <div style="font-size: 0.75em; color: var(--text-secondary); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">${label}</div>
        `;
        return card;
    };

    // Add stat cards
    statsGrid.appendChild(createStatCard('fas fa-stopwatch', time, 'Time'));
    statsGrid.appendChild(createStatCard('fas fa-bullseye', `${attempts}/10`, 'Attempts'));

    // Best score card
    const bestScoreValue = bestScore === 'Not set' ? '--' : bestScore;
    statsGrid.appendChild(createStatCard('fas fa-trophy', bestScoreValue, 'Best Score'));

    // Comparison card
    const comparison = compareToaBestScore(attempts);
    const comparisonValue = comparison.includes('first') ? '🆕' : comparison.split(' ')[0];
    statsGrid.appendChild(createStatCard('fas fa-chart-line', comparisonValue, 'vs Best'));

    statsContainer.appendChild(statsGrid);

    if (won) {
        createConfetti();
        updateBestScore(attempts);
        addToRecentScores(currentDifficulty, attempts, time);
    }

    document.getElementById('play-again').style.display = 'inline-block';
    document.getElementById('quit').style.display = 'inline-block';

    // Transition to result page with animation
    fadeOutElement(gamePage, () => {
        fadeInElement(resultPage);
    });
}

function animateResultStats(time, attempts) {
    // Animate the attempts number with count-up
    const attemptsElements = document.querySelectorAll('#game-stats .stat-item span');

    // Find the attempts stat (second item)
    if (attemptsElements[1]) {
        const targetAttempts = attempts;
        let currentCount = 0;
        const duration = 800; // 0.8s
        const increment = Math.ceil(targetAttempts / (duration / 16)); // 60fps

        const countUp = setInterval(() => {
            currentCount += increment;
            if (currentCount >= targetAttempts) {
                currentCount = targetAttempts;
                clearInterval(countUp);
            }
            attemptsElements[1].textContent = `Attempts: ${currentCount}/${GAME_CONFIG.MAX_ATTEMPTS}`;
        }, 16);
    }
}

function calculateAverageGuessTime(totalTime, attempts) {
    const [minutes, seconds] = totalTime.split(':').map(Number);
    const totalSeconds = minutes * 60 + seconds;
    const avgSeconds = Math.round(totalSeconds / attempts);
    return `${Math.floor(avgSeconds / 60)}:${(avgSeconds % 60).toString().padStart(2, '0')}`;
}

function compareToaBestScore(attempts) {
    if (bestScore === 'Not set') return 'This is your first game!';
    const parsedScore = parseInt(bestScore, 10);
    if (isNaN(parsedScore)) return 'This is your first game!';
    const difference = attempts - parsedScore;
    if (difference === 0) return 'You matched your best score!';
    return difference > 0 ? `${difference} more than your best` : `${Math.abs(difference)} less than your best`;
}

function updateBestScore(score) {
    if (score === undefined) {
        document.getElementById('best-score').textContent = bestScore;
        return;
    }

    const parsedBestScore = parseInt(bestScore, 10);
    if (bestScore === 'Not set' || isNaN(parsedBestScore) || score < parsedBestScore) {
        bestScore = score.toString();
        localStorage.setItem('bestScore', bestScore);
        document.getElementById('best-score').textContent = bestScore;
    }
}

function addToRecentScores(difficulty, attempts, time) {
    recentScores.unshift({
        difficulty: GAME_CONFIG.DIFFICULTY_NAMES[difficulty],
        attempts: attempts,
        time: time
    });
    if (recentScores.length > GAME_CONFIG.MAX_RECENT_SCORES) recentScores.pop();
    localStorage.setItem('recentScores', JSON.stringify(recentScores));
    updateRecentScores();
}

let gameJustCompleted = false;

function showHomePage() {
    updateGameStatus('home');

    // Clean up daily challenge if active
    if (dailyChallengeSessionId !== null) {
        clearInterval(dailyChallengeTimerInterval);
        dailyChallengeSessionId = null;
    }

    // Clean up time attack if active
    if (timeAttackSessionId !== null) {
        clearInterval(timeAttackTimerInterval);
        timeAttackSessionId = null;
    }

    const homePage = document.getElementById('home-page');
    const gamePage = document.getElementById('game-page');
    const resultPage = document.getElementById('result-page');
    const dailyChallengePage = document.getElementById('daily-challenge-page');
    const dailyResultPage = document.getElementById('daily-result-page');
    const timeAttackPage = document.getElementById('time-attack-page');
    const timeAttackResultPage = document.getElementById('time-attack-result-page');

    // Fade out current page
    const currentPage = gamePage.style.display !== 'none' ? gamePage :
        resultPage.style.display !== 'none' ? resultPage :
            dailyChallengePage.style.display !== 'none' ? dailyChallengePage :
                dailyResultPage.style.display !== 'none' ? dailyResultPage :
                    timeAttackPage.style.display !== 'none' ? timeAttackPage :
                        timeAttackResultPage.style.display !== 'none' ? timeAttackResultPage : null;

    if (currentPage) {
        fadeOutElement(currentPage, () => {
            fadeInElement(homePage);
            updateStreakStats();
            loadLeaderboard(gameJustCompleted);
            gameJustCompleted = false;
        });
    } else {
        // First load - no transition needed
        homePage.style.display = 'block';
        gamePage.style.display = 'none';
        resultPage.style.display = 'none';
        dailyChallengePage.style.display = 'none';
        dailyResultPage.style.display = 'none';
        timeAttackPage.style.display = 'none';
        timeAttackResultPage.style.display = 'none';
        updateStreakStats();
        loadLeaderboard(gameJustCompleted);
        gameJustCompleted = false;
    }
}

function quitGame() {
    if (confirm("Are you sure you want to quit and see results?")) {
        // End the game as a loss to show results page
        endGame(false);
    }
}

function resetGameState() {
    attempts = 0;
    guessHistory = [];

    // Reset timer (only exists in Time Attack mode)
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        timerElement.textContent = '00:00';
    }

    document.getElementById('attempts').textContent = '0';

    // Reset feedback (if element exists)
    const feedbackElement = document.getElementById('feedback');
    if (feedbackElement) {
        feedbackElement.textContent = '';
    }

    updateAttemptsProgress();
}

function createConfetti() {
    const confettiContainer = document.getElementById('confetti-container');
    if (!confettiContainer) return;

    // Clear any existing timeout and confetti
    if (confettiTimeout) {
        clearTimeout(confettiTimeout);
    }
    confettiContainer.innerHTML = '';

    const numConfetti = CONFETTI_CONFIG.COUNT;

    for (let i = 0; i < numConfetti; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-number';

        confetti.textContent = Math.floor(Math.random() * 10);

        confetti.style.color = CONFETTI_CONFIG.COLORS[Math.floor(Math.random() * CONFETTI_CONFIG.COLORS.length)];
        confetti.style.left = '50%';
        confetti.style.top = '50%';

        const angle = Math.random() * Math.PI * 2;
        const distance = CONFETTI_CONFIG.MIN_DISTANCE + Math.random() * (CONFETTI_CONFIG.MAX_DISTANCE - CONFETTI_CONFIG.MIN_DISTANCE);
        const rotation = Math.random() * CONFETTI_CONFIG.MAX_ROTATION - CONFETTI_CONFIG.HALF_ROTATION;

        confetti.style.setProperty('--end-x', `${Math.cos(angle) * distance}vw`);
        confetti.style.setProperty('--end-y', `${Math.sin(angle) * distance}vh`);
        confetti.style.setProperty('--rotation', `${rotation}deg`);

        const size = CONFETTI_CONFIG.MIN_SIZE + Math.random() * (CONFETTI_CONFIG.MAX_SIZE - CONFETTI_CONFIG.MIN_SIZE);
        confetti.style.fontSize = `${size}px`;

        confetti.style.animationDuration = `${CONFETTI_CONFIG.MIN_DURATION + Math.random() * (CONFETTI_CONFIG.MAX_DURATION - CONFETTI_CONFIG.MIN_DURATION)}s`;
        confetti.style.animationDelay = `${Math.random() * CONFETTI_CONFIG.MAX_DELAY}s`;

        confettiContainer.appendChild(confetti);
    }

    confettiTimeout = setTimeout(() => {
        confettiContainer.innerHTML = '';
        confettiTimeout = null;
    }, CONFETTI_CONFIG.CLEANUP_TIMEOUT_MS);
}

function shakeInputs() {
    const inputContainer = document.getElementById('input-container');
    inputContainer.classList.add('shake');
    setTimeout(() => inputContainer.classList.remove('shake'), ANIMATION_CONFIG.SHAKE_DURATION_MS);
}

function updateGameStatus(status) {
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
}

function updateAttemptsProgress() {
    const attemptsText = document.getElementById('attempts');
    if (attemptsText) {
        attemptsText.textContent = attempts;
    }

    const progressCircle = document.querySelector('.attempts-progress');
    if (!progressCircle) return;

    const radius = progressCircle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    const progress = (attempts / GAME_CONFIG.MAX_ATTEMPTS) * circumference;

    progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    progressCircle.style.strokeDashoffset = circumference - progress;

    let color;
    if (attempts <= ATTEMPTS_CONFIG.THRESHOLD_GREEN) {
        color = '#4CAF50'; // Green for first 3 attempts
    } else if (attempts <= ATTEMPTS_CONFIG.THRESHOLD_YELLOW) {
        color = '#FFC107'; // Yellow for next 3 attempts
    } else {
        color = '#F44336'; // Red for last 4 attempts
    }
    progressCircle.style.stroke = color;
}

// Authentication Functions
function initializeAuth() {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('currentUser');

    if (storedToken && storedUser) {
        authToken = storedToken;
        currentUser = JSON.parse(storedUser);
        currentStreak = currentUser.currentWinStreak || 0;
        updateStreakStats();
    }

    // Always call updateAuthUI to show correct controls (guest or user)
    updateAuthUI();
}

function updateAuthUI() {
    const guestControls = document.getElementById('guest-controls');
    const userControls = document.getElementById('user-controls');
    const winStreakCount = document.getElementById('win-streak-count');
    const coinCount = document.getElementById('coin-count');
    const dropdownUsername = document.getElementById('dropdown-username');
    const dropdownEmail = document.getElementById('dropdown-email');

    if (!guestControls || !userControls) return;

    if (currentUser) {
        // Show user controls, hide guest controls
        guestControls.style.display = 'none';
        userControls.style.display = 'flex';

        // Update dropdown user info
        if (dropdownUsername) dropdownUsername.textContent = currentUser.username || 'User';
        if (dropdownEmail) dropdownEmail.textContent = currentUser.email || '';

        // Update streak display
        if (winStreakCount) {
            winStreakCount.textContent = currentStreak || 0;
        }

        // Update coin display
        if (coinCount) {
            coinCount.textContent = currentUser.coins || 0;
        }
    } else {
        // Show guest controls, hide user controls
        guestControls.style.display = 'flex';
        userControls.style.display = 'none';
    }

    // Update hint button state
    updateHintButton();
}

/**
 * Show coin animation - floating "+X 🪙" that pops up and fades (or "-X" for deductions)
 * @param {number} amount - Amount of coins earned (positive) or deducted (negative)
 */
function showCoinAnimation(amount) {
    console.log('🪙 showCoinAnimation called:', { amount, hasCurrentUser: !!currentUser, currentUserCoins: currentUser?.coins });

    if (!currentUser || amount === 0) {
        console.log('❌ Animation skipped - no user or zero amount');
        return;
    }

    const coinDisplay = document.getElementById('coin-display');
    if (!coinDisplay) {
        console.log('❌ coin-display element not found');
        return;
    }

    const isDeduction = amount < 0;
    const absAmount = Math.abs(amount);

    console.log('✅ Starting coin animation with', amount, 'coins');

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
    if (coinCount && currentUser && currentUser.coins !== undefined) {
        coinCount.textContent = currentUser.coins;
        coinCount.style.animation = 'none';
        setTimeout(() => {
            coinCount.style.animation = 'coinPulse 0.6s ease-out';
        }, 10);
    }
}

function attachAuthListeners() {
    const loginBtn = document.getElementById('login-btn');
    const authModal = document.getElementById('auth-modal');
    const closeModal = document.querySelector('.close-modal');
    const showSignup = document.getElementById('show-signup');
    const showLogin = document.getElementById('show-login');
    const loginFormElement = document.getElementById('login-form-element');
    const signupFormElement = document.getElementById('signup-form-element');

    if (!loginBtn || !authModal || !closeModal) return;

    loginBtn.addEventListener('click', () => {
        openModalWithAnimation(authModal);
        showLoginForm();
    });

    closeModal.addEventListener('click', () => {
        closeModalWithAnimation(authModal, clearAuthForms);
    });

    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) {
            closeModalWithAnimation(authModal, clearAuthForms);
        }
    });

    if (showSignup) {
        showSignup.addEventListener('click', (e) => {
            e.preventDefault();
            showSignupForm();
        });
    }

    if (showLogin) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            showLoginForm();
        });
    }

    if (loginFormElement) {
        loginFormElement.addEventListener('submit', handleLogin);
    }

    if (signupFormElement) {
        signupFormElement.addEventListener('submit', handleSignup);
    }

    // Setup dropdown and settings listeners
    setupHeaderDropdown();
    setupSettingsModal();
    setupLeaderboardModal();
}

function showLoginForm() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (loginForm && signupForm) {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
        clearAuthForms();
    }
}

function showSignupForm() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (loginForm && signupForm) {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
        clearAuthForms();
    }
}

function clearAuthForms() {
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
}

async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.error) {
            errorDiv.textContent = data.error;
            return;
        }

        if (data.success) {
            authToken = data.token;
            currentUser = {
                id: data.userId,
                username: data.username,
                bestScore: data.bestScore,
                totalGames: data.totalGames,
                totalWins: data.totalWins,
                currentWinStreak: data.currentWinStreak || 0,
                bestWinStreak: data.bestWinStreak || 0,
                consecutivePlayDays: data.consecutivePlayDays || 0,
                coins: data.coins || 0
            };

            // Update global streak variable
            currentStreak = data.currentWinStreak || 0;

            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            updateAuthUI();
            updateStreakStats();
            closeModalWithAnimation(document.getElementById('auth-modal'), clearAuthForms);

            showToast('Welcome back, ' + currentUser.username + '!', 'success');
        }
    } catch (error) {
        errorDiv.textContent = 'Couldn\'t log you in right now. Please try again!';
    }
}

async function handleSignup(e) {
    e.preventDefault();

    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const errorDiv = document.getElementById('signup-error');

    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (data.error) {
            errorDiv.textContent = data.error;
            return;
        }

        if (data.success) {
            authToken = data.token;
            currentUser = {
                id: data.userId,
                username: data.username,
                coins: data.coins || 0
            };

            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            updateAuthUI();
            closeModalWithAnimation(document.getElementById('auth-modal'), clearAuthForms);
            clearAuthForms();

            showToast('Welcome to NumVana, ' + currentUser.username + '!', 'success');
        }
    } catch (error) {
        errorDiv.textContent = 'Couldn\'t create your account right now. Please try again!';
    }
}

function logout() {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    updateAuthUI();
    showToast('Logged out successfully!', 'success');
}

function setupHeaderDropdown() {
    const dropdownBtn = document.getElementById('profile-dropdown-btn');
    const dropdown = document.getElementById('profile-dropdown');
    const viewProfileBtn = document.getElementById('dropdown-view-profile');
    const settingsBtn = document.getElementById('dropdown-settings');
    const logoutBtn = document.getElementById('dropdown-logout');

    if (!dropdownBtn || !dropdown) return;

    // Toggle dropdown on button click
    dropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (dropdown.style.display === 'block') {
            // Close with animation
            dropdown.classList.add('dropdown-exit');
            setTimeout(() => {
                dropdown.style.display = 'none';
                dropdown.classList.remove('dropdown-exit');
            }, 200);
        } else {
            // Open with animation (existing dropdownFadeIn)
            dropdown.style.display = 'block';
            void dropdown.offsetWidth; // Force reflow
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !dropdownBtn.contains(e.target)) {
            if (dropdown.style.display === 'block') {
                dropdown.classList.add('dropdown-exit');
                setTimeout(() => {
                    dropdown.style.display = 'none';
                    dropdown.classList.remove('dropdown-exit');
                }, 200);
            }
        }
    });

    // View Profile
    if (viewProfileBtn) {
        viewProfileBtn.addEventListener('click', () => {
            dropdown.classList.add('dropdown-exit');
            setTimeout(() => {
                dropdown.style.display = 'none';
                dropdown.classList.remove('dropdown-exit');
                loadAndShowProfile();
            }, 200);
        });
    }

    // Settings
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            dropdown.classList.add('dropdown-exit');
            setTimeout(() => {
                dropdown.style.display = 'none';
                dropdown.classList.remove('dropdown-exit');
                const settingsModal = document.getElementById('settings-modal');
                if (settingsModal) {
                    openModalWithAnimation(settingsModal);
                }
            }, 200);
        });
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            dropdown.classList.add('dropdown-exit');
            setTimeout(() => {
                dropdown.style.display = 'none';
                dropdown.classList.remove('dropdown-exit');
                logout();
            }, 200);
        });
    }
}

function setupSettingsModal() {
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings');
    const settingsBtnGuest = document.getElementById('settings-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const volumePercentage = document.getElementById('volume-percentage');

    if (!settingsModal) return;

    // Open settings modal from guest controls
    if (settingsBtnGuest) {
        settingsBtnGuest.addEventListener('click', () => {
            openModalWithAnimation(settingsModal);
        });
    }

    // Close settings modal
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            closeModalWithAnimation(settingsModal);
        });
    }

    // Close when clicking outside modal
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            closeModalWithAnimation(settingsModal);
        }
    });

    // Volume slider in settings
    if (volumeSlider && volumePercentage) {
        // Initialize slider with saved volume
        volumeSlider.value = Math.round(soundVolume * 100);
        volumePercentage.textContent = volumeSlider.value + '%';
        updateVolumeIcon(soundVolume);

        volumeSlider.addEventListener('input', (e) => {
            const volume = parseInt(e.target.value);
            soundVolume = volume / 100;
            volumePercentage.textContent = volume + '%';
            updateSoundVolumes();
            updateVolumeIcon(soundVolume);
            localStorage.setItem('soundVolume', soundVolume);

            // Play a test sound when adjusting volume
            if (soundVolume > 0) {
                correctSound.currentTime = 0;
                correctSound.play();
            }
        });
    }
}

function setupLeaderboardModal() {
    const leaderboardModal = document.getElementById('leaderboard-modal');
    const leaderboardBtn = document.getElementById('leaderboard-btn');
    const closeLeaderboardBtn = document.getElementById('leaderboard-modal-close');

    if (!leaderboardModal) return;

    // Open leaderboard modal
    if (leaderboardBtn) {
        leaderboardBtn.addEventListener('click', () => {
            openModalWithAnimation(leaderboardModal);
            // Load leaderboard data when modal opens
            loadLeaderboard(false, true);
        });
    }

    // Close leaderboard modal
    if (closeLeaderboardBtn) {
        closeLeaderboardBtn.addEventListener('click', () => {
            closeModalWithAnimation(leaderboardModal);
        });
    }

    // Close when clicking outside modal
    leaderboardModal.addEventListener('click', (e) => {
        if (e.target === leaderboardModal) {
            closeModalWithAnimation(leaderboardModal);
        }
    });
}

function updateSoundToggleButton(button) {
    if (!button) return;

    const icon = button.querySelector('i');
    if (icon) {
        if (soundEnabled) {
            icon.className = 'fas fa-volume-up';
        } else {
            icon.className = 'fas fa-volume-mute';
        }
    }
}

// Achievement Functions (achievement summary and badge functions removed - now shown in profile)

let currentAchievements = [];
let currentFilter = 'all';

function createAchievementCard(achievement) {
    const card = document.createElement('div');
    card.className = 'achievement-item ' + (achievement.unlocked ? 'unlocked' : 'locked');

    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'achievement-icon-wrapper';
    iconWrapper.style.color = achievement.iconColor || '#8b7abf';

    const icon = document.createElement('i');
    icon.className = achievement.iconClass + ' achievement-icon';
    iconWrapper.appendChild(icon);

    const info = document.createElement('div');
    info.className = 'achievement-info';

    const header = document.createElement('div');
    header.className = 'achievement-header';

    const name = document.createElement('div');
    name.className = 'achievement-name';
    name.textContent = achievement.name;
    header.appendChild(name);

    if (achievement.unlocked) {
        const badge = document.createElement('span');
        badge.className = 'achievement-badge-unlocked';
        badge.textContent = '✓';
        header.appendChild(badge);
    }

    const description = document.createElement('div');
    description.className = 'achievement-description';
    description.textContent = achievement.description;

    const meta = document.createElement('div');
    meta.className = 'achievement-meta';

    const type = document.createElement('div');
    type.className = 'achievement-type';
    type.innerHTML = '<i class="fas fa-tag"></i> ' + formatType(achievement.type);

    meta.appendChild(type);

    info.appendChild(header);
    info.appendChild(description);
    info.appendChild(meta);

    card.appendChild(iconWrapper);
    card.appendChild(info);

    return card;
}

function formatType(type) {
    const typeMap = {
        'MILESTONE': 'Milestone',
        'SKILL': 'Skill',
        'DIFFICULTY': 'Difficulty',
        'STREAK': 'Streak'
    };
    return typeMap[type] || type;
}

// Achievement Notification System
function showAchievementNotifications(achievements) {
    if (!achievements || achievements.length === 0) return;

    // Add achievements to queue
    achievements.forEach(achievement => {
        achievementQueue.push(achievement);
    });

    // Start processing queue if not already showing
    if (!isShowingAchievement) {
        processAchievementQueue();
    }
}

function processAchievementQueue() {
    if (achievementQueue.length === 0) {
        isShowingAchievement = false;
        return;
    }

    isShowingAchievement = true;
    const achievement = achievementQueue.shift();

    displayAchievementToast(achievement);
}

function displayAchievementToast(achievement) {
    const container = document.getElementById('achievement-toast-container');
    if (!container) return;

    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';

    // Icon wrapper
    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'achievement-toast-icon-wrapper';
    iconWrapper.style.color = achievement.iconColor || '#8b7abf';

    const icon = document.createElement('i');
    icon.className = achievement.iconClass + ' achievement-toast-icon';
    iconWrapper.appendChild(icon);

    // Content
    const content = document.createElement('div');
    content.className = 'achievement-toast-content';

    const header = document.createElement('div');
    header.className = 'achievement-toast-header';

    const badge = document.createElement('div');
    badge.className = 'achievement-toast-badge';
    badge.textContent = '🏆 UNLOCKED';

    header.appendChild(badge);

    const title = document.createElement('div');
    title.className = 'achievement-toast-title';
    title.textContent = achievement.name;

    const description = document.createElement('div');
    description.className = 'achievement-toast-description';
    description.textContent = achievement.description;

    content.appendChild(header);
    content.appendChild(title);
    content.appendChild(description);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'achievement-toast-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => {
        removeToast(toast);
    });

    // Assemble toast
    toast.appendChild(iconWrapper);
    toast.appendChild(content);
    toast.appendChild(closeBtn);

    // Add to container
    container.appendChild(toast);

    // Play sound
    if (soundVolume > 0) {
        achievementSound.play().catch(() => { });
    }

    // Create confetti for achievement
    createAchievementConfetti();

    // Auto-remove after 5 seconds
    setTimeout(() => {
        removeToast(toast);
    }, 5000);
}

function removeToast(toast) {
    toast.classList.add('removing');
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
        // Process next achievement in queue
        setTimeout(() => {
            processAchievementQueue();
        }, 300);
    }, 500);
}

// General Toast Notification System
function showToast(message, type = 'info') {
    const container = document.getElementById('achievement-toast-container');
    if (!container) return;

    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'simple-toast simple-toast-' + type;

    // Icon based on type
    let iconClass = 'fas fa-info-circle';
    let iconColor = '#3498db';

    if (type === 'success') {
        iconClass = 'fas fa-check-circle';
        iconColor = '#27ae60';
    } else if (type === 'error') {
        iconClass = 'fas fa-exclamation-circle';
        iconColor = '#e74c3c';
    } else if (type === 'warning') {
        iconClass = 'fas fa-exclamation-triangle';
        iconColor = '#f39c12';
    }

    // Icon
    const icon = document.createElement('i');
    icon.className = iconClass + ' simple-toast-icon';
    icon.style.color = iconColor;

    // Message
    const messageEl = document.createElement('div');
    messageEl.className = 'simple-toast-message';
    messageEl.textContent = message;

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'simple-toast-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => removeSimpleToast(toast);

    toast.appendChild(icon);
    toast.appendChild(messageEl);
    toast.appendChild(closeBtn);
    container.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        removeSimpleToast(toast);
    }, 4000);
}

function removeSimpleToast(toast) {
    toast.classList.add('removing');
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

function createAchievementConfetti() {
    const container = document.getElementById('confetti-container');
    if (!container) return;

    const colors = CONFETTI_CONFIG.COLORS;
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
}

// Leaderboard Functions
let leaderboardCache = null;
let leaderboardCacheTime = 0;
const LEADERBOARD_CACHE_DURATION = 30000; // 30 seconds

async function loadLeaderboard(forceRefresh = false, isModal = false) {
    // Support both modal and inline leaderboard
    const loadingDiv = isModal ?
        document.getElementById('modal-leaderboard-loading') :
        document.getElementById('leaderboard-loading');
    const contentDiv = isModal ?
        document.getElementById('modal-leaderboard-content') :
        document.getElementById('leaderboard-content');

    if (!loadingDiv || !contentDiv) return;

    // Check if we have cached data and it's still valid
    const now = Date.now();
    if (!forceRefresh && leaderboardCache && (now - leaderboardCacheTime) < LEADERBOARD_CACHE_DURATION) {
        // Use cached data
        contentDiv.innerHTML = createLeaderboardHTML(leaderboardCache);
        loadingDiv.style.display = 'none';
        contentDiv.style.display = 'block';
        return;
    }

    try {
        const response = await fetch('/api/leaderboard?limit=10');
        const data = await response.json();

        if (data.success && data.leaderboard && data.leaderboard.length > 0) {
            // Update cache
            leaderboardCache = data.leaderboard;
            leaderboardCacheTime = now;

            contentDiv.innerHTML = createLeaderboardHTML(data.leaderboard);
            loadingDiv.style.display = 'none';
            contentDiv.style.display = 'block';
        } else {
            loadingDiv.textContent = 'No players on the leaderboard yet. Be the first!';
        }
    } catch (error) {
        loadingDiv.textContent = 'Couldn\'t load the leaderboard. Try again in a moment!';
    }
}

function createLeaderboardHTML(players) {
    let html = '<table class="leaderboard-table"><thead><tr>';
    html += '<th>Rank</th>';
    html += '<th>Player</th>';
    html += '<th>Best Score</th>';
    html += '<th>Win Rate</th>';
    html += '<th>Games</th>';
    html += '</tr></thead><tbody>';

    players.forEach(player => {
        const rankClass = player.rank <= 3 ? 'rank-' + player.rank : '';
        const rankIcon = getRankIcon(player.rank);

        html += '<tr class="' + rankClass + '">';
        html += '<td class="rank-cell">' + rankIcon + ' ' + player.rank + '</td>';
        html += '<td class="username-cell">' + escapeHtml(player.username) + '</td>';
        html += '<td class="score-cell">' + player.bestScore + ' attempts</td>';
        html += '<td class="winrate-cell">' + player.winRate + '%</td>';
        html += '<td class="games-cell">' + player.totalWins + '/' + player.totalGames + '</td>';
        html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
}

function getRankIcon(rank) {
    switch (rank) {
        case 1: return '🥇';
        case 2: return '🥈';
        case 3: return '🥉';
        default: return '';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Profile Modal Functions
function setupProfileListeners() {
    const profileBtn = document.getElementById('profile-btn');
    const profileModal = document.getElementById('profile-modal');
    const closeProfileBtn = document.getElementById('close-profile');

    if (profileBtn) {
        profileBtn.addEventListener('click', loadAndShowProfile);
    }

    if (closeProfileBtn) {
        closeProfileBtn.addEventListener('click', () => {
            closeModalWithAnimation(profileModal);
        });
    }

    if (profileModal) {
        profileModal.addEventListener('click', (e) => {
            if (e.target === profileModal) {
                closeModalWithAnimation(profileModal);
            }
        });
    }
}

async function loadAndShowProfile() {
    if (!authToken || !currentUser) {
        showToast('Please log in to see your profile and achievements!', 'info');
        setTimeout(() => {
            const authModal = document.getElementById('auth-modal');
            if (authModal) {
                openModalWithAnimation(authModal);
            }
        }, 1500);
        return;
    }

    const profileModal = document.getElementById('profile-modal');
    const loadingIndicator = document.getElementById('profile-loading');
    const profileContent = document.getElementById('profile-content');

    // Show modal with loading state
    openModalWithAnimation(profileModal);
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (profileContent) profileContent.style.display = 'none';

    try {
        const response = await fetch('/api/user/profile', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + authToken
            }
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            throw new Error(data.error || 'Failed to load profile');
        }

        if (data.success && data.profile) {
            populateProfileModal(data.profile);
            // Load achievements into profile
            await loadProfileAchievements();
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            if (profileContent) profileContent.style.display = 'block';
        } else {
            throw new Error('Invalid profile data received');
        }
    } catch (error) {
        console.error('Failed to load profile:', error);
        showToast('Couldn\'t load your profile right now. Try refreshing the page!', 'error');
        profileModal.style.display = 'none';
    }
}

function populateProfileModal(profile) {
    // Update header info
    const usernameEl = document.getElementById('profile-username');
    const emailEl = document.getElementById('profile-email');
    const joinDateEl = document.getElementById('profile-join-date');

    if (usernameEl) usernameEl.textContent = profile.username || 'N/A';
    if (emailEl) emailEl.textContent = profile.email || 'N/A';
    if (joinDateEl) joinDateEl.textContent = formatDate(profile.createdAt);

    // Update stats
    const totalGamesEl = document.getElementById('profile-total-games');
    const totalWinsEl = document.getElementById('profile-total-wins');
    const winRateEl = document.getElementById('profile-win-rate');
    const bestScoreEl = document.getElementById('profile-best-score');

    if (totalGamesEl) totalGamesEl.textContent = profile.totalGames || 0;
    if (totalWinsEl) totalWinsEl.textContent = profile.totalWins || 0;
    if (winRateEl) winRateEl.textContent = profile.winRate || '0%';
    if (bestScoreEl) bestScoreEl.textContent = profile.bestScore || 'Not set';

    // Update streaks
    const currentWinStreakEl = document.getElementById('profile-current-win-streak');
    const bestWinStreakEl = document.getElementById('profile-best-win-streak');
    const consecutiveDaysEl = document.getElementById('profile-consecutive-days');
    const bestDaysStreakEl = document.getElementById('profile-best-days-streak');

    if (currentWinStreakEl) currentWinStreakEl.textContent = profile.currentWinStreak || 0;
    if (bestWinStreakEl) bestWinStreakEl.textContent = profile.bestWinStreak || 0;
    if (consecutiveDaysEl) consecutiveDaysEl.textContent = profile.consecutivePlayDays || 0;
    if (bestDaysStreakEl) bestDaysStreakEl.textContent = profile.bestPlayDayStreak || 0;

    // Update difficulty breakdown
    updateDifficultyBreakdown(profile.difficultyStats);

    // Update achievements summary
    if (profile.achievementSummary) {
        const achievementCountEl = document.getElementById('profile-achievement-count');
        if (achievementCountEl) {
            achievementCountEl.textContent = `${profile.achievementSummary.unlockedCount || 0} / ${profile.achievementSummary.totalCount || 0}`;
        }
    }

    // Update recent games
    updateRecentGamesList(profile.recentGames || []);
}

function updateDifficultyBreakdown(difficultyStats) {
    if (!difficultyStats) return;

    const difficulties = ['EASY', 'MEDIUM', 'HARD'];

    difficulties.forEach(difficulty => {
        const stats = difficultyStats[difficulty];
        if (!stats) return;

        const winsEl = document.getElementById(`profile-${difficulty.toLowerCase()}-wins`);
        const totalEl = document.getElementById(`profile-${difficulty.toLowerCase()}-total`);
        const rateEl = document.getElementById(`profile-${difficulty.toLowerCase()}-rate`);
        const progressEl = document.getElementById(`profile-${difficulty.toLowerCase()}-progress`);

        const wins = stats.wins || 0;
        const total = stats.total || 0;
        const rate = stats.winRate || '0%';

        if (winsEl) winsEl.textContent = wins;
        if (totalEl) totalEl.textContent = total;
        if (rateEl) rateEl.textContent = rate;

        // Update progress bar
        if (progressEl) {
            const percentage = total > 0 ? (wins / total) * 100 : 0;
            progressEl.style.width = percentage + '%';
        }
    });
}

function updateRecentGamesList(games) {
    const recentGamesList = document.getElementById('profile-recent-games-list');
    if (!recentGamesList) return;

    recentGamesList.innerHTML = '';

    if (!games || games.length === 0) {
        recentGamesList.innerHTML = '<p style="text-align: center; opacity: 0.7; padding: 20px;">No recent games yet.</p>';
        return;
    }

    games.forEach(game => {
        const gameItem = document.createElement('div');
        gameItem.className = 'recent-game-item ' + (game.won ? 'won' : 'lost');

        const difficultySpan = document.createElement('span');
        difficultySpan.className = 'game-difficulty';
        difficultySpan.textContent = formatDifficulty(game.difficulty);

        const resultSpan = document.createElement('span');
        resultSpan.className = 'game-result';
        resultSpan.innerHTML = game.won
            ? '<i class="fas fa-check-circle"></i> Won'
            : '<i class="fas fa-times-circle"></i> Lost';

        const attemptsSpan = document.createElement('span');
        attemptsSpan.className = 'game-attempts';
        attemptsSpan.textContent = `${game.attempts || 0} attempts`;

        const timeSpan = document.createElement('span');
        timeSpan.className = 'game-time';
        timeSpan.textContent = formatGameTime(game.timeTaken);

        const dateSpan = document.createElement('span');
        dateSpan.className = 'game-date';
        dateSpan.textContent = formatRelativeDate(game.createdAt);

        gameItem.appendChild(difficultySpan);
        gameItem.appendChild(resultSpan);
        gameItem.appendChild(attemptsSpan);
        gameItem.appendChild(timeSpan);
        gameItem.appendChild(dateSpan);

        recentGamesList.appendChild(gameItem);
    });
}

function formatDifficulty(difficulty) {
    const difficultyMap = {
        0: 'Easy',
        1: 'Medium',
        2: 'Hard',
        'EASY': 'Easy',
        'MEDIUM': 'Medium',
        'HARD': 'Hard'
    };
    return difficultyMap[difficulty] || difficulty;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatRelativeDate(dateString) {
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
}

function formatGameTime(seconds) {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Profile Achievements Functions
let profileCurrentFilter = 'all';
let profileAchievements = [];

async function loadProfileAchievements() {
    if (!authToken || !currentUser) {
        return;
    }

    try {
        const response = await fetch('/api/achievements', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + authToken
            }
        });

        const data = await response.json();

        if (data.success && data.achievements) {
            profileAchievements = data.achievements;
            displayProfileAchievements(data.achievements);
            setupProfileAchievementTabs();
        }
    } catch (error) {
        console.error('Failed to load achievements in profile:', error);
    }
}

function displayProfileAchievements(achievements) {
    const unlocked = achievements.filter(a => a.unlocked);
    const total = achievements.length;
    const completionPercent = Math.round((unlocked.length / total) * 100);

    // Update stats
    const unlockedCountEl = document.getElementById('profile-unlocked-count');
    const totalCountEl = document.getElementById('profile-total-count');
    const completionPercentEl = document.getElementById('profile-completion-percent');

    if (unlockedCountEl) unlockedCountEl.textContent = unlocked.length;
    if (totalCountEl) totalCountEl.textContent = total;
    if (completionPercentEl) completionPercentEl.textContent = completionPercent + '%';

    // Render achievements list
    renderProfileAchievementsList(achievements);
}

function renderProfileAchievementsList(achievements) {
    const listContainer = document.getElementById('profile-achievements-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    // Filter achievements based on current filter
    let filteredAchievements = achievements;
    if (profileCurrentFilter === 'unlocked') {
        filteredAchievements = achievements.filter(a => a.unlocked);
    } else if (profileCurrentFilter === 'locked') {
        filteredAchievements = achievements.filter(a => !a.unlocked);
    }

    // Sort: unlocked first, then by name
    filteredAchievements.sort((a, b) => {
        if (a.unlocked && !b.unlocked) return -1;
        if (!a.unlocked && b.unlocked) return 1;
        return a.name.localeCompare(b.name);
    });

    filteredAchievements.forEach(achievement => {
        const item = createAchievementCard(achievement);
        listContainer.appendChild(item);
    });

    if (filteredAchievements.length === 0) {
        listContainer.innerHTML = '<p style="text-align: center; color: var(--text-color); opacity: 0.7; padding: 40px;">No achievements in this category yet.</p>';
    }
}

function setupProfileAchievementTabs() {
    const modal = document.getElementById('profile-modal');
    if (!modal) return;

    const tabs = modal.querySelectorAll('.achievement-tab');
    tabs.forEach(tab => {
        // Remove any existing listeners
        tab.replaceWith(tab.cloneNode(true));
    });

    // Re-query after replacing
    const newTabs = modal.querySelectorAll('.achievement-tab');
    newTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active state
            newTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update filter and re-render
            profileCurrentFilter = tab.dataset.filter;
            renderProfileAchievementsList(profileAchievements);
        });
    });
}


// ===================================
// DAILY CHALLENGE FUNCTIONALITY
// ===================================

// Daily Challenge State
let dailyChallengeInfo = null;
let dailyChallengeSessionId = null;
let dailyChallengeAttempts = 0;
let dailyChallengeStartTime = null;
let dailyChallengeTimerInterval = null;
let dailyChallengeGuessHistory = [];
let dailyChallengeDigitCount = 0;

// ===================================
// TIME ATTACK STATE
// ===================================
let timeAttackSessionId = null;
let timeAttackDifficulty = null;
let timeAttackTimeRemaining = 300; // 5 minutes in seconds
let timeAttackTimerInterval = null;
let timeAttackScore = 0;
let timeAttackWins = 0;
let timeAttackGamesPlayed = 0;
let timeAttackCurrentGame = {
    attempts: 0,
    startTime: null
};
let timeAttackGameHistory = [];
let timeAttackDigitCount = 0;

/**
 * Load Daily Challenge Info
 */
async function loadDailyChallengeInfo() {
    try {
        const headers = {};
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch('/api/daily-challenge/info', {
            method: 'GET',
            headers: headers
        });

        const data = await response.json();

        if (response.ok) {
            dailyChallengeInfo = data;

            // Update UI
            document.getElementById('challenge-date').textContent = formatDate(data.challengeDate);
            document.getElementById('challenge-difficulty').textContent = data.difficultyText;
            document.getElementById('challenge-players').textContent = `${data.totalPlayers} player${data.totalPlayers !== 1 ? 's' : ''}`;

            const playBtn = document.getElementById('play-daily-challenge');
            const statusDiv = document.getElementById('daily-challenge-status');

            if (data.alreadyAttempted && data.userAttempt) {
                // User already completed today's challenge
                playBtn.disabled = true;
                playBtn.innerHTML = '<i class="fas fa-check"></i> COMPLETED TODAY';

                statusDiv.style.display = 'block';
                statusDiv.innerHTML = `
                    <h3>✓ Challenge Complete!</h3>
                    <p><strong>Attempts:</strong> ${data.userAttempt.attempts}</p>
                    <p><strong>Time:</strong> ${data.userAttempt.timeDisplay}</p>
                    ${data.userAttempt.won && data.userAttempt.rank ?
                        `<div class="rank-display">🏆 Rank #${data.userAttempt.rank}</div>` :
                        '<p>Better luck tomorrow!</p>'}
                `;
            } else {
                // Can still play
                playBtn.disabled = false;
                playBtn.innerHTML = '<i class="fas fa-play"></i> PLAY NOW';
                statusDiv.style.display = 'none';
            }
        } else {
            console.error('Failed to load daily challenge info:', data.error);
        }
    } catch (error) {
        console.error('Error loading daily challenge info:', error);
    }
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Play Daily Challenge Button Click
 */
async function playDailyChallenge() {
    if (!authToken) {
        showToast('Please log in to play the daily challenge! 🔑', 'info');
        openModalWithAnimation(document.getElementById('auth-modal'));
        return;
    }

    if (!dailyChallengeInfo || dailyChallengeInfo.alreadyAttempted) {
        showToast('You\'ve already completed today\'s challenge! 📅', 'info');
        return;
    }

    console.log('=== Starting Daily Challenge ===');
    console.log('Auth Token:', authToken ? 'Present' : 'Missing');

    try {
        const response = await fetch('/api/daily-challenge/start', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Start response status:', response.status);
        const data = await response.json();
        console.log('Start response data:', data);

        if (response.ok) {
            dailyChallengeSessionId = data.sessionId;
            dailyChallengeDigitCount = data.digitCount;
            console.log('Session created:', dailyChallengeSessionId);
            console.log('Digit count:', dailyChallengeDigitCount);
            startDailyChallengeGame();
        } else {
            console.error('Failed to start:', data.error);
            showToast(data.error || 'Couldn\'t start the daily challenge. Try again! 🎮', 'error');
        }
    } catch (error) {
        console.error('Start error:', error);
        showToast('Couldn\'t start the daily challenge. Check your connection! 🔄', 'error');
    }
}

/**
 * Start Daily Challenge Game
 */
function startDailyChallengeGame() {
    // Reset state
    dailyChallengeAttempts = 0;
    dailyChallengeGuessHistory = [];
    dailyChallengeStartTime = Date.now();

    // Update game status
    updateGameStatus('daily-challenge');

    // Hide home, show daily challenge page
    const homePage = document.getElementById('home-page');
    const dailyChallengePage = document.getElementById('daily-challenge-page');

    fadeOutElement(homePage, () => {
        fadeInElement(dailyChallengePage, 'flex');
    });

    // Create input boxes
    const inputContainer = document.getElementById('daily-input-container');
    inputContainer.innerHTML = '';

    for (let i = 0; i < dailyChallengeDigitCount; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'digit-input';
        input.maxLength = 1;
        input.inputMode = 'numeric';
        input.pattern = '[0-9]';
        input.dataset.index = i;

        input.addEventListener('input', (e) => handleDailyDigitInput(e, i));
        input.addEventListener('keydown', (e) => handleDailyDigitKeydown(e, i));

        inputContainer.appendChild(input);
    }

    // Focus first input
    inputContainer.querySelector('.digit-input').focus();

    // Start timer
    document.getElementById('daily-attempts').textContent = '0';
    startDailyChallengeTimer();

    // Clear history
    document.getElementById('daily-guess-history').innerHTML = '';
}

/**
 * Start Daily Challenge Timer
 */
function startDailyChallengeTimer() {
    dailyChallengeTimerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - dailyChallengeStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;

        // Update timer display (element may not exist if timer was removed)
        const dailyTimerElement = document.getElementById('daily-timer');
        if (dailyTimerElement) {
            dailyTimerElement.textContent =
                `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
    }, 1000);
}

/**
 * Handle Daily Digit Input
 */
function handleDailyDigitInput(e, index) {
    const inputs = document.querySelectorAll('#daily-input-container .digit-input');
    const value = e.target.value;

    if (value && /^\d$/.test(value)) {
        // Valid digit, move to next
        if (index < inputs.length - 1) {
            inputs[index + 1].focus();
        }
    }
}

/**
 * Handle Daily Digit Keydown
 */
function handleDailyDigitKeydown(e, index) {
    const inputs = document.querySelectorAll('#daily-input-container .digit-input');

    if (e.key === 'Backspace' && !e.target.value && index > 0) {
        inputs[index - 1].focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
        inputs[index - 1].focus();
    } else if (e.key === 'ArrowRight' && index < inputs.length - 1) {
        inputs[index + 1].focus();
    } else if (e.key === 'Enter') {
        submitDailyGuess();
    }
}

/**
 * Submit Daily Challenge Guess
 */
async function submitDailyGuess() {
    const inputs = document.querySelectorAll('#daily-input-container .digit-input');
    const guess = Array.from(inputs).map(input => input.value).join('');

    // Validation
    if (guess.length !== dailyChallengeDigitCount) {
        showToast('Please fill in all digit boxes to make your guess! 🎯', 'info');
        return;
    }

    // Check for unique digits
    const uniqueDigits = new Set(guess);
    if (uniqueDigits.size !== guess.length) {
        showToast('Oops! Each digit must be different. Try again! 🔢', 'error');
        return;
    }

    // Debug logging
    console.log('=== Daily Challenge Guess Debug ===');
    console.log('Session ID:', dailyChallengeSessionId);
    console.log('Auth Token:', authToken ? 'Present' : 'Missing');
    console.log('Guess:', guess);
    console.log('Digit Count:', dailyChallengeDigitCount);

    try {
        const response = await fetch('/api/daily-challenge/guess', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: dailyChallengeSessionId,
                guess: guess
            })
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);

        if (response.ok) {
            dailyChallengeAttempts = data.attempts;
            document.getElementById('daily-attempts').textContent = dailyChallengeAttempts;

            // Add to history
            addDailyGuessToHistory(guess, data.bulls, data.cows);

            // No feedback display - guess history shows the info

            // Play sound
            if (data.won) {
                if (soundVolume > 0) winSound.play();
            } else {
                if (soundVolume > 0) incorrectSound.play();
            }

            // Clear inputs
            inputs.forEach(input => input.value = '');
            inputs[0].focus();

            // Check if won or lost
            if (data.won || dailyChallengeAttempts >= GAME_CONFIG.MAX_ATTEMPTS) {
                setTimeout(() => endDailyChallenge(data.won), 1500);
            }
        } else {
            console.error('Server error:', data.error);
            showToast(data.error || 'Hmm, couldn\'t submit that guess. Try again! 🔄', 'error');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        showToast('Hmm, couldn\'t submit that guess. Check your connection and try again! 🔄', 'error');
    }
}

/**
 * Add Daily Guess to History
 */
function addDailyGuessToHistory(guess, bulls, cows) {
    dailyChallengeGuessHistory.push({ guess, bulls, cows });

    const historyDiv = document.getElementById('daily-guess-history');
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item new-item';

    const guessSpan = document.createElement('span');
    guessSpan.className = 'guess';
    guessSpan.textContent = guess;

    const correctSpan = document.createElement('span');
    correctSpan.className = 'correct';
    correctSpan.textContent = `🐂 Correct: ${bulls}`;

    const misplacedSpan = document.createElement('span');
    misplacedSpan.className = 'misplaced';
    misplacedSpan.textContent = `🐄 Misplaced: ${cows}`;

    historyItem.appendChild(guessSpan);
    historyItem.appendChild(correctSpan);
    historyItem.appendChild(misplacedSpan);

    historyDiv.insertBefore(historyItem, historyDiv.firstChild);
}

/**
 * End Daily Challenge
 */
async function endDailyChallenge(won) {
    // Stop timer
    clearInterval(dailyChallengeTimerInterval);

    const timeTakenSeconds = Math.floor((Date.now() - dailyChallengeStartTime) / 1000);
    const minutes = Math.floor(timeTakenSeconds / 60);
    const seconds = timeTakenSeconds % 60;
    const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    try {
        const response = await fetch('/api/daily-challenge/end', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: dailyChallengeSessionId,
                won: won,
                timeTakenSeconds: timeTakenSeconds,
                timeDisplay: timeDisplay
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Update coins and show animation if won
            if (won && data.coinsAwarded && data.coinsAwarded > 0 && currentUser) {
                currentUser.coins = data.totalCoins || (currentUser.coins + data.coinsAwarded);
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                showCoinAnimation(data.coinsAwarded);
            }

            showDailyChallengeResult(won, dailyChallengeAttempts, timeDisplay, data.rank, data.totalPlayers);

            // Reload daily challenge info for home page (don't await - run in background)
            loadDailyChallengeInfo();
        } else {
            showToast(data.error || 'Couldn\'t save your result. Try refreshing! 💾', 'error');
        }
    } catch (error) {
        showToast('Couldn\'t save your result. Try refreshing! 💾', 'error');
    }
}

/**
 * Show Daily Challenge Result
 */
function showDailyChallengeResult(won, attempts, timeDisplay, rank, totalPlayers) {
    // Update game status
    updateGameStatus('result');

    const dailyChallengePage = document.getElementById('daily-challenge-page');
    const dailyResultPage = document.getElementById('daily-result-page');

    fadeOutElement(dailyChallengePage, () => {
        const statsContainer = document.getElementById('daily-game-stats');
        statsContainer.textContent = '';

        // Hero Section - Win/Loss Status (same style as Regular/Time Attack)
        const heroSection = document.createElement('div');
        heroSection.style.cssText = 'text-align: center; margin-bottom: 25px;';

        if (won) {
            heroSection.innerHTML = `
                <div style="background: linear-gradient(135deg, #52c98c 0%, #4ea8de 100%); padding: 25px; border-radius: 20px; box-shadow: 0 8px 24px rgba(82, 201, 140, 0.3);">
                    <div style="font-size: 2.5em; margin-bottom: 10px;">🏆</div>
                    <div style="font-size: 2em; font-weight: 800; color: white; line-height: 1.2;">COMPLETE!</div>
                    <div style="font-size: 1.2em; color: rgba(255,255,255,0.9); margin-top: 8px;">${attempts} ${attempts === 1 ? 'Attempt' : 'Attempts'}</div>
                    <div style="font-size: 0.85em; color: rgba(255,255,255,0.8); margin-top: 5px;">Daily Challenge</div>
                </div>
            `;
            createConfetti();
        } else {
            heroSection.innerHTML = `
                <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); padding: 25px; border-radius: 20px; box-shadow: 0 8px 24px rgba(231, 76, 60, 0.3);">
                    <div style="font-size: 2.5em; margin-bottom: 10px;">😔</div>
                    <div style="font-size: 2em; font-weight: 800; color: white; line-height: 1.2;">NOT TODAY</div>
                    <div style="font-size: 1.2em; color: rgba(255,255,255,0.9); margin-top: 8px;">Out of attempts</div>
                    <div style="font-size: 0.85em; color: rgba(255,255,255,0.8); margin-top: 5px;">Daily Challenge</div>
                </div>
            `;
        }
        statsContainer.appendChild(heroSection);

        // Stats Grid - 2x2 Cards (same style as Regular/Time Attack)
        const statsGrid = document.createElement('div');
        statsGrid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px;';

        const createStatCard = (icon, value, label) => {
            const card = document.createElement('div');
            card.style.cssText = `
                background: rgba(167, 139, 250, 0.1);
                padding: 18px;
                border-radius: 12px;
                text-align: center;
                border: 1px solid rgba(167, 139, 250, 0.2);
            `;
            card.innerHTML = `
                <i class="${icon}" style="font-size: 2em; color: var(--primary-color); margin-bottom: 8px;"></i>
                <div style="font-size: 1.8em; font-weight: 700; color: var(--text-color); line-height: 1.2;">${value}</div>
                <div style="font-size: 0.75em; color: var(--text-secondary); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">${label}</div>
            `;
            return card;
        };

        // Add stat cards
        statsGrid.appendChild(createStatCard('fas fa-stopwatch', timeDisplay, 'Time'));
        statsGrid.appendChild(createStatCard('fas fa-bullseye', `${attempts}/10`, 'Attempts'));

        // Rank card (with medal emoji)
        if (rank) {
            const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '📊';
            statsGrid.appendChild(createStatCard('fas fa-ranking-star', `${rankEmoji} #${rank}`, 'Rank'));
        }

        // Total players card
        if (totalPlayers) {
            statsGrid.appendChild(createStatCard('fas fa-users', totalPlayers, 'Players'));
        }

        statsContainer.appendChild(statsGrid);

        fadeInElement(dailyResultPage);
    });
}

/**
 * Load Daily Challenge Leaderboard
 */
async function loadDailyLeaderboard() {
    const modal = document.getElementById('daily-leaderboard-modal');
    const loadingDiv = document.getElementById('modal-daily-leaderboard-loading');
    const contentDiv = document.getElementById('modal-daily-leaderboard-content');
    const dateDiv = document.getElementById('daily-leaderboard-date');

    loadingDiv.style.display = 'block';
    contentDiv.style.display = 'none';

    try {
        const response = await fetch('/api/daily-challenge/leaderboard?limit=100');
        const data = await response.json();

        if (response.ok && Array.isArray(data)) {
            // Update date
            if (dailyChallengeInfo) {
                dateDiv.textContent = `📅 ${formatDate(dailyChallengeInfo.challengeDate)}`;
            }

            if (data.length === 0) {
                contentDiv.innerHTML = '<div class="no-data">No one has completed today\'s challenge yet. Be the first! 🏆</div>';
            } else {
                let tableHTML = `
                    <table class="leaderboard-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Player</th>
                                <th>Attempts</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                data.forEach(entry => {
                    const isCurrentUser = currentUser && entry.username === currentUser.username;
                    const rowClass = isCurrentUser ? 'leaderboard-row current-user' : 'leaderboard-row';

                    tableHTML += `
                        <tr class="${rowClass}">
                            <td>${getRankDisplay(entry.rank)}</td>
                            <td>${entry.username}${isCurrentUser ? ' (You)' : ''}</td>
                            <td>${entry.attempts}</td>
                            <td>${entry.timeDisplay}</td>
                        </tr>
                    `;
                });

                tableHTML += `
                        </tbody>
                    </table>
                `;

                contentDiv.innerHTML = tableHTML;
            }

            loadingDiv.style.display = 'none';
            contentDiv.style.display = 'block';
        } else {
            contentDiv.innerHTML = '<div class="error-message">Couldn\'t load the leaderboard. Try again in a moment! 🏆</div>';
            loadingDiv.style.display = 'none';
            contentDiv.style.display = 'block';
        }
    } catch (error) {
        contentDiv.innerHTML = '<div class="error-message">Couldn\'t load the leaderboard. Try again in a moment! 🏆</div>';
        loadingDiv.style.display = 'none';
        contentDiv.style.display = 'block';
    }

    openModalWithAnimation(modal);
}

/**
 * Get Rank Display with Medal Emojis
 */
function getRankDisplay(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
}

/**
 * Quit Daily Challenge
 */
function quitDailyChallenge() {
    if (confirm('Are you sure you want to quit? You can only attempt the daily challenge once per day!')) {
        clearInterval(dailyChallengeTimerInterval);

        const dailyChallengePage = document.getElementById('daily-challenge-page');
        const homePage = document.getElementById('home-page');

        fadeOutElement(dailyChallengePage, () => {
            fadeInElement(homePage, 'flex');
        });

        // Note: We don't save the attempt as they're quitting
        dailyChallengeSessionId = null;
    }
}

// ===================================
// DAILY CHALLENGE EVENT LISTENERS
// ===================================

document.getElementById('play-daily-challenge')?.addEventListener('click', playDailyChallenge);

document.getElementById('view-daily-leaderboard')?.addEventListener('click', loadDailyLeaderboard);

document.getElementById('view-daily-results-leaderboard')?.addEventListener('click', loadDailyLeaderboard);

document.getElementById('submit-daily-guess')?.addEventListener('click', submitDailyGuess);

document.getElementById('quit-daily-challenge')?.addEventListener('click', quitDailyChallenge);

document.getElementById('quit-daily-result')?.addEventListener('click', () => {
    const dailyResultPage = document.getElementById('daily-result-page');
    const homePage = document.getElementById('home-page');

    fadeOutElement(dailyResultPage, () => {
        updateGameStatus('home');
        fadeInElement(homePage, 'flex');
    });
});

document.getElementById('daily-leaderboard-modal-close')?.addEventListener('click', () => {
    closeModalWithAnimation(document.getElementById('daily-leaderboard-modal'));
});

// Load daily challenge info when page loads (if user navigates to home)
if (document.getElementById('home-page').style.display !== 'none') {
    loadDailyChallengeInfo();
}

// ===================================
// TIME ATTACK FUNCTIONALITY
// ===================================

/**
 * Start Time Attack Session
 */
async function startTimeAttackSession(difficulty) {
    // Guest warning
    if (!authToken) {
        const proceed = confirm("You're playing as guest. Your score won't be saved to the leaderboard. Continue?");
        if (!proceed) return;
    }

    try {
        const headers = { 'Content-Type': 'application/json' };
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`/api/time-attack/start?difficulty=${difficulty}`, {
            method: 'POST',
            headers: headers
        });

        if (!response.ok) {
            throw new Error('Failed to start Time Attack session');
        }

        const data = await response.json();

        if (data.sessionId) {
            timeAttackSessionId = data.sessionId;
            timeAttackDifficulty = difficulty;
            timeAttackDigitCount = data.digitCount;
            timeAttackTimeRemaining = 300;
            timeAttackScore = 0;
            timeAttackWins = 0;
            timeAttackGamesPlayed = 0;
            timeAttackGameHistory = [];
            timeAttackCurrentGame = { attempts: 0, startTime: Date.now() };

            // Update game status
            updateGameStatus('time-attack');

            // Show time attack page
            const homePage = document.getElementById('home-page');
            const resultPage = document.getElementById('time-attack-result-page');
            const timeAttackPage = document.getElementById('time-attack-page');

            // Hide whichever page is currently visible
            if (homePage.style.display !== 'none') {
                fadeOutElement(homePage, () => {
                    fadeInElement(timeAttackPage, 'flex');
                });
            } else if (resultPage.style.display !== 'none') {
                fadeOutElement(resultPage, () => {
                    fadeInElement(timeAttackPage, 'flex');
                });
            } else {
                fadeInElement(timeAttackPage, 'flex');
            }

            // Setup input fields for first game
            createDigitInputs('ta-input-container', timeAttackDigitCount);

            // Start countdown timer
            startTimeAttackTimer();

            // Update UI
            document.getElementById('ta-score').textContent = '0';
            document.getElementById('ta-wins').textContent = '0';
            document.getElementById('ta-guess-history').innerHTML = '';
            document.getElementById('ta-feedback').textContent = '';

            // Focus first input
            document.querySelector('#ta-input-container .digit-input')?.focus();
        }
    } catch (error) {
        console.error('Failed to start Time Attack:', error);
        showToast('Failed to start Time Attack. Try again!', 'error');
    }
}

/**
 * Countdown Timer for Time Attack
 */
function startTimeAttackTimer() {
    const timerElement = document.getElementById('ta-timer');
    const timerBadge = document.getElementById('ta-timer-badge');

    timeAttackTimerInterval = setInterval(() => {
        timeAttackTimeRemaining--;

        const minutes = Math.floor(timeAttackTimeRemaining / 60);
        const seconds = timeAttackTimeRemaining % 60;
        timerElement.textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;

        // Visual warning when < 30 seconds
        if (timeAttackTimeRemaining <= 30 && timeAttackTimeRemaining > 10) {
            timerBadge.classList.add('timer-warning');
            timerBadge.classList.remove('timer-critical');
        }

        // Visual critical when < 10 seconds
        if (timeAttackTimeRemaining <= 10) {
            timerBadge.classList.add('timer-critical');
            timerBadge.classList.remove('timer-warning');
        }

        // Time's up!
        if (timeAttackTimeRemaining <= 0) {
            clearInterval(timeAttackTimerInterval);
            endTimeAttackSession();
        }
    }, 1000);
}

/**
 * Start New Game Within Session (after winning previous game)
 */
async function startTimeAttackGame() {
    try {
        const response = await fetch(`/api/time-attack/start-game?sessionId=${timeAttackSessionId}`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error('Failed to start new game');
        }

        const data = await response.json();

        if (data.expired) {
            endTimeAttackSession();
            return;
        }

        // Reset current game state
        timeAttackCurrentGame = {
            attempts: 0,
            startTime: Date.now()
        };

        // Clear inputs, feedback, and guess history
        const inputs = document.querySelectorAll('#ta-input-container .digit-input');
        inputs.forEach(input => input.value = '');
        document.getElementById('ta-feedback').textContent = '';
        document.getElementById('ta-guess-history').innerHTML = '';

        // Focus first input
        inputs[0]?.focus();

    } catch (error) {
        console.error('Failed to start new game:', error);
        showToast('Failed to start new game', 'error');
    }
}

/**
 * Submit Guess in Time Attack
 */
async function submitTimeAttackGuess() {
    const inputs = document.querySelectorAll('#ta-input-container .digit-input');
    const guess = Array.from(inputs).map(input => input.value).join('');

    // Validation
    if (guess.length !== timeAttackDigitCount) {
        showToast(`Please enter all ${timeAttackDigitCount} digits! 🔢`, 'error');
        return;
    }

    // Check for unique digits
    const uniqueDigits = new Set(guess);
    if (uniqueDigits.size !== guess.length) {
        showToast('Oops! Each digit must be different. Try again! 🔢', 'error');
        return;
    }

    timeAttackCurrentGame.attempts++;

    try {
        const response = await fetch('/api/time-attack/guess', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: timeAttackSessionId,
                guess: guess
            })
        });

        if (!response.ok) {
            throw new Error('Failed to submit guess');
        }

        const data = await response.json();

        if (data.expired) {
            endTimeAttackSession();
            return;
        }

        if (data.won) {
            // Calculate game time
            const gameTimeMs = Date.now() - timeAttackCurrentGame.startTime;
            const gameTimeSeconds = Math.floor(gameTimeMs / 1000);

            // Show win feedback
            showTimeAttackWinFeedback(data.points, timeAttackCurrentGame.attempts, gameTimeSeconds);

            // Update session stats
            timeAttackScore = data.totalScore;
            timeAttackWins = data.gamesWon;
            timeAttackGamesPlayed++;

            // Record game result
            timeAttackGameHistory.push({
                won: true,
                attempts: timeAttackCurrentGame.attempts,
                timeSeconds: gameTimeSeconds,
                points: data.points
            });

            // Update UI
            document.getElementById('ta-score').textContent = timeAttackScore;
            document.getElementById('ta-wins').textContent = timeAttackWins;

            // Show coin animation (coins per win based on difficulty)
            if (currentUser) {
                const coinsPerWin = timeAttackDifficulty === 0 ? 3 : timeAttackDifficulty === 1 ? 6 : 9;
                // Update local coin count
                currentUser.coins = (currentUser.coins || 0) + coinsPerWin;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                // Show animation
                showCoinAnimation(coinsPerWin);
            }

            // Play sound
            if (soundVolume > 0) winSound.play();

            // Start next game after 2 seconds
            setTimeout(() => {
                startTimeAttackGame();
            }, 2000);

        } else {
            // Add to guess history
            addToTimeAttackGuessHistory(guess, data.bulls, data.cows);

            // No feedback display - guess history shows the info (removed for faster gameplay)

            // Clear inputs for next guess
            inputs.forEach(input => input.value = '');
            inputs[0]?.focus();

            // Play sound
            if (soundVolume > 0) incorrectSound.play();
        }

    } catch (error) {
        console.error('Failed to submit guess:', error);
        showToast('Failed to submit guess. Try again!', 'error');
    }
}

/**
 * Show win feedback animation
 */
function showTimeAttackWinFeedback(coins, attempts, timeSeconds) {
    const feedbackElement = document.getElementById('ta-feedback');
    feedbackElement.innerHTML = `
        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #52c98c 0%, #4ea8de 100%); border-radius: 15px; color: white; animation: tada 0.5s;">
            <h3 style="margin: 0 0 10px 0;">🎉 CORRECT!</h3>
            <p style="font-size: 2em; font-weight: bold; margin: 10px 0;">+${coins} <i class="fas fa-coins" style="color: #ffd700;"></i></p>
            <p style="font-size: 0.9em; opacity: 0.9;">${attempts} attempts • ${timeSeconds}s</p>
        </div>
    `;

    createConfetti();
}

/**
 * Add guess to Time Attack history display (like regular game)
 */
function addToTimeAttackGuessHistory(guess, bulls, cows) {
    const historyContainer = document.getElementById('ta-guess-history');

    const historyItem = document.createElement('div');
    historyItem.className = 'history-item new-item';

    const guessSpan = document.createElement('span');
    guessSpan.className = 'guess';
    guessSpan.textContent = guess;

    const correctSpan = document.createElement('span');
    correctSpan.className = 'correct';
    correctSpan.textContent = `🐂 Correct: ${bulls}`;

    const misplacedSpan = document.createElement('span');
    misplacedSpan.className = 'misplaced';
    misplacedSpan.textContent = `🐄 Misplaced: ${cows}`;

    historyItem.appendChild(guessSpan);
    historyItem.appendChild(correctSpan);
    historyItem.appendChild(misplacedSpan);

    historyContainer.insertBefore(historyItem, historyContainer.firstChild);
}

/**
 * End Time Attack Session
 */
async function endTimeAttackSession() {
    clearInterval(timeAttackTimerInterval);

    try {
        const headers = { 'Content-Type': 'application/json' };
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`/api/time-attack/end?sessionId=${timeAttackSessionId}`, {
            method: 'POST',
            headers: headers
        });

        if (!response.ok) {
            throw new Error('Failed to end session');
        }

        const data = await response.json();

        // Update coins and show animation if earned
        if (data.coinsAwarded && data.coinsAwarded > 0 && currentUser) {
            currentUser.coins = data.totalCoins || (currentUser.coins + data.coinsAwarded);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showCoinAnimation(data.coinsAwarded);
        }

        // Show results page
        displayTimeAttackResults(data);

        const timeAttackPage = document.getElementById('time-attack-page');
        const resultPage = document.getElementById('time-attack-result-page');

        fadeOutElement(timeAttackPage, () => {
            fadeInElement(resultPage, 'flex');
        });

    } catch (error) {
        console.error('Failed to end session:', error);
        showToast('Failed to save session', 'error');

        // Still show results even if save failed
        const data = {
            totalScore: timeAttackScore,
            gamesWon: timeAttackWins,
            gamesPlayed: timeAttackGamesPlayed,
            gameDetails: timeAttackGameHistory
        };
        displayTimeAttackResults(data);

        const timeAttackPage = document.getElementById('time-attack-page');
        const resultPage = document.getElementById('time-attack-result-page');

        fadeOutElement(timeAttackPage, () => {
            fadeInElement(resultPage, 'flex');
        });
    }
}

/**
 * Display Time Attack Results - Modern Card-Based Design
 */
function displayTimeAttackResults(data) {
    // Update game status
    updateGameStatus('result');

    const statsContainer = document.getElementById('time-attack-stats');
    statsContainer.textContent = '';

    // Helper to format time
    const formatTime = (seconds) => {
        if (!seconds) return '--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Hero Section - Big Coins Earned
    const heroSection = document.createElement('div');
    heroSection.style.cssText = 'text-align: center; margin-bottom: 30px;';
    heroSection.innerHTML = `
        <h2 style="color: var(--primary-color); margin: 0 0 15px 0; font-size: 1.2em;">⚡ CHALLENGE COMPLETE</h2>
        <div style="background: linear-gradient(135deg, #ffca28 0%, #ffa726 100%); padding: 25px; border-radius: 20px; margin-bottom: 15px; box-shadow: 0 8px 24px rgba(255, 202, 40, 0.3);">
            <div style="font-size: 3.5em; font-weight: 800; color: #2c3e50; line-height: 1;">
                ${data.totalScore || 0} <i class="fas fa-coins" style="font-size: 0.8em; color: #ff8f00;"></i>
            </div>
            <div style="font-size: 0.9em; color: #5d4e37; margin-top: 8px; font-weight: 600;">COINS EARNED</div>
        </div>
    `;
    statsContainer.appendChild(heroSection);

    // Stats Grid - 2x2 Cards
    const statsGrid = document.createElement('div');
    statsGrid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 25px;';

    const createStatCard = (icon, value, label, highlight = false) => {
        const card = document.createElement('div');
        const bgColor = highlight ? 'linear-gradient(135deg, #52c98c 0%, #4ea8de 100%)' : 'rgba(167, 139, 250, 0.1)';
        const textColor = highlight ? '#fff' : 'var(--text-color)';
        card.style.cssText = `background: ${bgColor}; padding: 18px; border-radius: 12px; text-align: center; border: 1px solid rgba(167, 139, 250, 0.2);`;
        card.innerHTML = `
            <i class="${icon}" style="font-size: 2em; color: ${highlight ? '#fff' : 'var(--primary-color)'}; margin-bottom: 8px;"></i>
            <div style="font-size: 1.8em; font-weight: 700; color: ${textColor}; line-height: 1.2;">${value}</div>
            <div style="font-size: 0.75em; color: ${highlight ? 'rgba(255,255,255,0.9)' : 'var(--text-secondary)'}; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">${label}</div>
        `;
        return card;
    };

    // Add stat cards
    const gamesWon = data.gamesWon || 0;
    const avgAttempts = data.averageAttempts ? data.averageAttempts.toFixed(1) : '--';
    const fastestTime = formatTime(data.fastestWinSeconds);

    statsGrid.appendChild(createStatCard('fas fa-trophy', gamesWon, 'Wins', gamesWon > 0));
    statsGrid.appendChild(createStatCard('fas fa-tachometer-alt', avgAttempts, 'Avg Tries'));
    statsGrid.appendChild(createStatCard('fas fa-bolt', fastestTime, 'Best Time'));

    // Leaderboard rank card (if available)
    if (data.rank && authToken) {
        const rankEmoji = data.rank === 1 ? '🥇' : data.rank === 2 ? '🥈' : data.rank === 3 ? '🥉' : '📊';
        const isTopThree = data.rank <= 3;
        const rankCard = createStatCard('fas fa-ranking-star', `${rankEmoji} #${data.rank}`, 'Rank', isTopThree);
        statsGrid.appendChild(rankCard);
    } else {
        // Games played card
        const gamesPlayed = data.gamesPlayed || 0;
        statsGrid.appendChild(createStatCard('fas fa-gamepad', gamesPlayed, 'Played'));
    }

    statsContainer.appendChild(statsGrid);

    // Game History - Compact Cards
    if (data.gameDetails && data.gameDetails.length > 0) {
        const historySection = document.createElement('div');
        historySection.style.cssText = 'margin-top: 25px;';

        const historyTitle = document.createElement('h3');
        historyTitle.textContent = '📋 Game Breakdown';
        historyTitle.style.cssText = 'font-size: 1em; margin: 0 0 12px 0; color: var(--text-color);';
        historySection.appendChild(historyTitle);

        const gamesContainer = document.createElement('div');
        gamesContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px; max-height: 180px; overflow-y: auto;';

        data.gameDetails.forEach((game, index) => {
            const gameCard = document.createElement('div');
            const difficultyColors = ['#52c98c', '#f39c12', '#e74c3c'];
            const difficultyNames = ['EASY', 'MED', 'HARD'];
            const diffColor = difficultyColors[timeAttackDifficulty] || '#52c98c';

            gameCard.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 16px;
                background: rgba(167, 139, 250, 0.08);
                border-radius: 10px;
                border-left: 4px solid ${diffColor};
            `;

            gameCard.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="background: ${diffColor}; color: white; padding: 4px 8px; border-radius: 6px; font-size: 0.7em; font-weight: 700;">${difficultyNames[timeAttackDifficulty]}</div>
                    <div style="font-size: 0.9em; color: var(--text-secondary);">
                        <i class="fas fa-bullseye"></i> ${game.attempts} tries  •  <i class="fas fa-clock"></i> ${formatTime(game.timeSeconds)}
                    </div>
                </div>
                <div style="font-weight: 700; color: #ffa726; font-size: 1em;">+${game.points} <i class="fas fa-coins" style="font-size: 0.9em;"></i></div>
            `;

            gamesContainer.appendChild(gameCard);
        });

        historySection.appendChild(gamesContainer);
        statsContainer.appendChild(historySection);
    }
}

/**
 * Load Time Attack Leaderboard
 */
async function loadTimeAttackLeaderboard(difficulty = 0) {
    const modal = document.getElementById('time-attack-leaderboard-modal');
    const loadingDiv = document.getElementById('ta-leaderboard-loading');
    const contentDiv = document.getElementById('ta-leaderboard-content');

    // Check if modal is already open (before we start loading)
    const isAlreadyOpen = modal.style.display === 'flex';

    // Show loading state
    loadingDiv.style.display = 'block';
    contentDiv.style.display = 'none';

    try {
        const response = await fetch(`/api/time-attack/leaderboard/${difficulty}?limit=50`);

        if (!response.ok) {
            throw new Error('Failed to load leaderboard');
        }

        const leaderboard = await response.json();

        // Hide loading, show content
        loadingDiv.style.display = 'none';
        contentDiv.style.display = 'block';

        if (leaderboard.length === 0) {
            contentDiv.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--text-secondary);">No players yet. Be the first!</p>';
        } else {
            // Create leaderboard table
            let html = `
                <div class="leaderboard-table">
                    <div class="leaderboard-header">
                        <div class="lb-rank">Rank</div>
                        <div class="lb-username">Player</div>
                        <div class="lb-score">Score</div>
                        <div class="lb-wins">Wins</div>
                        <div class="lb-avg">Avg</div>
                    </div>
            `;

            leaderboard.forEach((entry, index) => {
                const rankClass = index < 3 ? `top-${index + 1}` : '';
                html += `
                    <div class="leaderboard-row ${rankClass}">
                        <div class="lb-rank">#${entry.rank}</div>
                        <div class="lb-username">${entry.username}</div>
                        <div class="lb-score">${entry.totalScore}</div>
                        <div class="lb-wins">${entry.gamesWon}</div>
                        <div class="lb-avg">${entry.averageAttempts ? entry.averageAttempts.toFixed(1) : '--'}</div>
                    </div>
                `;
            });

            html += '</div>';
            contentDiv.innerHTML = html;
        }

    } catch (error) {
        console.error('Failed to load leaderboard:', error);
        loadingDiv.style.display = 'none';
        contentDiv.style.display = 'block';
        contentDiv.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--danger-color);">Failed to load leaderboard</p>';
    }

    // Only animate modal opening if it wasn't already open
    // This prevents re-animation when switching tabs
    if (!isAlreadyOpen) {
        openModalWithAnimation(modal);
    }
}

/**
 * Helper function to create digit inputs
 */
function createDigitInputs(containerId, digitCount) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    for (let i = 0; i < digitCount; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'digit-input';
        input.maxLength = 1;
        input.inputMode = 'numeric';
        input.pattern = '[0-9]';
        input.dataset.index = i;

        input.addEventListener('input', (e) => handleDigitInput(e, i, containerId));
        input.addEventListener('keydown', (e) => handleDigitKeydown(e, i, containerId));

        container.appendChild(input);
    }
}

/**
 * Handle digit input
 */
function handleDigitInput(e, index, containerId) {
    const input = e.target;
    const value = input.value;

    // Only allow digits
    if (!/^\d$/.test(value)) {
        input.value = '';
        return;
    }

    // Move to next input
    const nextInput = document.querySelector(`#${containerId} .digit-input[data-index="${index + 1}"]`);
    if (nextInput) {
        nextInput.focus();
        nextInput.select();
    }
}

/**
 * Handle digit keydown
 */
function handleDigitKeydown(e, index, containerId) {
    if (e.key === 'Backspace' && e.target.value === '') {
        // Move to previous input on backspace
        const prevInput = document.querySelector(`#${containerId} .digit-input[data-index="${index - 1}"]`);
        if (prevInput) {
            prevInput.focus();
            prevInput.select();
        }
    } else if (e.key === 'Enter') {
        // Submit guess on Enter
        if (containerId === 'ta-input-container') {
            submitTimeAttackGuess();
        }
    }
}

// ===================================
// TIME ATTACK EVENT LISTENERS
// ===================================

// Difficulty selection buttons
document.querySelectorAll('.ta-difficulty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const difficulty = parseInt(btn.dataset.difficulty);
        startTimeAttackSession(difficulty);
    });
});

// Submit guess
document.getElementById('submit-ta-guess')?.addEventListener('click', submitTimeAttackGuess);

// Quit time attack
document.getElementById('quit-time-attack')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to end this session? Your current score will be saved.')) {
        endTimeAttackSession();
    }
});

// Result page buttons
document.getElementById('ta-play-again')?.addEventListener('click', () => {
    startTimeAttackSession(timeAttackDifficulty);
});

document.getElementById('ta-main-menu')?.addEventListener('click', () => {
    const resultPage = document.getElementById('time-attack-result-page');
    const homePage = document.getElementById('home-page');

    fadeOutElement(resultPage, () => {
        updateGameStatus('home');
        fadeInElement(homePage, 'flex');
    });
});

// Leaderboard modal buttons
document.getElementById('view-time-attack-leaderboard')?.addEventListener('click', () => {
    loadTimeAttackLeaderboard(0); // Default to Easy
});

document.getElementById('ta-leaderboard-close')?.addEventListener('click', () => {
    const modal = document.getElementById('time-attack-leaderboard-modal');
    closeModalWithAnimation(modal);
});

// Leaderboard difficulty tabs
document.querySelectorAll('#time-attack-leaderboard-modal .lb-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // Update active tab
        document.querySelectorAll('#time-attack-leaderboard-modal .lb-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Load leaderboard for selected difficulty
        const difficulty = parseInt(tab.dataset.difficulty);
        loadTimeAttackLeaderboard(difficulty);
    });
});

// Close modal when clicking outside
document.getElementById('time-attack-leaderboard-modal')?.addEventListener('click', (e) => {
    const modal = document.getElementById('time-attack-leaderboard-modal');
    if (e.target === modal) {
        closeModalWithAnimation(modal);
    }
});
