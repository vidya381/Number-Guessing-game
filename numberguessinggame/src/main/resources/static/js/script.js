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
const guessIndicator = document.querySelector('.guess-indicator');

// Sound effects
const correctSound = new Audio('/audio/correct-sound.mp3');
const incorrectSound = new Audio('/audio/incorrect-sound.mp3');
const winSound = new Audio('/audio/win-sound.mp3');

document.addEventListener('DOMContentLoaded', function() {
    updateBestScore();
    updateRecentScores();
    attachEventListeners();
    initializeDarkMode();
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
    document.getElementById('quit').addEventListener('click', showHomePage);
    // document.getElementById('toggle-sound').addEventListener('click', toggleSound);
    // document.getElementById('dark-mode-toggle').addEventListener('change', toggleDarkMode);
    document.getElementById('quit-game').addEventListener('click', quitGame);
    document.getElementById('theme-toggle').addEventListener('click', toggleDarkMode);
    document.getElementById('sound-toggle').addEventListener('click', toggleSound);
}

function initializeDarkMode() {
    const darkModeEnabled = localStorage.getItem('darkMode') === 'true';
    document.getElementById('dark-mode-toggle').checked = darkModeEnabled;
    setTheme(darkModeEnabled);
}

// function toggleDarkMode() {
//     const darkModeEnabled = document.getElementById('dark-mode-toggle').checked;
//     setTheme(darkModeEnabled);
//     localStorage.setItem('darkMode', darkModeEnabled);
// }

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const themeIcon = document.querySelector('#theme-toggle i');
    themeIcon.classList.toggle('fa-moon');
    themeIcon.classList.toggle('fa-sun');
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
        root.style.setProperty('--primary-color', '#f39c12');
        root.style.setProperty('--secondary-color', '#4a90e2');
    } else {
        root.style.setProperty('--primary-color', '#4a90e2');
        root.style.setProperty('--secondary-color', '#f39c12');
    }
}

// function toggleSound() {
//     soundEnabled = !soundEnabled;
//     const soundIcon = document.querySelector('#toggle-sound i');
//     soundIcon.className = soundEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
// }

function startGame(difficulty) {
    currentDifficulty = difficulty;
    attempts = 0;
    guessHistory = []; // Reset guess history
    updateGamePage();
    startTimer();
    
    fetch('/start-game', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `difficulty=${difficulty}`
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
        input.maxLength = 1;
        input.className = 'digit-input';
        input.addEventListener('input', function(e) {
            if (this.value) {
                if (this.nextElementSibling) {
                    this.nextElementSibling.focus();
                }
            }
        });
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && !this.value && this.previousElementSibling) {
                this.previousElementSibling.focus();
            }
        });
        inputContainer.appendChild(input);
    }
    inputContainer.firstChild.focus();
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
    document.getElementById('attempts').textContent = attempts;
    updateAttemptsProgress();

    fetch('/submit-guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `guess=${guess}`
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
        <p>Correct digits in correct position: <span class="correct">${correctPosition}</span></p>
        <p>Correct digits in wrong position: <span class="misplaced">${correctButWrongPosition}</span></p>
    `;
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
    
    const progress = (elapsedTime.getTime() / (10 * 60 * 1000)) * 360; // 10 minutes max
    const color = getTimerColor(progress);
    document.getElementById('timer-progress').style.background = 
        `conic-gradient(${color} ${progress}deg, #f0f0f0 ${progress}deg)`;
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
    
    const resultMessage = won ? 'Congratulations! You guessed the number!' : 'Game Over. You ran out of attempts.';
    document.getElementById('result-message').textContent = resultMessage;
    document.getElementById('final-attempts').textContent = attempts;
    document.getElementById('final-time').textContent = time;

    const avgGuessTime = calculateAverageGuessTime(time, attempts);
    document.getElementById('avg-guess-time').textContent = avgGuessTime;

    const comparisonToBest = compareToaBestScore(attempts);
    document.getElementById('comparison-to-best').textContent = comparisonToBest;

    if (won) {
        createConfetti();
        updateBestScore(attempts);
        addToRecentScores(currentDifficulty, attempts, time);
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
    document.getElementById('home-page').style.display = 'block';
    document.getElementById('game-page').style.display = 'none';
    document.getElementById('result-page').style.display = 'none';
}

function quitGame() {
    if (confirm("Are you sure you want to quit? Your progress will be lost.")) {
        clearInterval(timerInterval);
        showHomePage();
    }
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
    confettiContainer.innerHTML = ''; // Clear any existing confetti

    const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f7797d', '#6a0dad', '#1e90ff'];
    const numConfetti = 150;

    for (let i = 0; i < numConfetti; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-number';
        
        // Set random number
        confetti.textContent = Math.floor(Math.random() * 10);
        
        // Randomize confetti properties
        confetti.style.color = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = '50%';
        confetti.style.top = '50%';
        
        // Randomize the direction, distance, and rotation of burst
        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.random() * 70; // Percentage of viewport
        const rotation = Math.random() * 720 - 360; // -360 to 360 degrees
        
        confetti.style.setProperty('--end-x', `${Math.cos(angle) * distance}vw`);
        confetti.style.setProperty('--end-y', `${Math.sin(angle) * distance}vh`);
        confetti.style.setProperty('--rotation', `${rotation}deg`);
        
        // Randomize size
        const size = 16 + Math.random() * 24;
        confetti.style.fontSize = `${size}px`;
        
        // Randomize animation duration and delay
        confetti.style.animationDuration = `${3 + Math.random() * 2}s`;
        confetti.style.animationDelay = `${Math.random() * 0.5}s`;
        
        confettiContainer.appendChild(confetti);
    }

    // Remove confetti after animation
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
  
  setInterval(() => {
    guessIndicator.textContent = Math.floor(Math.random() * 10);
    setTimeout(showFeedback, 500);
  }, 5000);