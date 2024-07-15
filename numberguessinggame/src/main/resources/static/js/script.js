// Global variables
let attempts = 0;
let startTime;
let timerInterval;
let bestScore = localStorage.getItem('bestScore') || 'Not set';
let currentDifficulty = 1;

// Wait for the DOM to be fully loaded before attaching event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Update best score display
    document.getElementById('best-score').textContent = bestScore;

    // Attach event listeners to buttons
    document.getElementById('play-easy').addEventListener('click', () => startGame(0));
    document.getElementById('play-medium').addEventListener('click', () => startGame(1));
    document.getElementById('play-hard').addEventListener('click', () => startGame(2));
    document.getElementById('submit-guess').addEventListener('click', submitGuess);
    document.getElementById('play-again').addEventListener('click', () => startGame(currentDifficulty));
    document.getElementById('quit').addEventListener('click', showHomePage);
});

function startGame(difficulty) {
    currentDifficulty = difficulty;
    document.getElementById('home-page').style.display = 'none';
    document.getElementById('game-page').style.display = 'block';
    document.getElementById('result-page').style.display = 'none';
    attempts = 0;
    document.getElementById('attempts').textContent = attempts;
    document.getElementById('feedback').textContent = '';
    startTimer();
    
    // Send request to servlet to start a new game and get a new number
    fetch('/start-game', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `difficulty=${difficulty}`
    })
        .then(response => response.text())
        .then(data => {
            console.log(data);
            updateInputFields(difficulty);
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to start the game. Please try again.');
        });
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
        inputContainer.appendChild(input);
    }
    // Focus on the first input
    inputContainer.firstChild.focus();
}

function submitGuess() {
    const inputs = document.getElementsByClassName('digit-input');
    let guess = '';
    for (let input of inputs) {
        guess += input.value;
    }

    if (guess.length !== inputs.length || !/^\d+$/.test(guess) || new Set(guess).size !== guess.length) {
        alert('Please enter a valid number with unique digits.');
        return;
    }

    attempts++;
    document.getElementById('attempts').textContent = attempts;

    // Send guess to servlet and get feedback
    fetch('/submit-guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `guess=${guess}`
    })
    .then(response => response.json())
    .then(data => {
        if (data.correct) {
            document.getElementById('game-container').classList.add('celebrate');
            endGame(true);
        } else {
            document.getElementById('input-container').classList.add('shake');
            setTimeout(() => {
                document.getElementById('input-container').classList.remove('shake');
            }, 500);
            displayFeedback(data.correctPosition, data.correctButWrongPosition);
            if (attempts >= 10) {
                endGame(false);
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to submit guess. Please try again.');
    });

    // Clear input fields
    for (let input of inputs) {
        input.value = '';
    }
    inputs[0].focus();
}

function displayFeedback(correctPosition, correctButWrongPosition) {
    const feedbackElement = document.getElementById('feedback');
    feedbackElement.innerHTML = `Correct digits in correct position: ${correctPosition}<br>
                                 Correct digits in wrong position: ${correctButWrongPosition}`;
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
    document.getElementById('timer').textContent = `${minutes}:${seconds}`;
}

function endGame(won) {
    clearInterval(timerInterval);
    const time = document.getElementById('timer').textContent;
    document.getElementById('game-page').style.display = 'none';
    document.getElementById('result-page').style.display = 'block';
    document.getElementById('result-message').textContent = won ? 'Congratulations! You guessed the number!' : 'Game Over. You ran out of attempts.';
    document.getElementById('final-attempts').textContent = attempts;
    document.getElementById('final-time').textContent = time;

    if (won && (bestScore === 'Not set' || attempts < parseInt(bestScore))) {
        bestScore = attempts.toString();
        localStorage.setItem('bestScore', bestScore);
        document.getElementById('best-score').textContent = bestScore;
    }
}

function showHomePage() {
    document.getElementById('home-page').style.display = 'block';
    document.getElementById('game-page').style.display = 'none';
    document.getElementById('result-page').style.display = 'none';
}