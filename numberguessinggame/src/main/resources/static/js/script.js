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
    updateGameStatus('welcome');
    showHomePage();
    setupKeyboardShortcuts(); // Initialize keyboard shortcuts
    setupHowToPlay(); // Initialize How to Play toggle
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
    // Sound toggle moved to settings modal - handled by setupSettingsModal()
}

/**
 * Setup How to Play collapsible section in Settings
 */
function setupHowToPlay() {
    const howToPlayToggle = document.getElementById('how-to-play-toggle');
    const howToPlayContent = document.getElementById('how-to-play-content');

    if (howToPlayToggle && howToPlayContent) {
        howToPlayToggle.addEventListener('click', function() {
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

    // Clear any existing timer to prevent race conditions
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    updateGamePage();
    startTimer();
    updateGameStatus('playing');

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

    const inputs = document.getElementsByClassName('digit-input');
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

                // Check for newly unlocked achievements
                if (data.newAchievements && data.newAchievements.length > 0) {
                    // Show achievement notifications
                    showAchievementNotifications(data.newAchievements);
                }

                endGame(true);
            } else {
                if (soundVolume > 0) incorrectSound.play();
                displayFeedback(data.correctPosition, data.correctButWrongPosition);
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
        correctSpan.textContent = `Correct: ${entry.correctPosition}`;

        const misplacedSpan = document.createElement('span');
        misplacedSpan.className = 'misplaced';
        misplacedSpan.textContent = `Misplaced: ${entry.correctButWrongPosition}`;

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
        correctSpan.textContent = `Correct: ${entry.correctPosition}`;

        const misplacedSpan = document.createElement('span');
        misplacedSpan.className = 'misplaced';
        misplacedSpan.textContent = `Misplaced: ${entry.correctButWrongPosition}`;

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
    document.getElementById('timer').textContent = timeString;

    // Update circular progress bar
    const totalSeconds = elapsedTime.getTime() / 1000;
    const maxSeconds = TIMER_CONFIG.MAX_SECONDS;
    const progress = (totalSeconds / maxSeconds) * TIMER_CONFIG.SVG_CIRCUMFERENCE;
    const timerProgress = document.querySelector('.timer-progress');
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

function endGame(won) {
    clearInterval(timerInterval);
    const time = document.getElementById('timer').textContent;
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
        }).catch(() => {});
    }

    // Prepare stats content
    const statsContainer = document.getElementById('game-stats');
    statsContainer.textContent = '';

    const createStatItem = (iconClass, text) => {
        const div = document.createElement('div');
        div.className = 'stat-item';
        div.innerHTML = `<i class="${iconClass}"></i>`;
        const span = document.createElement('span');
        span.textContent = text;
        div.appendChild(span);
        return div;
    };

    statsContainer.appendChild(createStatItem('fas fa-stopwatch', `Time Taken: ${time}`));
    statsContainer.appendChild(createStatItem('fas fa-chart-line', `Attempts: ${attempts}/${GAME_CONFIG.MAX_ATTEMPTS}`));
    statsContainer.appendChild(createStatItem('fas fa-tachometer-alt', `Avg. Time per Guess: ${calculateAverageGuessTime(time, attempts)}`));
    statsContainer.appendChild(createStatItem('fas fa-trophy', `Best Score: ${bestScore}`));
    statsContainer.appendChild(createStatItem('fas fa-chart-bar', `Comparison to Best: ${compareToaBestScore(attempts)}`));

    if (won) {
        createConfetti();
        updateBestScore(attempts);
        addToRecentScores(currentDifficulty, attempts, time);
        // Animate stats with count-up on win
        animateResultStats(time, attempts);
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
    updateGameStatus('welcome');

    const homePage = document.getElementById('home-page');
    const gamePage = document.getElementById('game-page');
    const resultPage = document.getElementById('result-page');

    // Fade out current page
    const currentPage = gamePage.style.display !== 'none' ? gamePage :
                        resultPage.style.display !== 'none' ? resultPage : null;

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
        updateStreakStats();
        loadLeaderboard(gameJustCompleted);
        gameJustCompleted = false;
    }
}

function quitGame() {
    if (confirm("Are you sure you want to quit? Your progress will be lost.")) {
        clearInterval(timerInterval);
        resetGameState();
        showHomePage();
    }
}

function resetGameState() {
    attempts = 0;
    guessHistory = [];
    document.getElementById('timer').textContent = '00:00';
    document.getElementById('attempts').textContent = '0';
    document.getElementById('feedback').textContent = '';
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
        case 'welcome':
            statusIcon.innerHTML = '<i class="fas fa-dice"></i>';
            statusText.textContent = 'Welcome to NumVana!';
            break;
        case 'playing':
            statusIcon.innerHTML = '<i class="fas fa-brain"></i>';
            statusText.textContent = 'Game in Progress - Good Luck!';
            break;
        case 'won':
            statusIcon.innerHTML = '<i class="fas fa-trophy"></i>';
            statusText.textContent = 'Congratulations! You Won!';
            break;
        case 'lost':
            statusIcon.innerHTML = '<i class="fas fa-undo"></i>';
            statusText.textContent = 'Game Over - Try Again!';
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
    } else {
        // Show guest controls, hide user controls
        guestControls.style.display = 'flex';
        userControls.style.display = 'none';
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
                consecutivePlayDays: data.consecutivePlayDays || 0
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
                username: data.username
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

    const points = document.createElement('div');
    points.className = 'achievement-points';
    points.innerHTML = '<i class="fas fa-star"></i> ' + achievement.points + ' pts';

    meta.appendChild(type);
    meta.appendChild(points);

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

    const points = document.createElement('div');
    points.className = 'achievement-toast-points';
    points.innerHTML = '<i class="fas fa-star"></i> +' + achievement.points + ' points';

    content.appendChild(header);
    content.appendChild(title);
    content.appendChild(description);
    content.appendChild(points);

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
        achievementSound.play().catch(() => {});
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
    switch(rank) {
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

    // Clear feedback and history
    document.getElementById('daily-feedback').innerHTML = '';
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
        document.getElementById('daily-timer').textContent =
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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

            // Show feedback
            showDailyFeedback(data.bulls, data.cows);

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
    historyItem.className = 'history-item';

    historyItem.innerHTML = `
        <span class="guess-number">#${dailyChallengeAttempts}</span>
        <span class="guess-value">${guess}</span>
        <span class="result">
            <span class="bulls">${bulls} 🐂</span>
            <span class="cows">${cows} 🐄</span>
        </span>
    `;

    historyDiv.insertBefore(historyItem, historyDiv.firstChild);
}

/**
 * Show Daily Feedback
 */
function showDailyFeedback(bulls, cows) {
    const feedbackDiv = document.getElementById('daily-feedback');
    let message = '';
    let emoji = '';

    if (bulls === dailyChallengeDigitCount) {
        message = '🎉 PERFECT! You cracked the code!';
        emoji = '🎉';
    } else if (bulls > 0 && cows > 0) {
        message = `${bulls} Bull${bulls !== 1 ? 's' : ''} & ${cows} Cow${cows !== 1 ? 's' : ''} - You're getting close!`;
        emoji = '🎯';
    } else if (bulls > 0) {
        message = `${bulls} Bull${bulls !== 1 ? 's' : ''} - Some digits are perfectly placed!`;
        emoji = '🐂';
    } else if (cows > 0) {
        message = `${cows} Cow${cows !== 1 ? 's' : ''} - Right digits, wrong positions!`;
        emoji = '🐄';
    } else {
        message = 'No matches - Try different digits!';
        emoji = '❌';
    }

    feedbackDiv.innerHTML = `<div class="feedback-message">${emoji} ${message}</div>`;
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
            showDailyChallengeResult(won, dailyChallengeAttempts, timeDisplay, data.rank, data.totalPlayers);

            // Reload daily challenge info for home page
            await loadDailyChallengeInfo();
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
    const dailyChallengePage = document.getElementById('daily-challenge-page');
    const dailyResultPage = document.getElementById('daily-result-page');

    fadeOutElement(dailyChallengePage, () => {
        // Build result content
        let resultHTML = '';

        if (won) {
            resultHTML = `
                <div class="result-header win">
                    <div class="result-icon">🏆</div>
                    <h2>CHALLENGE COMPLETE!</h2>
                </div>
                <div class="result-stats">
                    <div class="result-stat">
                        <span class="stat-label">Attempts</span>
                        <span class="stat-value">${attempts}</span>
                    </div>
                    <div class="result-stat">
                        <span class="stat-label">Time</span>
                        <span class="stat-value">${timeDisplay}</span>
                    </div>
                    ${rank ? `
                        <div class="result-stat highlight">
                            <span class="stat-label">Your Rank</span>
                            <span class="stat-value">#${rank}</span>
                        </div>
                    ` : ''}
                    ${totalPlayers ? `
                        <div class="result-stat">
                            <span class="stat-label">Total Players</span>
                            <span class="stat-value">${totalPlayers}</span>
                        </div>
                    ` : ''}
                </div>
                <p class="result-message">🌟 Come back tomorrow for a new challenge!</p>
            `;

            triggerConfetti();
        } else {
            resultHTML = `
                <div class="result-header lose">
                    <div class="result-icon">💪</div>
                    <h2>CHALLENGE FAILED</h2>
                </div>
                <div class="result-stats">
                    <div class="result-stat">
                        <span class="stat-label">Attempts</span>
                        <span class="stat-value">${attempts}</span>
                    </div>
                    <div class="result-stat">
                        <span class="stat-label">Time</span>
                        <span class="stat-value">${timeDisplay}</span>
                    </div>
                </div>
                <p class="result-message">Don't give up! Try again tomorrow! 🎯</p>
            `;
        }

        document.getElementById('daily-game-stats').innerHTML = resultHTML;
        fadeInElement(dailyResultPage, 'flex');
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
