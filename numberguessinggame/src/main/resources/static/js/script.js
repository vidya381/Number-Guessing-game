let attempts = 0;
let startTime;
let timerInterval;
let bestScore = localStorage.getItem('bestScore') || 'Not set';

document.getElementById('best-score').textContent = bestScore;

document.getElementById('play-button').addEventListener('click', startGame);
document.getElementById('submit-guess').addEventListener('click', submitGuess);
document.getElementById('play-again').addEventListener('click', startGame);
document.getElementById('quit').addEventListener('click', showHomePage);

function startGame() {
    document.getElementById('home-page').style.display = 'none';
    document.getElementById('game-page').style.display = 'block';
    document.getElementById('result-page').style.display = 'none';
    attempts = 0;
    document.getElementById('attempts').textContent = attempts;
    document.getElementById('feedback').textContent = '';
    startTimer();
    // Send request to servlet to start a new game and get a new number
    fetch('/start-game', { method: 'POST' })
        .then(response => response.text())
        .then(data => console.log(data));
}

function submitGuess() {
    const inputs = document.getElementsByClassName('digit-input');
    let guess = '';
    for (let input of inputs) {
        guess += input.value;
        input.value = '';
    }
    inputs[0].focus();

    if (guess.length !== 4 || isNaN(guess)) {
        alert('Please enter a valid 4-digit number.');
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
            endGame(true);
        } else {
            displayFeedback(data.correctPosition, data.correctButWrongPosition);
            if (attempts >= 10) {
                endGame(false);
            }
        }
    });
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