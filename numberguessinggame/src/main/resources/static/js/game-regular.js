/**
 * Regular Game Mode
 * Handles the main game mode with hints, timer, guess history, and results
 */

window.RegularGame = {
    // Track if game just completed (for leaderboard refresh)
    gameJustCompleted: false,

    // ==========================================
    // GAME LIFECYCLE
    // ==========================================

    startGame: function(difficulty) {
        GameState.currentDifficulty = difficulty;
        GameState.attempts = 0;
        GameState.guessHistory = [];
        this.resetHintState();

        // Clear any existing timer to prevent race conditions
        if (GameState.timerInterval) {
            clearInterval(GameState.timerInterval);
            GameState.timerInterval = null;
        }

        this.updateGamePage();
        this.startTimer();
        if (Utils) {
            Utils.updateGameStatus('regular-game');
        }

        // Include userId if user is logged in
        const userId = GameState.currentUser ? GameState.currentUser.id : '';
        const bodyParams = userId ? `difficulty=${difficulty}&userId=${userId}` : `difficulty=${difficulty}`;

        fetch('/start-game', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: bodyParams,
            credentials: 'include'
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
                if (data.error) {
                    if (Achievements) {
                        Achievements.showToast(`Couldn't start the game. Check your connection and try again!`, 'error');
                    }
                    this.showHomePage();
                    return;
                }

                if (data.tabId) {
                    GameState.tabId = data.tabId;
                    this.updateInputFields(difficulty);
                    this.updateGuessHistory();
                } else {
                    if (Achievements) {
                        Achievements.showToast('Oops! Couldn\'t start the game. Try again in a moment!', 'error');
                    }
                    this.showHomePage();
                }
            })
            .catch(error => {
                if (Achievements) {
                    Achievements.showToast('Couldn\'t start the game. Check your connection and try again!', 'error');
                }
                this.showHomePage();
            });
    },

    updateGamePage: function() {
        const homePage = document.getElementById('home-page');
        const gamePage = document.getElementById('game-page');
        const resultPage = document.getElementById('result-page');

        if (Utils) {
            Utils.fadeOutElement(homePage, () => {
                Utils.fadeInElement(gamePage, 'flex');
                document.getElementById('attempts').textContent = GameState.attempts;
                Utils.updateAttemptsProgress();
            });
        }

        resultPage.style.display = 'none';
    },

    updateInputFields: function(difficulty) {
        const inputContainer = document.getElementById('input-container');
        if (!inputContainer) return;

        inputContainer.innerHTML = '';
        const digitCount = difficulty === 0 ? GameConfig.EASY_DIGITS : (difficulty === 1 ? GameConfig.MEDIUM_DIGITS : GameConfig.HARD_DIGITS);

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
                    RegularGame.submitGuess();
                }
            });

            inputContainer.appendChild(input);
        }

        // Focus on the first input
        if (inputContainer.firstElementChild) {
            inputContainer.firstElementChild.focus();
        }
    },

    // ==========================================
    // GAMEPLAY
    // ==========================================

    submitGuess: function() {
        // Prevent double submission
        if (GameState.isSubmitting) return;

        // Check if game session exists
        if (!GameState.tabId) {
            if (Achievements) {
                Achievements.showToast('Your game session expired. Let\'s start a fresh game!', 'error');
            }
            setTimeout(() => this.showHomePage(), GameConfig.UI.HOME_NAVIGATION_DELAY_MS);
            return;
        }

        const inputContainer = document.getElementById('input-container');
        const inputs = inputContainer ? inputContainer.querySelectorAll('.digit-input') : [];
        let guess = '';
        for (let input of inputs) {
            guess += input.value;
        }

        if (guess.length !== inputs.length) {
            if (Achievements) {
                Achievements.showToast('Please fill in all digit boxes to make your guess!', 'info');
            }
            return;
        }

        if (!/^\d+$/.test(guess) || new Set(guess).size !== guess.length) {
            if (Achievements) {
                Achievements.showToast('Oops! Each digit must be different. Try again!', 'error');
            }
            return;
        }

        // Set loading state
        GameState.isSubmitting = true;
        const submitButton = document.getElementById('submit-guess');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.style.opacity = '0.6';
            submitButton.style.cursor = 'not-allowed';
        }

        GameState.attempts++;
        if (Utils) {
            Utils.updateAttemptsProgress();
        }

        document.getElementById('attempts').textContent = GameState.attempts;
        if (Utils) {
            Utils.updateAttemptsProgress();
        }

        fetch('/submit-guess', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `guess=${guess}&tabId=${GameState.tabId}`,
            credentials: 'include'
        })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    if (Achievements) {
                        Achievements.showToast(`Something went wrong: ${data.error}. Let's try that again!`, 'error');
                    }
                    // Reset attempts counter since this wasn't a valid guess
                    GameState.attempts--;
                    if (Utils) {
                        Utils.updateAttemptsProgress();
                    }
                    document.getElementById('attempts').textContent = GameState.attempts;
                    return;
                }

                if (data.correct) {
                    if (GameState.soundVolume > 0 && GameConfig) {
                        GameConfig.sounds.win.play();
                    }

                    // Show results page IMMEDIATELY - don't wait for anything
                    this.endGame(true);

                    // Update all data in background after results are shown
                    setTimeout(() => {
                        // Update streak data if available
                        if (data.currentWinStreak !== undefined) {
                            GameState.currentStreak = data.currentWinStreak;
                            if (GameState.currentUser) {
                                GameState.currentUser.currentWinStreak = data.currentWinStreak;
                                GameState.currentUser.bestWinStreak = data.bestWinStreak;
                                GameState.currentUser.consecutivePlayDays = data.consecutivePlayDays;
                                localStorage.setItem('currentUser', JSON.stringify(GameState.currentUser));
                            }
                            if (Auth) {
                                Auth.updateAuthUI();
                            }
                        }

                        // Update coins
                        if (data.coinsAwarded && data.coinsAwarded > 0 && GameState.currentUser) {
                            GameState.currentUser.coins = data.totalCoins || (GameState.currentUser.coins + data.coinsAwarded);
                            localStorage.setItem('currentUser', JSON.stringify(GameState.currentUser));
                            if (Auth) {
                                Auth.showCoinAnimation(data.coinsAwarded);
                            }
                        }

                        // Show achievements
                        if (data.newAchievements && data.newAchievements.length > 0 && Achievements) {
                            Achievements.showAchievementNotifications(data.newAchievements);
                        }
                    }, 50);
                } else {
                    if (GameState.soundVolume > 0 && GameConfig) {
                        GameConfig.sounds.incorrect.play();
                    }
                    this.addToGuessHistory(guess, data.correctPosition, data.correctButWrongPosition);
                    if (Utils) {
                        Utils.shakeInputs();
                    }
                    if (GameState.attempts >= GameConfig.MAX_ATTEMPTS) {
                        this.endGame(false);
                    }
                }
            })
            .catch(error => {
                if (Achievements) {
                    Achievements.showToast('Hmm, couldn\'t submit that guess. Check your connection and try again!', 'error');
                }
                // Reset attempts counter on error
                GameState.attempts--;
                if (Utils) {
                    Utils.updateAttemptsProgress();
                }
                document.getElementById('attempts').textContent = GameState.attempts;
            })
            .finally(() => {
                // Reset loading state
                GameState.isSubmitting = false;
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
    },

    // ==========================================
    // HINT SYSTEM
    // ==========================================

    requestHint: async function() {
        // Check if user is logged in
        if (!GameState.currentUser || !GameState.authToken) {
            if (Achievements) {
                Achievements.showToast('Please log in to use hints! 🔑', 'info');
            }
            return;
        }

        // Check if tabId exists (game session active)
        if (!GameState.tabId) {
            if (Achievements) {
                Achievements.showToast('Start a game first to use hints!', 'error');
            }
            return;
        }

        // Disable button during request
        const hintBtn = document.getElementById('hint-btn');
        const originalHTML = hintBtn.innerHTML;
        hintBtn.disabled = true;
        hintBtn.style.opacity = '0.5';

        try {
            const response = await Utils.fetchWithTimeout('/get-hint', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `tabId=${GameState.tabId}&userId=${GameState.currentUser.id}`,
                credentials: 'include'
            }, 8000);

            if (!response.ok) {
                const errorInfo = Utils.handleFetchError(new Error(`HTTP ${response.status}`), response);
                this.updateHintButton();
                hintBtn.style.opacity = '1';
                if (Achievements) {
                    Achievements.showToast(errorInfo.userMessage, 'error');
                }
                return;
            }

            const data = await response.json();

            if (data.success) {
                // Update local state
                GameState.revealedHints.set(data.position, data.digit);
                GameState.hintsUsed = data.hintsUsed;
                GameState.nextHintCost = data.nextHintCost;

                // Update user coins
                GameState.currentUser.coins = data.remainingCoins;
                localStorage.setItem('currentUser', JSON.stringify(GameState.currentUser));

                // Update UI
                this.displayHint(data.position, data.digit);
                this.updateHintButton();
                hintBtn.style.opacity = '1';
                if (Auth) {
                    Auth.updateCoinDisplay();
                    Auth.showCoinAnimation(-data.costPaid);
                }

                if (Achievements) {
                    Achievements.showToast(`Hint revealed! Position ${data.position + 1} is ${data.digit} 💡`, 'success');
                }

            } else {
                this.updateHintButton();
                hintBtn.style.opacity = '1';
                if (Achievements) {
                    Achievements.showToast(data.error || 'Failed to get hint. Try again!', 'error');
                }

                if (data.required && data.current) {
                    const needed = data.required - data.current;
                    if (Achievements) {
                        Achievements.showToast(`You need ${needed} more coins! Win games to earn coins. 🪙`, 'warning');
                    }
                }
            }

        } catch (error) {
            console.error('Hint request failed:', error);
            const errorInfo = Utils.handleFetchError(error);
            if (Achievements) {
                Achievements.showToast(errorInfo.userMessage, 'error');
            }
            this.updateHintButton();
            if (hintBtn) hintBtn.style.opacity = '1';
        }
    },

    displayHint: function(position, digit) {
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

        // Play sound effect
        if (GameState.soundVolume > 0 && GameConfig) {
            GameConfig.sounds.correct.currentTime = 0;
            GameConfig.sounds.correct.play().catch(() => {});
        }
    },

    updateHintButton: function() {
        const hintBtn = document.getElementById('hint-btn');

        if (!hintBtn) {
            return;
        }

        // Recreate button HTML
        hintBtn.innerHTML = `<span class="hint-text">Hint</span> <span class="hint-cost" id="hint-cost">${GameState.nextHintCost}</span> <i class="fas fa-coins"></i>`;

        // Disable if not logged in
        if (!GameState.currentUser || !GameState.authToken) {
            hintBtn.disabled = true;
            hintBtn.setAttribute('data-locked', 'true');
            hintBtn.setAttribute('data-tooltip', 'Login required for hints');
            return;
        }

        // Disable if insufficient coins
        if (GameState.currentUser.coins < GameState.nextHintCost) {
            hintBtn.disabled = true;
            hintBtn.setAttribute('data-locked', 'true');
            hintBtn.setAttribute('data-tooltip', `Need ${GameState.nextHintCost} coins (you have ${GameState.currentUser.coins})`);
            return;
        }

        // Enable button
        hintBtn.disabled = false;
        hintBtn.removeAttribute('data-locked');
        hintBtn.setAttribute('data-tooltip', 'Reveal one digit position');
    },

    resetHintState: function() {
        GameState.hintsUsed = 0;
        GameState.revealedHints.clear();
        GameState.nextHintCost = 3;

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
        this.updateHintButton();
    },

    // ==========================================
    // GUESS HISTORY
    // ==========================================

    addToGuessHistory: function(guess, correctPosition, correctButWrongPosition) {
        GameState.guessHistory.unshift({ guess, correctPosition, correctButWrongPosition });
        this.updateGuessHistoryAnimated();
    },

    updateGuessHistoryAnimated: function() {
        const historyContainer = document.getElementById('guess-history');
        historyContainer.innerHTML = '';

        GameState.guessHistory.forEach((entry, index) => {
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

        // Always scroll to top to show the newest guess
        historyContainer.scrollTop = 0;
    },

    updateGuessHistory: function() {
        const historyContainer = document.getElementById('guess-history');
        historyContainer.innerHTML = '';
        GameState.guessHistory.forEach(entry => {
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

        // Always scroll to top to show the newest guess
        historyContainer.scrollTop = 0;
    },

    // ==========================================
    // TIMER
    // ==========================================

    startTimer: function() {
        GameState.startTime = new Date();
        GameState.timerInterval = setInterval(() => this.updateTimer(), GameConfig.TIMER.UPDATE_INTERVAL_MS);
    },

    updateTimer: function() {
        const currentTime = new Date();
        const elapsedTime = new Date(currentTime - GameState.startTime);
        const minutes = elapsedTime.getMinutes().toString().padStart(2, '0');
        const seconds = elapsedTime.getSeconds().toString().padStart(2, '0');
        const timeString = `${minutes}:${seconds}`;

        const timerElement = document.getElementById('timer');
        if (timerElement) {
            timerElement.textContent = timeString;
        }

        const timerProgress = document.querySelector('.timer-progress');
        if (timerProgress) {
            const totalSeconds = elapsedTime.getTime() / 1000;
            const maxSeconds = GameConfig.TIMER.MAX_SECONDS;
            const progress = (totalSeconds / maxSeconds) * GameConfig.TIMER.SVG_CIRCUMFERENCE;
            timerProgress.style.strokeDasharray = GameConfig.TIMER.SVG_CIRCUMFERENCE;
            timerProgress.style.strokeDashoffset = GameConfig.TIMER.SVG_CIRCUMFERENCE - progress;

            let color;
            if (totalSeconds < maxSeconds * GameConfig.TIMER.COLOR_THRESHOLD_HALF) {
                color = '#4CAF50';
            } else if (totalSeconds < maxSeconds * GameConfig.TIMER.COLOR_THRESHOLD_THREE_QUARTERS) {
                color = '#FFC107';
            } else {
                color = '#F44336';
            }
            timerProgress.style.stroke = color;

            if (totalSeconds >= maxSeconds) {
                this.endGame(false);
            }
        }
    },

    // ==========================================
    // GAME END & RESULTS
    // ==========================================

    endGame: function(won) {
        clearInterval(GameState.timerInterval);

        // Calculate time from startTime
        const currentTime = new Date();
        const elapsedTime = new Date(currentTime - GameState.startTime);
        const minutes = elapsedTime.getMinutes().toString().padStart(2, '0');
        const seconds = elapsedTime.getSeconds().toString().padStart(2, '0');
        const time = `${minutes}:${seconds}`;

        const gamePage = document.getElementById('game-page');
        const resultPage = document.getElementById('result-page');

        if (Utils) {
            Utils.updateGameStatus(won ? 'won' : 'lost');
        }
        this.gameJustCompleted = true;

        // Reset streak to 0 on loss
        if (!won && GameState.currentUser) {
            GameState.currentStreak = 0;
            GameState.currentUser.currentWinStreak = 0;
            localStorage.setItem('currentUser', JSON.stringify(GameState.currentUser));
            if (Auth) {
                Auth.updateAuthUI();
            }
        }

        // Clean up server session when game ends
        if (!won && GameState.tabId) {
            fetch('/end-game', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `tabId=${GameState.tabId}`,
                credentials: 'include'
            }).catch(() => { });
        }

        // Prepare stats content - Modern Card Design
        const statsContainer = document.getElementById('game-stats');
        statsContainer.textContent = '';

        const difficultyNames = ['Easy', 'Medium', 'Hard'];
        const difficultyName = difficultyNames[GameState.currentDifficulty] || 'Unknown';

        // Hero Section - Win/Loss Status
        const heroSection = document.createElement('div');
        heroSection.style.cssText = 'text-align: center; margin-bottom: 25px;';

        if (won) {
            heroSection.innerHTML = `
                <div style="background: linear-gradient(135deg, #52c98c 0%, #4ea8de 100%); padding: 25px; border-radius: 20px; box-shadow: 0 8px 24px rgba(82, 201, 140, 0.3);">
                    <div style="font-size: 2.5em; margin-bottom: 10px;">🎉</div>
                    <div style="font-size: 2em; font-weight: 800; color: white; line-height: 1.2;">YOU WIN!</div>
                    <div style="font-size: 1.2em; color: rgba(255,255,255,0.9); margin-top: 8px;">${GameState.attempts} ${GameState.attempts === 1 ? 'Attempt' : 'Attempts'}</div>
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
        statsGrid.appendChild(createStatCard('fas fa-bullseye', `${GameState.attempts}/10`, 'Attempts'));

        // Best score card
        const bestScoreValue = GameState.bestScore === 'Not set' ? '--' : GameState.bestScore;
        statsGrid.appendChild(createStatCard('fas fa-trophy', bestScoreValue, 'Best Score'));

        // Comparison card
        const comparison = this.compareToBestScore(GameState.attempts);
        const comparisonValue = comparison.includes('first') ? '🆕' : comparison.split(' ')[0];
        statsGrid.appendChild(createStatCard('fas fa-chart-line', comparisonValue, 'vs Best'));

        statsContainer.appendChild(statsGrid);

        if (won) {
            if (Utils) {
                Utils.createConfetti();
            }
            this.updateBestScore(GameState.attempts);
            this.addToRecentScores(GameState.currentDifficulty, GameState.attempts, time);
        }

        document.getElementById('play-again').style.display = 'inline-block';
        document.getElementById('quit').style.display = 'inline-block';

        // Transition to result page with animation
        if (Utils) {
            Utils.fadeOutElement(gamePage, () => {
                Utils.fadeInElement(resultPage);
            });
        }
    },

    compareToBestScore: function(attempts) {
        if (GameState.bestScore === 'Not set') return 'This is your first game!';
        const parsedScore = parseInt(GameState.bestScore, 10);
        if (isNaN(parsedScore)) return 'This is your first game!';
        const difference = attempts - parsedScore;
        if (difference === 0) return 'You matched your best score!';
        return difference > 0 ? `${difference} more than your best` : `${Math.abs(difference)} less than your best`;
    },

    updateBestScore: function(score) {
        if (score === undefined) {
            const bestScoreEl = document.getElementById('best-score');
            if (bestScoreEl) {
                bestScoreEl.textContent = GameState.bestScore;
            }
            return;
        }

        const parsedBestScore = parseInt(GameState.bestScore, 10);
        if (GameState.bestScore === 'Not set' || isNaN(parsedBestScore) || score < parsedBestScore) {
            GameState.bestScore = score.toString();
            localStorage.setItem('bestScore', GameState.bestScore);
            const bestScoreEl = document.getElementById('best-score');
            if (bestScoreEl) {
                bestScoreEl.textContent = GameState.bestScore;
            }
        }
    },

    addToRecentScores: function(difficulty, attempts, time) {
        GameState.recentScores.unshift({
            difficulty: GameConfig.DIFFICULTY_NAMES[difficulty],
            attempts: attempts,
            time: time
        });

        if (GameState.recentScores.length > GameConfig.MAX_RECENT_SCORES) {
            GameState.recentScores.pop();
        }
        localStorage.setItem('recentScores', JSON.stringify(GameState.recentScores));
        if (UI) {
            UI.updateRecentScores();
        }
    },

    // ==========================================
    // NAVIGATION
    // ==========================================

    showHomePage: function() {
        if (Utils) {
            Utils.updateGameStatus('home');
        }

        // Clean up daily challenge if active
        if (GameState.dailyChallenge.sessionId !== null) {
            clearInterval(GameState.dailyChallenge.timerInterval);
            GameState.dailyChallenge.sessionId = null;
        }

        // Clean up time attack if active
        if (GameState.timeAttack.sessionId !== null) {
            clearInterval(GameState.timeAttack.timerInterval);
            GameState.timeAttack.sessionId = null;
        }

        // Clean up survival if active
        if (GameState.survival && GameState.survival.sessionId !== null) {
            GameState.resetSurvival();
        }

        // Clean up multiplayer if active
        if (typeof MultiplayerGame !== 'undefined' && MultiplayerGame.cleanup) {
            MultiplayerGame.cleanup();
        }

        const homePage = document.getElementById('home-page');
        const gamePage = document.getElementById('game-page');
        const resultPage = document.getElementById('result-page');
        const dailyChallengePage = document.getElementById('daily-challenge-page');
        const dailyResultPage = document.getElementById('daily-result-page');
        const timeAttackPage = document.getElementById('time-attack-page');
        const timeAttackResultPage = document.getElementById('time-attack-result-page');
        const survivalPage = document.getElementById('survival-page');
        const survivalResultPage = document.getElementById('survival-result-page');
        const multiplayerTab = document.getElementById('multiplayer-tab');

        // Fade out current page
        const currentPage = gamePage.style.display !== 'none' ? gamePage :
            resultPage.style.display !== 'none' ? resultPage :
                dailyChallengePage.style.display !== 'none' ? dailyChallengePage :
                    dailyResultPage.style.display !== 'none' ? dailyResultPage :
                        timeAttackPage.style.display !== 'none' ? timeAttackPage :
                            timeAttackResultPage.style.display !== 'none' ? timeAttackResultPage :
                                survivalPage && survivalPage.style.display !== 'none' ? survivalPage :
                                    survivalResultPage && survivalResultPage.style.display !== 'none' ? survivalResultPage :
                                        multiplayerTab && multiplayerTab.style.display !== 'none' ? multiplayerTab : null;

        if (currentPage && Utils) {
            Utils.fadeOutElement(currentPage, () => {
                Utils.fadeInElement(homePage);
                if (UI) {
                    UI.updateStreakStats();
                    UI.loadLeaderboard(this.gameJustCompleted);
                }
                this.gameJustCompleted = false;
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
            if (survivalPage) survivalPage.style.display = 'none';
            if (survivalResultPage) survivalResultPage.style.display = 'none';
            if (multiplayerTab) multiplayerTab.style.display = 'none';
            if (UI) {
                UI.updateStreakStats();
                UI.loadLeaderboard(this.gameJustCompleted);
            }
            this.gameJustCompleted = false;
        }
    },

    quitGame: function() {
        if (confirm("Are you sure you want to quit and see results?")) {
            this.endGame(false);
        }
    },

    resetGameState: function() {
        GameState.attempts = 0;
        GameState.guessHistory = [];

        const timerElement = document.getElementById('timer');
        if (timerElement) {
            timerElement.textContent = '00:00';
        }

        const attemptsEl = document.getElementById('attempts');
        if (attemptsEl) {
            attemptsEl.textContent = '0';
        }

        if (Utils) {
            Utils.updateAttemptsProgress();
        }
    },

    // ==========================================
    // EVENT LISTENERS
    // ==========================================

    init: function() {
        document.getElementById('play-easy').addEventListener('click', () => this.startGame(0));
        document.getElementById('play-medium').addEventListener('click', () => this.startGame(1));
        document.getElementById('play-hard').addEventListener('click', () => this.startGame(2));
        document.getElementById('submit-guess').addEventListener('click', () => this.submitGuess());
        document.getElementById('play-again').addEventListener('click', () => this.startGame(GameState.currentDifficulty));
        document.getElementById('game-title-header').addEventListener('click', () => this.showHomePage());
        document.getElementById('quit').addEventListener('click', () => this.showHomePage());
        document.getElementById('quit-game').addEventListener('click', () => this.quitGame());

        // Hint button
        const hintBtn = document.getElementById('hint-btn');
        if (hintBtn) {
            hintBtn.addEventListener('click', () => this.requestHint());
        } else {
            console.error('❌ Hint button not found in DOM');
        }

        // Difficulty modal handlers
        this.initDifficultyModals();
    },

    // ==========================================
    // DIFFICULTY MODAL MANAGEMENT
    // ==========================================

    initDifficultyModals: function() {
        // Time Attack modal
        const playTimeAttack = document.getElementById('play-time-attack');
        const timeAttackModal = document.getElementById('time-attack-modal');

        if (playTimeAttack && timeAttackModal) {
            playTimeAttack.addEventListener('click', () => {
                timeAttackModal.style.display = 'flex';
            });
        }

        // Survival modal
        const playSurvival = document.getElementById('play-survival');
        const survivalModal = document.getElementById('survival-modal');

        if (playSurvival && survivalModal) {
            playSurvival.addEventListener('click', () => {
                survivalModal.style.display = 'flex';
            });
        }

        // Handle difficulty selection in modals
        document.querySelectorAll('.modal-difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                const difficulty = parseInt(btn.dataset.difficulty);

                // Close the modal
                if (mode === 'time-attack' && timeAttackModal) {
                    timeAttackModal.style.display = 'none';
                } else if (mode === 'survival' && survivalModal) {
                    survivalModal.style.display = 'none';
                }

                // Start the respective game mode
                if (mode === 'time-attack' && window.TimeAttackGame) {
                    TimeAttackGame.startTimeAttackSession(difficulty);
                } else if (mode === 'survival' && window.SurvivalGame) {
                    SurvivalGame.startSurvival(difficulty);
                }
            });
        });

        // Close buttons
        document.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (timeAttackModal) timeAttackModal.style.display = 'none';
                if (survivalModal) survivalModal.style.display = 'none';
            });
        });

        // Close on outside click (backdrop)
        [timeAttackModal, survivalModal].forEach(modal => {
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.style.display = 'none';
                    }
                });
            }
        });

        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (timeAttackModal && timeAttackModal.style.display === 'flex') {
                    timeAttackModal.style.display = 'none';
                }
                if (survivalModal && survivalModal.style.display === 'flex') {
                    survivalModal.style.display = 'none';
                }
            }
        });

        // Multiplayer stats button (if implemented)
        const multiplayerStatsBtn = document.getElementById('view-multiplayer-stats');
        if (multiplayerStatsBtn) {
            multiplayerStatsBtn.addEventListener('click', () => {
                // TODO: Show multiplayer stats modal when implemented
                console.log('Multiplayer stats clicked');
                if (window.MultiplayerGame && MultiplayerGame.loadStats) {
                    // For now, just navigate to multiplayer tab
                    const playMultiplayerBtn = document.getElementById('play-multiplayer');
                    if (playMultiplayerBtn) {
                        playMultiplayerBtn.click();
                    }
                }
            });
        }
    }
};
