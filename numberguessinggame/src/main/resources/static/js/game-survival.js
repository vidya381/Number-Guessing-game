/**
 * Survival Mode Game Logic
 * Single-life, 5-round completion challenge
 */

window.SurvivalGame = {
    // ==========================================
    // INITIALIZATION
    // ==========================================

    init: function() {
        console.log('Survival Game module initialized');
        this.attachEventListeners();
    },

    attachEventListeners: function() {
        const startButtons = document.querySelectorAll('.start-survival-btn');
        startButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const difficulty = parseInt(e.currentTarget.dataset.difficulty);
                this.startSurvival(difficulty);
            });
        });

        const submitBtn = document.getElementById('survival-submit-guess');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitGuess());
        }

        const quitBtn = document.getElementById('survival-quit-btn');
        if (quitBtn) {
            quitBtn.addEventListener('click', () => this.quitGame());
        }
    },

    // ==========================================
    // START SURVIVAL
    // ==========================================

    startSurvival: async function(difficulty) {
        if (!GameState.authToken) {
            if (Achievements) {
                Achievements.showToast('Please log in to play Survival Mode! 🔑', 'info');
            }
            return;
        }

        try {
            const response = await fetch(`/api/survival/start?difficulty=${difficulty}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GameState.authToken}`
                }
            });

            console.log('Survival start response status:', response.status);
            const data = await response.json();
            console.log('Survival start response data:', data);

            if (response.ok) {
                // Store session data
                GameState.survival = {
                    sessionId: data.sessionId,
                    difficulty: data.difficulty,
                    digitCount: data.digitCount,
                    currentRound: data.currentRound,
                    totalRounds: data.totalRounds,
                    maxAttemptsPerRound: data.maxAttemptsPerRound,
                    coinsPerRound: data.coinsPerRound,
                    completionBonus: data.completionBonus,
                    currentRoundAttempts: 0,
                    totalCoinsEarned: 0,
                    guessHistory: []
                };

                console.log('GameState.survival updated:', GameState.survival);

                // Show survival game page
                const homePage = document.getElementById('home-page');
                const survivalPage = document.getElementById('survival-page');

                if (homePage && survivalPage) {
                    if (Utils) {
                        Utils.fadeOutElement(homePage, () => {
                            Utils.fadeInElement(survivalPage, 'flex');
                        });
                    } else {
                        homePage.style.display = 'none';
                        survivalPage.style.display = 'flex';
                    }
                }

                this.setupGameUI();
                this.updateHUD();

            } else {
                console.error('Survival start failed:', data);
                if (Achievements) {
                    Achievements.showToast(data.error || 'Could not start survival mode', 'error');
                }
            }

        } catch (error) {
            console.error('Error starting survival:', error);
            if (Achievements) {
                Achievements.showToast('Connection error. Please try again!', 'error');
            }
        }
    },

    // ==========================================
    // GAME UI
    // ==========================================

    setupGameUI: function() {
        const inputContainer = document.getElementById('survival-input-container');
        if (!inputContainer) return;

        inputContainer.innerHTML = '';

        // Create input boxes for each digit
        for (let i = 0; i < GameState.survival.digitCount; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 1;
            input.className = 'digit-input';
            input.dataset.index = i;
            input.addEventListener('input', (e) => this.handleDigitInput(e, i));
            input.addEventListener('keydown', (e) => this.handleKeyDown(e, i));
            inputContainer.appendChild(input);
        }

        // Focus first input
        inputContainer.firstChild?.focus();

        // Clear history
        const historyEl = document.getElementById('survival-guess-history');
        if (historyEl) {
            historyEl.innerHTML = '';
        }
    },

    updateHUD: function() {
        const roundEl = document.getElementById('survival-round-display');
        const coinsEl = document.getElementById('survival-coins-display');
        const attemptsEl = document.getElementById('survival-attempts-display');

        if (roundEl) {
            roundEl.textContent = `ROUND ${GameState.survival.currentRound}/${GameState.survival.totalRounds}`;
        }
        if (coinsEl) {
            coinsEl.textContent = GameState.survival.totalCoinsEarned;
        }
        if (attemptsEl) {
            const remaining = GameState.survival.maxAttemptsPerRound - GameState.survival.currentRoundAttempts;
            attemptsEl.textContent = `${remaining}/${GameState.survival.maxAttemptsPerRound}`;
        }
    },

    handleDigitInput: function(e, index) {
        const value = e.target.value;

        // Only allow digits
        if (!/^\d*$/.test(value)) {
            e.target.value = '';
            return;
        }

        // Move to next input if digit entered
        if (value.length === 1) {
            const inputs = document.querySelectorAll('#survival-input-container .digit-input');
            if (index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        }
    },

    handleKeyDown: function(e, index) {
        const inputs = document.querySelectorAll('#survival-input-container .digit-input');

        // Backspace - move to previous input
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
            inputs[index - 1].focus();
        }

        // Enter - submit guess
        if (e.key === 'Enter') {
            this.submitGuess();
        }
    },

    // ==========================================
    // SUBMIT GUESS
    // ==========================================

    submitGuess: async function() {
        const inputs = document.querySelectorAll('#survival-input-container .digit-input');
        const guess = Array.from(inputs).map(input => input.value).join('');

        // Validate guess
        if (guess.length !== GameState.survival.digitCount) {
            if (Achievements) {
                Achievements.showToast(`Enter all ${GameState.survival.digitCount} digits!`, 'error');
            }
            return;
        }

        // Check for unique digits
        const uniqueDigits = new Set(guess);
        if (uniqueDigits.size !== guess.length) {
            if (Achievements) {
                Achievements.showToast('Each digit must be different!', 'error');
            }
            return;
        }

        try {
            const response = await fetch('/api/survival/guess', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: GameState.survival.sessionId,
                    guess: guess
                })
            });

            const data = await response.json();

            if (response.ok) {
                GameState.survival.currentRoundAttempts = data.currentRoundAttempts;

                // Add to history
                this.addGuessToHistory(guess, data.bulls, data.cows);

                // Update HUD
                this.updateHUD();

                // Clear inputs
                inputs.forEach(input => input.value = '');
                inputs[0].focus();

                // Check if won or lost round
                if (data.wonRound) {
                    this.handleRoundWon();
                } else if (data.lostRound) {
                    this.handleRoundLost();
                }

            } else {
                if (Achievements) {
                    Achievements.showToast(data.error || 'Could not submit guess', 'error');
                }
            }

        } catch (error) {
            console.error('Error submitting guess:', error);
            if (Achievements) {
                Achievements.showToast('Connection error!', 'error');
            }
        }
    },

    addGuessToHistory: function(guess, bulls, cows) {
        const historyContainer = document.getElementById('survival-guess-history');
        if (!historyContainer) return;

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
    },

    // ==========================================
    // ROUND COMPLETION
    // ==========================================

    handleRoundWon: async function() {
        try {
            const response = await fetch('/api/survival/round-complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: GameState.survival.sessionId,
                    won: true
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Award coins for this round
                GameState.survival.totalCoinsEarned += data.coinsEarned;

                if (data.completed) {
                    // Completed all 5 rounds!
                    this.showVictoryScreen(data);
                } else {
                    // Move to next round
                    GameState.survival.currentRound = data.nextRound;
                    GameState.survival.currentRoundAttempts = 0;
                    GameState.survival.guessHistory = [];

                    // Show round complete message
                    if (Achievements) {
                        Achievements.showToast(
                            `Round ${data.nextRound - 1} Complete! +${data.coinsEarned} coins 🎉`,
                            'success'
                        );
                    }

                    // Reset UI for next round
                    setTimeout(() => {
                        this.setupGameUI();
                        this.updateHUD();
                    }, 2000);
                }
            }

        } catch (error) {
            console.error('Error completing round:', error);
        }
    },

    handleRoundLost: async function() {
        try {
            const response = await fetch('/api/survival/round-complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: GameState.survival.sessionId,
                    won: false
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showGameOverScreen(data);
            }

        } catch (error) {
            console.error('Error completing round:', error);
        }
    },

    // ==========================================
    // END GAME
    // ==========================================

    quitGame: async function() {
        if (!confirm('Quit survival mode? You will lose all progress!')) {
            return;
        }

        try {
            await fetch('/api/survival/end', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GameState.authToken}`
                },
                body: JSON.stringify({
                    sessionId: GameState.survival.sessionId
                })
            });

            // Navigate back to home page
            const survivalPage = document.getElementById('survival-page');
            const homePage = document.getElementById('home-page');

            if (survivalPage && homePage) {
                if (Utils) {
                    Utils.fadeOutElement(survivalPage, () => {
                        Utils.fadeInElement(homePage, 'block');
                    });
                } else {
                    survivalPage.style.display = 'none';
                    homePage.style.display = 'block';
                }
            }

            GameState.resetSurvival();

        } catch (error) {
            console.error('Error quitting:', error);
        }
    },

    showVictoryScreen: async function(data) {
        // End session to save to database
        try {
            const endResponse = await fetch('/api/survival/end', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GameState.authToken}`
                },
                body: JSON.stringify({
                    sessionId: GameState.survival.sessionId
                })
            });

            const endData = await endResponse.json();

            // Show result page
            const survivalPage = document.getElementById('survival-page');
            const resultPage = document.getElementById('survival-result-page');

            if (survivalPage && resultPage) {
                if (Utils) {
                    Utils.fadeOutElement(survivalPage, () => {
                        Utils.fadeInElement(resultPage, 'flex');
                    });
                } else {
                    survivalPage.style.display = 'none';
                    resultPage.style.display = 'flex';
                }
            }

            const resultContainer = document.getElementById('survival-result-content');
            if (resultContainer) {
                resultContainer.innerHTML = `
                    <h2>🎉 VICTORY! 🎉</h2>
                    <div class="result-stats">
                        <p><strong>Rounds Survived:</strong> 5/5</p>
                        <p><strong>Total Attempts:</strong> ${data.totalAttemptsUsed}</p>
                        <p><strong>Coins Earned:</strong> ${data.totalCoinsEarned}</p>
                        ${endData.rank ? `<p><strong>Rank:</strong> #${endData.rank}</p>` : ''}
                    </div>
                `;
            }

            // Update coin display
            if (endData.totalCoins && Auth) {
                GameState.currentUser.coins = endData.totalCoins;
                Auth.updateCoinDisplay();
                Auth.showCoinAnimation(data.totalCoinsEarned);
            }

        } catch (error) {
            console.error('Error ending session:', error);
        }
    },

    showGameOverScreen: async function(data) {
        // End session to save to database
        try {
            const endResponse = await fetch('/api/survival/end', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GameState.authToken}`
                },
                body: JSON.stringify({
                    sessionId: GameState.survival.sessionId
                })
            });

            const endData = await endResponse.json();

            // Show result page
            const survivalPage = document.getElementById('survival-page');
            const resultPage = document.getElementById('survival-result-page');

            if (survivalPage && resultPage) {
                if (Utils) {
                    Utils.fadeOutElement(survivalPage, () => {
                        Utils.fadeInElement(resultPage, 'flex');
                    });
                } else {
                    survivalPage.style.display = 'none';
                    resultPage.style.display = 'flex';
                }
            }

            const resultContainer = document.getElementById('survival-result-content');
            if (resultContainer) {
                resultContainer.innerHTML = `
                    <h2>💀 GAME OVER 💀</h2>
                    <div class="result-stats">
                        <p><strong>Rounds Survived:</strong> ${data.roundsSurvived}/5</p>
                        <p><strong>Total Attempts:</strong> ${data.totalAttemptsUsed}</p>
                        <p><strong>Coins Earned:</strong> ${data.totalCoinsEarned}</p>
                        ${endData.rank ? `<p><strong>Rank:</strong> #${endData.rank}</p>` : ''}
                    </div>
                `;
            }

            // Update coin display
            if (endData.totalCoins && Auth) {
                GameState.currentUser.coins = endData.totalCoins;
                Auth.updateCoinDisplay();
                if (data.totalCoinsEarned > 0) {
                    Auth.showCoinAnimation(data.totalCoinsEarned);
                }
            }

        } catch (error) {
            console.error('Error ending session:', error);
        }
    }
};
