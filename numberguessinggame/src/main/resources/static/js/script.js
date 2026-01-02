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
let soundEnabled = true;
let isSubmitting = false;
let recentScores = [];

// Auth state
let currentUser = null;
let authToken = null;
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

// Sound effects
const correctSound = new Audio('/audio/correct-sound.mp3');
const incorrectSound = new Audio('/audio/incorrect-sound.mp3');
const winSound = new Audio('/audio/win-sound.mp3');

document.addEventListener('DOMContentLoaded', function () {
    initializeAuth();
    updateBestScore();
    updateRecentScores();
    attachEventListeners();
    attachAuthListeners();
    initializeDarkMode();
    createFloatingNumbers();
    updateGameStatus('welcome');
    showHomePage();
    loadLeaderboard();
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
    document.getElementById('sound-toggle').addEventListener('click', toggleSound);
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

function toggleSound() {
    soundEnabled = !soundEnabled;
    const soundIcon = document.querySelector('#sound-toggle i');
    soundIcon.classList.toggle('fa-volume-up');
    soundIcon.classList.toggle('fa-volume-mute');
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
                alert(data.error);
                showHomePage();
                return;
            }

            // Store server-generated tabId for security
            if (data.tabId) {
                tabId = data.tabId;
                updateInputFields(difficulty);
                updateGuessHistory();
            } else {
                alert('Failed to start the game. Please try again.');
                showHomePage();
            }
        })
        .catch(error => {
            alert('Error: ' + error.message);
            showHomePage();
        });
}

function updateGamePage() {
    document.getElementById('home-page').style.display = 'none';
    document.getElementById('game-page').style.display = 'block';
    document.getElementById('result-page').style.display = 'none';
    document.getElementById('attempts').textContent = attempts;
    document.getElementById('feedback').textContent = '';
    updateAttemptsProgress();
}

function updateInputFields(difficulty) {
    const inputContainer = document.getElementById('input-container');
    if (!inputContainer) return;

    inputContainer.innerHTML = '';
    const digitCount = difficulty === 0 ? GAME_CONFIG.EASY_DIGITS : (difficulty === 1 ? GAME_CONFIG.MEDIUM_DIGITS : GAME_CONFIG.HARD_DIGITS);

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
        alert('Game session not found. Please start a new game.');
        showHomePage();
        return;
    }

    const inputs = document.getElementsByClassName('digit-input');
    let guess = '';
    for (let input of inputs) {
        guess += input.value;
    }

    if (guess.length !== inputs.length) {
        alert('Please enter all digits before submitting your guess.');
        return;
    }

    if (!/^\d+$/.test(guess) || new Set(guess).size !== guess.length) {
        alert('Please enter a valid number with unique digits.');
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
                alert(data.error);
                // Reset attempts counter since this wasn't a valid guess
                attempts--;
                updateAttemptsProgress();
                document.getElementById('attempts').textContent = attempts;
                return;
            }

            if (data.correct) {
                if (soundEnabled) winSound.play();
                endGame(true);
            } else {
                if (soundEnabled) incorrectSound.play();
                displayFeedback(data.correctPosition, data.correctButWrongPosition);
                addToGuessHistory(guess, data.correctPosition, data.correctButWrongPosition);
                shakeInputs();
                if (attempts >= GAME_CONFIG.MAX_ATTEMPTS) {
                    endGame(false);
                }
            }
        })
        .catch(error => {
            alert('Failed to submit guess. Please try again.');
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
    updateGuessHistory();
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

    feedbackElement.classList.remove('fade-in');
    void feedbackElement.offsetWidth;
    feedbackElement.classList.add('fade-in');
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
    document.getElementById('game-page').style.display = 'none';
    document.getElementById('result-page').style.display = 'block';

    updateGameStatus(won ? 'won' : 'lost');

    // Clean up server session when game ends (lost or quit)
    // Note: Won games are cleaned up automatically by the server
    if (!won && tabId) {
        fetch('/end-game', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `tabId=${tabId}`,
            credentials: 'include'
        }).catch(() => {
            // Silently fail - session will eventually timeout
        });
    }

    const statsContainer = document.getElementById('game-stats');
    statsContainer.textContent = '';

    // Helper function to create stat items safely
    const createStatItem = (iconClass, text) => {
        const div = document.createElement('div');
        div.className = 'stat-item';
        div.innerHTML = `<i class="${iconClass}"></i>`; // Safe: hardcoded icon classes
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
    }

    // Refresh achievement badge after game completion (with delay for server processing)
    if (currentUser && authToken) {
        setTimeout(() => {
            loadAchievementSummary();
        }, 1000);
    }

    document.getElementById('play-again').style.display = 'inline-block';
    document.getElementById('quit').style.display = 'inline-block';
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

function showHomePage() {
    updateGameStatus('welcome');
    document.getElementById('home-page').style.display = 'block';
    document.getElementById('game-page').style.display = 'none';
    document.getElementById('result-page').style.display = 'none';
    loadLeaderboard(); // Refresh leaderboard when returning to home
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
        updateAuthUI();
        loadAchievementSummary();
    }
}

