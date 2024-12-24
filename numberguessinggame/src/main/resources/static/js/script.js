// Global variables
let attempts = 0;
let startTime;
let timerInterval;
let bestScore = localStorage.getItem('bestScore') || 'Not set';
let currentDifficulty = 1;
let soundEnabled = true;
let recentScores = JSON.parse(localStorage.getItem('recentScores')) || [];
let guessHistory = [];
const feedbackIndicator = document.querySelector('.feedback-indicator');
// const guessIndicator = document.querySelector('.guess-indicator');
let tabId = Date.now().toString(36) + Math.random().toString(36).substr(2);

// Sound effects
const correctSound = new Audio('/audio/correct-sound.mp3');
const incorrectSound = new Audio('/audio/incorrect-sound.mp3');
const winSound = new Audio('/audio/win-sound.mp3');

document.addEventListener('DOMContentLoaded', function () {
    updateBestScore();
    updateRecentScores();
    attachEventListeners();
    initializeDarkMode();
    createFloatingNumbers();
    updateGameStatus('welcome');
    showHomePage();
});

function updateBestScore() {
    document.getElementById('best-score').textContent = bestScore;
}

function updateRecentScores() {
    const recentScoresList = document.getElementById('recent-scores');
    recentScoresList.innerHTML = '';
    recentScores.slice(0, 5).forEach(score => {
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
    const numberCount = 50;
    const numbers = [];

    for (let i = 0; i < numberCount; i++) {
        const number = document.createElement('div');
        number.className = 'floating-number';
        number.style.left = `${Math.random() * 100}vw`;
        number.style.top = `${Math.random() * 200}vh`;
        number.style.animationDuration = `${40 + Math.random() * 60}s`;
        number.style.animationDelay = `${Math.random() * -40}s`;
        number.textContent = Math.floor(Math.random() * 10);

        const fontSize = 12 + Math.random() * 9;
        number.style.fontSize = `${fontSize}px`;

        number.addEventListener('click', () => {
            number.style.color = getRandomColor();
        });
        container.appendChild(number);
        numbers.push(number);
    }

    setInterval(() => {
        numbers.forEach(number => {
            if (Math.random() < 0.1) { // 10% chance to change number
                number.textContent = Math.floor(Math.random() * 10);
            }

            if (number.getBoundingClientRect().bottom < 0) {
                number.style.top = `${100 + Math.random() * 100}vh`;
                number.style.animationDuration = `${40 + Math.random() * 60}s`;
            }
        });
    }, 5000);
}

function getRandomColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 50%)`;
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
    updateGamePage();
    startTimer();
    updateGameStatus('playing');

    fetch('/start-game', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `difficulty=${difficulty}&tabId=${tabId}`,
        credentials: 'include' // This ensures cookies (including session ID) are sent with the request
    })
        .then(response => response.text())
        .then(data => {
            console.log(data);
            updateInputFields(difficulty);
            updateGuessHistory();
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to start the game. Please try again.');
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
    inputContainer.innerHTML = '';
    const digitCount = difficulty === 0 ? 3 : (difficulty === 1 ? 4 : 5);

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
        });

        inputContainer.appendChild(input);
    }

    // Focus on the first input
    inputContainer.firstElementChild.focus();
}

function submitGuess() {
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
            if (data.correct) {
                if (soundEnabled) winSound.play();
                endGame(true);
            } else {
                if (soundEnabled) incorrectSound.play();
                displayFeedback(data.correctPosition, data.correctButWrongPosition);
                addToGuessHistory(guess, data.correctPosition, data.correctButWrongPosition);
                shakeInputs();
                if (attempts >= 10) {
                    endGame(false);
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to submit guess. Please try again.');
        });

    for (let input of inputs) {
        input.value = '';
    }
    inputs[0].focus();
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
        historyItem.innerHTML = `
            <span class="guess">${entry.guess}</span>
            <span class="correct">Correct: ${entry.correctPosition}</span>
            <span class="misplaced">Misplaced: ${entry.correctButWrongPosition}</span>
        `;
        historyContainer.appendChild(historyItem);
    });
}

function displayFeedback(correctPosition, correctButWrongPosition) {
    const feedbackElement = document.getElementById('feedback');
    feedbackElement.innerHTML = `
        <p>Correct digits in correct position: ${correctPosition}</p>
        <p>Correct digits in wrong position: ${correctButWrongPosition}</p>
    `;
    feedbackElement.classList.remove('fade-in');
    void feedbackElement.offsetWidth;
    feedbackElement.classList.add('fade-in');
}

function displayFeedback(correctPosition, correctButWrongPosition) {
    const feedbackElement = document.getElementById('feedback');
    feedbackElement.innerHTML = `
        <p>Correct digits in correct position: ${correctPosition}</p>
        <p>Correct digits in wrong position: ${correctButWrongPosition}</p>
    `;
    feedbackElement.classList.remove('fade-in');
    void feedbackElement.offsetWidth;
    feedbackElement.classList.add('fade-in');
}

function startTimer() {
    startTime = new Date();
    timerInterval = setInterval(updateTimer, 1000);
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
    const maxSeconds = 10 * 60; // 10 minutes max
    const progress = (totalSeconds / maxSeconds) * 283;
    const timerProgress = document.querySelector('.timer-progress');
    timerProgress.style.strokeDasharray = 283;
    timerProgress.style.strokeDashoffset = 283 - progress;

    // Change color based on time remaining
    let color;
    if (totalSeconds < maxSeconds * 0.5) {
        color = '#4CAF50'; // Green for first half
    } else if (totalSeconds < maxSeconds * 0.75) {
        color = '#FFC107'; // Yellow for next quarter
    } else {
        color = '#F44336'; // Red for last quarter
    }
    timerProgress.style.stroke = color;

    if (totalSeconds >= maxSeconds) {
        endGame(false); // End the game with a loss
    }
}

function getTimerColor(progress) {
    if (progress < 120) return 'green';
    if (progress < 240) return 'yellow';
    return 'red';
}

function updateAttemptsProgress() {
    const progressElement = document.getElementById('attempts-progress');
    const progress = (attempts / 10) * 100;
    progressElement.style.width = `${progress}%`;
}

function endGame(won) {
    clearInterval(timerInterval);
    const time = document.getElementById('timer').textContent;
    document.getElementById('game-page').style.display = 'none';
    document.getElementById('result-page').style.display = 'block';

    updateGameStatus(won ? 'won' : 'lost');

    const statsContainer = document.getElementById('game-stats');
    statsContainer.innerHTML = `
        <div class="stat-item">
            <i class="fas fa-stopwatch"></i>
            <span>Time Taken: ${time}</span>
        </div>
        <div class="stat-item">
            <i class="fas fa-chart-line"></i>
            <span>Attempts: ${attempts}/10</span>
        </div>
        <div class="stat-item">
            <i class="fas fa-tachometer-alt"></i>
            <span>Avg. Time per Guess: ${calculateAverageGuessTime(time, attempts)}</span>
        </div>
        <div class="stat-item">
            <i class="fas fa-trophy"></i>
            <span>Best Score: ${bestScore}</span>
        </div>
        <div class="stat-item">
            <i class="fas fa-chart-bar"></i>
            <span>Comparison to Best: ${compareToaBestScore(attempts)}</span>
        </div>
    `;

    if (won) {
        createConfetti();
        updateBestScore(attempts);
        addToRecentScores(currentDifficulty, attempts, time);
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
    const difference = attempts - parseInt(bestScore);
    if (difference === 0) return 'You matched your best score!';
    return difference > 0 ? `${difference} more than your best` : `${Math.abs(difference)} less than your best`;
}

function updateBestScore(score) {
    if (score === undefined) {
        document.getElementById('best-score').textContent = bestScore;
        return;
    }

    if (bestScore === 'Not set' || score < parseInt(bestScore)) {
        bestScore = score.toString();
        localStorage.setItem('bestScore', bestScore);
        document.getElementById('best-score').textContent = bestScore;
    }
}

function addToRecentScores(difficulty, attempts, time) {
    const difficultyNames = ['Easy', 'Medium', 'Hard'];
    recentScores.unshift({
        difficulty: difficultyNames[difficulty],
        attempts: attempts,
        time: time
    });
    if (recentScores.length > 5) recentScores.pop();
    localStorage.setItem('recentScores', JSON.stringify(recentScores));
    updateRecentScores();
}

function showHomePage() {
    updateGameStatus('welcome');
    document.getElementById('home-page').style.display = 'block';
    document.getElementById('game-page').style.display = 'none';
    document.getElementById('result-page').style.display = 'none';
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
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.animationDelay = `${Math.random() * 5}s`;
        confetti.style.backgroundColor = getRandomColor();
        confettiContainer.appendChild(confetti);
    }
    setTimeout(() => confettiContainer.innerHTML = '', 5000);
}

function createConfetti() {
    const confettiContainer = document.getElementById('confetti-container');
    confettiContainer.innerHTML = '';

    const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f7797d', '#6a0dad', '#1e90ff'];
    const numConfetti = 150;

    for (let i = 0; i < numConfetti; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-number';

        confetti.textContent = Math.floor(Math.random() * 10);

        confetti.style.color = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = '50%';
        confetti.style.top = '50%';

        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.random() * 70;
        const rotation = Math.random() * 720 - 360;

        confetti.style.setProperty('--end-x', `${Math.cos(angle) * distance}vw`);
        confetti.style.setProperty('--end-y', `${Math.sin(angle) * distance}vh`);
        confetti.style.setProperty('--rotation', `${rotation}deg`);

        const size = 16 + Math.random() * 24;
        confetti.style.fontSize = `${size}px`;

        confetti.style.animationDuration = `${3 + Math.random() * 2}s`;
        confetti.style.animationDelay = `${Math.random() * 0.5}s`;

        confettiContainer.appendChild(confetti);
    }

    setTimeout(() => {
        confettiContainer.innerHTML = '';
    }, 6000);
}

function getRandomColor() {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgb(${r}, ${g}, ${b})`;
}

function showFeedback() {
    const isCorrect = Math.random() < 0.3; // 30% chance of being correct
    feedbackIndicator.classList.add(isCorrect ? 'correct' : 'incorrect');
    feedbackIndicator.style.opacity = '1';
    setTimeout(() => {
        feedbackIndicator.style.opacity = '0';
        feedbackIndicator.classList.remove('correct', 'incorrect');
    }, 1000);
}

function shakeInputs() {
    const inputContainer = document.getElementById('input-container');
    inputContainer.classList.add('shake');
    setTimeout(() => inputContainer.classList.remove('shake'), 500);
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
    attemptsText.textContent = attempts;

    const progressCircle = document.querySelector('.attempts-progress');
    const radius = progressCircle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    const progress = (attempts / 10) * circumference;

    progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    progressCircle.style.strokeDashoffset = circumference - progress;

    let color;
    if (attempts <= 3) {
        color = '#4CAF50'; // Green for first 3 attempts
    } else if (attempts <= 6) {
        color = '#FFC107'; // Yellow for next 3 attempts
    } else {
        color = '#F44336'; // Red for last 4 attempts
    }
    progressCircle.style.stroke = color;
}