function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const userProfile = document.getElementById('user-profile');
    const usernameDisplay = document.getElementById('username-display');
    
    if (!loginBtn || !userProfile || !usernameDisplay) return;
    
    if (currentUser) {
        loginBtn.style.display = 'none';
        userProfile.style.display = 'flex';
        usernameDisplay.textContent = currentUser.username;
    } else {
        loginBtn.style.display = 'block';
        userProfile.style.display = 'none';
        usernameDisplay.textContent = '';
    }
}

function attachAuthListeners() {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const authModal = document.getElementById('auth-modal');
    const closeModal = document.querySelector('.close-modal');
    const showSignup = document.getElementById('show-signup');
    const showLogin = document.getElementById('show-login');
    const loginFormElement = document.getElementById('login-form-element');
    const signupFormElement = document.getElementById('signup-form-element');
    
    if (!loginBtn || !authModal || !closeModal) return;
    
    loginBtn.addEventListener('click', () => {
        authModal.style.display = 'flex';
        showLoginForm();
    });
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    closeModal.addEventListener('click', () => {
        authModal.style.display = 'none';
        clearAuthForms();
    });
    
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) {
            authModal.style.display = 'none';
            clearAuthForms();
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

    // Achievement icon click handler
    const achievementIcon = document.getElementById('achievement-icon');
    if (achievementIcon) {
        achievementIcon.addEventListener('click', showAchievementsModal);
    }
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
                totalWins: data.totalWins
            };

            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            updateAuthUI();
            loadAchievementSummary();
            document.getElementById('auth-modal').style.display = 'none';
            clearAuthForms();

            alert('Login successful!');
        }
    } catch (error) {
        errorDiv.textContent = 'An error occurred. Please try again.';
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
            document.getElementById('auth-modal').style.display = 'none';
            clearAuthForms();
            
            alert('Signup successful! Welcome to NumVana!');
        }
    } catch (error) {
        errorDiv.textContent = 'An error occurred. Please try again.';
    }
}

function logout() {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    updateAuthUI();
    updateAchievementBadge(0); // Reset badge on logout
    alert('Logged out successfully!');
}

// Achievement Functions
async function loadAchievementSummary() {
    if (!authToken || !currentUser) {
        updateAchievementBadge(0);
        return;
    }

    try {
        const response = await fetch('/api/achievements/summary', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + authToken
            }
        });

        const data = await response.json();

        if (data.success && data.summary) {
            achievementSummary = data.summary;
            achievementCount = data.summary.unlockedCount || 0;
            updateAchievementBadge(achievementCount);
        } else {
            updateAchievementBadge(0);
        }
    } catch (error) {
        console.error('Failed to load achievement summary:', error);
        updateAchievementBadge(0);
    }
}

function updateAchievementBadge(count) {
    const badge = document.getElementById('achievement-count');
    const container = document.getElementById('achievement-badge-container');

    if (!badge || !container) return;

    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'flex';
        badge.classList.add('has-achievements');
    } else {
        badge.style.display = 'none';
        badge.classList.remove('has-achievements');
    }
}

async function showAchievementsModal() {
    if (!authToken || !currentUser) {
        alert('Please log in to view your achievements!');
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
            displayAchievements(data.achievements);
        } else {
            alert('Failed to load achievements');
        }
    } catch (error) {
        console.error('Failed to load achievements:', error);
        alert('Failed to load achievements');
    }
}

function displayAchievements(achievements) {
    // Simple alert display for now - can be upgraded to modal later
    let message = '🏆 YOUR ACHIEVEMENTS 🏆\n\n';

    const unlocked = achievements.filter(a => a.unlocked);
    const locked = achievements.filter(a => !a.unlocked);

    if (unlocked.length > 0) {
        message += `✅ UNLOCKED (${unlocked.length}):\n`;
        unlocked.forEach(a => {
            message += `\n${a.name}\n${a.description}\n`;
        });
    }

    message += `\n\n🔒 LOCKED (${locked.length}):\n`;
    locked.slice(0, 5).forEach(a => {
        message += `\n${a.name}\n${a.description}\n`;
    });

    if (locked.length > 5) {
        message += `\n... and ${locked.length - 5} more!`;
    }

    alert(message);
}

// Leaderboard Functions
async function loadLeaderboard() {
    const loadingDiv = document.getElementById('leaderboard-loading');
    const contentDiv = document.getElementById('leaderboard-content');

    if (!loadingDiv || !contentDiv) return;

    try {
        const response = await fetch('/api/leaderboard?limit=10');
        const data = await response.json();

        if (data.success && data.leaderboard && data.leaderboard.length > 0) {
            contentDiv.innerHTML = createLeaderboardHTML(data.leaderboard);
            loadingDiv.style.display = 'none';
            contentDiv.style.display = 'block';
        } else {
            loadingDiv.textContent = 'No players on the leaderboard yet. Be the first!';
        }
    } catch (error) {
        loadingDiv.textContent = 'Failed to load leaderboard';
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
