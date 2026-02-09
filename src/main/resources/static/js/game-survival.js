/**
 * Survival Mode Game Logic
 * Single-life, 5-round completion challenge
 */

window.SurvivalGame = {
    // ==========================================
    // INITIALIZATION
    // ==========================================

    init: function() {
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

        // Hint button
        const hintBtn = document.getElementById('survival-hint-btn');
        if (hintBtn) {
            hintBtn.addEventListener('click', () => this.getSurvivalHint());
        }

        // Result page buttons
        const playAgainBtn = document.getElementById('survival-play-again');
        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => {
                this.startSurvival(GameState.survival.difficulty);
            });
        }

        const mainMenuBtn = document.getElementById('survival-main-menu');
        if (mainMenuBtn) {
            mainMenuBtn.addEventListener('click', () => this.showHomeFromResult());
        }

        // Leaderboard modal buttons
        const viewLeaderboardBtn = document.getElementById('view-survival-leaderboard');
        if (viewLeaderboardBtn) {
            viewLeaderboardBtn.addEventListener('click', () => {
                this.loadSurvivalLeaderboard(0); // Default to Easy
            });
        }

        const closeLeaderboardBtn = document.getElementById('survival-leaderboard-close');
        if (closeLeaderboardBtn) {
            closeLeaderboardBtn.addEventListener('click', () => {
                const modal = document.getElementById('survival-leaderboard-modal');
                if (modal && Utils) {
                    Utils.closeModalWithAnimation(modal);
                }
            });
        }

        // Leaderboard difficulty tabs
        document.querySelectorAll('#survival-leaderboard-modal .lb-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                // Update active tab
                document.querySelectorAll('#survival-leaderboard-modal .lb-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Load leaderboard for selected difficulty
                const difficulty = parseInt(tab.dataset.difficulty);
                this.loadSurvivalLeaderboard(difficulty);
            });
        });

        // Use event delegation for digit inputs (prevents memory leaks)
        const inputContainer = document.getElementById('survival-input-container');
        if (inputContainer) {
            inputContainer.addEventListener('input', (e) => {
                if (e.target.classList.contains('digit-input')) {
                    const index = parseInt(e.target.dataset.index);
                    this.handleDigitInput(e, index);
                }
            });

            inputContainer.addEventListener('keydown', (e) => {
                if (e.target.classList.contains('digit-input')) {
                    const index = parseInt(e.target.dataset.index);
                    this.handleKeyDown(e, index);
                }
            });
        }
    },

    // ==========================================
    // START SURVIVAL
    // ==========================================

    startSurvival: async function(difficulty) {
        try {
            const headers = {};
            if (GameState.authToken) {
                headers['Authorization'] = `Bearer ${GameState.authToken}`;
            }

            const response = await fetch(`/api/survival/start?difficulty=${difficulty}`, {
                method: 'POST',
                headers: headers
            });

            const data = await response.json();

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

                // Show survival game page
                const homePage = document.getElementById('home-page');
                const resultPage = document.getElementById('survival-result-page');
                const survivalPage = document.getElementById('survival-page');

                // Transition from whichever page is currently visible
                if (homePage && homePage.style.display !== 'none') {
                    if (Utils) {
                        Utils.fadeOutElement(homePage, () => {
                            Utils.fadeInElement(survivalPage, 'flex');
                        });
                    } else {
                        homePage.style.display = 'none';
                        survivalPage.style.display = 'flex';
                    }
                } else if (resultPage && resultPage.style.display !== 'none') {
                    if (Utils) {
                        Utils.fadeOutElement(resultPage, () => {
                            Utils.fadeInElement(survivalPage, 'flex');
                        });
                    } else {
                        resultPage.style.display = 'none';
                        survivalPage.style.display = 'flex';
                    }
                } else {
                    if (Utils) {
                        Utils.fadeInElement(survivalPage, 'flex');
                    } else {
                        survivalPage.style.display = 'flex';
                    }
                }

                this.setupGameUI();
                this.updateHUD();

                // Reset and update hint system
                this.resetSurvivalHintState();
                this.updateSurvivalHintButton();

            } else {
                debug.error('Survival start failed:', data);
                if (Achievements) {
                    Achievements.showToast(data.error || 'Could not start survival mode', 'error');
                }
            }

        } catch (error) {
            debug.error('Error starting survival:', error);
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
        // Event listeners are handled by parent container via event delegation (see attachEventListeners)
        for (let i = 0; i < GameState.survival.digitCount; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 1;
            input.className = 'digit-input';
            input.dataset.index = i;
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
            } else {
                // Last input - check auto-submit preference
                const autoSubmitEnabled = Utils.getGameplayPreference('autoSubmit');
                if (autoSubmitEnabled) {
                    // Auto-submit when all digits are filled
                    GameState.autoSubmitTriggered = true;
                    this.submitGuess();
                    // Reset flag after a short delay
                    setTimeout(() => {
                        GameState.autoSubmitTriggered = false;
                    }, 300);
                }
            }
        }
    },

    handleKeyDown: function(e, index) {
        const inputs = document.querySelectorAll('#survival-input-container .digit-input');

        // Backspace - move to previous input
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
            inputs[index - 1].focus();
        }

        // Enter - submit guess (only if auto-submit didn't just trigger)
        if (e.key === 'Enter' && !GameState.autoSubmitTriggered) {
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
            debug.error('Error submitting guess:', error);
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
                        // Reset hints for new round
                        this.resetSurvivalHintState();
                    }, 2000);
                }
            } else {
                debug.error('Round complete failed:', data);
                if (Achievements) {
                    Achievements.showToast(data.error || 'Failed to complete round', 'error');
                }
            }

        } catch (error) {
            debug.error('Error completing round:', error);
            if (Achievements) {
                Achievements.showToast('Connection error!', 'error');
            }
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
            } else {
                debug.error('Round complete failed:', data);
                if (Achievements) {
                    Achievements.showToast(data.error || 'Failed to complete round', 'error');
                }
            }

        } catch (error) {
            debug.error('Error completing round:', error);
            if (Achievements) {
                Achievements.showToast('Connection error!', 'error');
            }
        }
    },

    // ==========================================
    // RESULTS DISPLAY
    // ==========================================

    displaySurvivalResults: function(data) {
        if (Utils) {
            Utils.updateGameStatus('result');
        }

        const statsContainer = document.getElementById('survival-stats');
        if (!statsContainer) return;

        statsContainer.textContent = '';

        const completed = data.roundsSurvived >= 5;
        const title = completed ? '🎉 VICTORY!' : '💀 SESSION ENDED';

        // Hero Section - Coins Earned
        const heroSection = document.createElement('div');
        heroSection.style.cssText = 'text-align: center; margin-bottom: 30px;';
        heroSection.innerHTML = `
            <h2 style="color: var(--primary-color); margin: 0 0 20px 0; font-size: 1.5em; font-weight: 700;">${title}</h2>
            <div style="background: linear-gradient(135deg, ${completed ? '#14532D 0%, #4ea8de' : '#8b0000 0%, #4a0000'} 100%); padding: 30px; border-radius: 20px; margin-bottom: 15px; box-shadow: 0 8px 24px ${completed ? 'rgba(20, 83, 45, 0.3)' : 'rgba(139, 0, 0, 0.3)'};">
                <div style="font-size: 3.5em; font-weight: 800; color: #fff; line-height: 1;">
                    ${data.coinsEarned || 0} <i class="fas fa-coins" style="font-size: 0.8em; color: #ffd700;"></i>
                </div>
                <div style="font-size: 0.9em; color: rgba(255,255,255,0.9); margin-top: 8px; font-weight: 600;">COINS EARNED</div>
            </div>
        `;
        statsContainer.appendChild(heroSection);

        // Stats Grid - 2x2 Grid with exactly 4 cards
        const statsGrid = document.createElement('div');
        statsGrid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px;';

        const createStatCard = (icon, value, label, highlight = false) => {
            const card = document.createElement('div');
            const bgColor = highlight ? 'linear-gradient(135deg, #14532D 0%, #4ea8de 100%)' : 'rgba(13, 148, 136, 0.1)';
            const textColor = highlight ? '#fff' : 'var(--text-color)';
            card.style.cssText = `background: ${bgColor}; padding: 18px; border-radius: 12px; text-align: center; border: 1px solid rgba(13, 148, 136, 0.2); pointer-events: none; cursor: default;`;
            card.innerHTML = `
                <i class="${icon}" style="font-size: 2em; color: ${highlight ? '#fff' : 'var(--primary-color)'}; margin-bottom: 8px;"></i>
                <div style="font-size: 1.8em; font-weight: 700; color: ${textColor}; line-height: 1.2;">${value}</div>
                <div style="font-size: 0.75em; color: ${highlight ? 'rgba(255,255,255,0.9)' : 'var(--text-secondary)'}; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">${label}</div>
            `;
            return card;
        };

        // Card 1: Rounds Cleared
        const roundsValue = `${data.roundsSurvived}/5`;
        statsGrid.appendChild(createStatCard('fas fa-shield-alt', roundsValue, 'Cleared', completed));

        // Card 2: Total Attempts
        statsGrid.appendChild(createStatCard('fas fa-bullseye', data.totalAttemptsUsed || 0, 'Total Tries'));

        // Card 3: Average Attempts per Round
        const avgAttempts = data.roundsSurvived > 0
            ? (data.totalAttemptsUsed / data.roundsSurvived).toFixed(1)
            : '0.0';
        statsGrid.appendChild(createStatCard('fas fa-tachometer-alt', avgAttempts, 'Avg Per Round'));

        // Card 4: Rank or Difficulty
        if (data.rank && GameState.authToken) {
            const rankEmoji = data.rank === 1 ? '🥇' : data.rank === 2 ? '🥈' : data.rank === 3 ? '🥉' : '📊';
            const isTopThree = data.rank <= 3;
            statsGrid.appendChild(createStatCard('fas fa-ranking-star', `${rankEmoji} #${data.rank}`, 'Rank', isTopThree));
        } else {
            // Show difficulty level
            const difficultyNames = ['EASY', 'MEDIUM', 'HARD'];
            const difficultyIcons = ['fas fa-smile', 'fas fa-meh', 'fas fa-fire'];
            const difficulty = GameState.survival?.difficulty ?? 0;
            statsGrid.appendChild(createStatCard(difficultyIcons[difficulty], difficultyNames[difficulty], 'Difficulty'));
        }

        statsContainer.appendChild(statsGrid);
    },

    // ==========================================
    // END GAME
    // ==========================================

    quitGame: async function() {
        if (!confirm('End session? Your progress will be saved.')) {
            return;
        }

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

            // Display results
            this.displaySurvivalResults(endData);

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

            // Update coin display
            if (endData.totalCoins && Auth) {
                GameState.currentUser.coins = endData.totalCoins;
                Auth.updateCoinDisplay();
                if (endData.coinsEarned > 0) {
                    Auth.showCoinAnimation(endData.coinsEarned);
                }
            }

        } catch (error) {
            debug.error('Error ending session:', error);
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

            // Use endData as single source of truth (it's what was saved to database)
            this.displaySurvivalResults(endData);

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

            // Update coin display
            if (endData.totalCoins && Auth) {
                GameState.currentUser.coins = endData.totalCoins;
                Auth.updateCoinDisplay();
                if (endData.coinsEarned > 0) {
                    Auth.showCoinAnimation(endData.coinsEarned);
                }
            }

        } catch (error) {
            debug.error('Error ending session:', error);
        }
    },

    showHomeFromResult: function() {
        const resultPage = document.getElementById('survival-result-page');
        const homePage = document.getElementById('home-page');

        if (resultPage && homePage) {
            if (Utils) {
                Utils.fadeOutElement(resultPage, () => {
                    Utils.fadeInElement(homePage, 'block');
                });
            } else {
                resultPage.style.display = 'none';
                homePage.style.display = 'block';
            }
        }

        GameState.resetSurvival();
    },

    // ==========================================
    // LEADERBOARD
    // ==========================================

    loadSurvivalLeaderboard: async function(difficulty = 0) {
        const modal = document.getElementById('survival-leaderboard-modal');
        const loadingDiv = document.getElementById('survival-leaderboard-loading');
        const contentDiv = document.getElementById('survival-leaderboard-content');

        if (!modal || !loadingDiv || !contentDiv) return;

        // Check if modal is already open (before we start loading)
        const isAlreadyOpen = modal.style.display === 'flex';

        // Show loading state
        loadingDiv.style.display = 'block';
        contentDiv.style.display = 'none';

        try {
            const response = await fetch(`/api/survival/leaderboard?difficulty=${difficulty}&limit=50`);

            if (!response.ok) {
                throw new Error('Failed to load leaderboard');
            }

            const leaderboard = await response.json();

            // Hide loading, show content
            loadingDiv.style.display = 'none';
            contentDiv.style.display = 'block';

            if (leaderboard.length === 0) {
                contentDiv.innerHTML = '<div class="no-data">No players yet on this difficulty. Be the first! 🏆</div>';
            } else {
                // Create leaderboard table
                let html = `
                    <div class="leaderboard-table">
                        <div class="leaderboard-header">
                            <div class="lb-rank">Rank</div>
                            <div class="lb-username">Player</div>
                            <div class="lb-rounds">Cleared</div>
                            <div class="lb-attempts">Attempts</div>
                        </div>
                `;

                leaderboard.forEach((entry, index) => {
                    const rankClass = index < 3 ? `top-${index + 1}` : '';
                    const isCurrentUser = GameState.currentUser && entry.username === GameState.currentUser.username;
                    const rowClass = isCurrentUser ? `${rankClass} current-user` : rankClass;
                    const escapedUsername = Utils ? Utils.escapeHtml(entry.username) : entry.username;
                    const rankDisplay = Utils ? Utils.getRankDisplay(entry.rank) : entry.rank;

                    html += `
                        <div class="leaderboard-row ${rowClass}">
                            <div class="lb-rank">${rankDisplay}</div>
                            <div class="lb-username">${escapedUsername}${isCurrentUser ? ' (You)' : ''}</div>
                            <div class="lb-rounds">${entry.roundsSurvived}/5</div>
                            <div class="lb-attempts">${entry.totalAttemptsUsed}</div>
                        </div>
                    `;
                });

                html += '</div>';
                contentDiv.innerHTML = html;
            }

        } catch (error) {
            debug.error('Failed to load leaderboard:', error);
            loadingDiv.style.display = 'none';
            contentDiv.style.display = 'block';
            contentDiv.innerHTML = '<div class="error-message">Couldn\'t load the leaderboard. Try again in a moment! 🏆</div>';
        }

        // Only animate modal opening if it wasn't already open
        // This prevents re-animation when switching tabs
        if (!isAlreadyOpen && Utils) {
            Utils.openModalWithAnimation(modal);
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

            // Use endData as single source of truth (it's what was saved to database)
            this.displaySurvivalResults(endData);

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

            // Update coin display
            if (endData.totalCoins && Auth) {
                GameState.currentUser.coins = endData.totalCoins;
                Auth.updateCoinDisplay();
                if (endData.coinsEarned > 0) {
                    Auth.showCoinAnimation(endData.coinsEarned);
                }
            }

        } catch (error) {
            debug.error('Error ending session:', error);
        }
    },

    // ==========================================
    // HINT SYSTEM
    // ==========================================

    getSurvivalHint: async function() {
        if (!GameState.authToken || !GameState.currentUser) {
            if (Achievements) {
                Achievements.showToast('Login required to use hints!', 'error');
            }
            return;
        }

        const hintCost = 10;
        if (GameState.currentUser.coins < hintCost) {
            if (Achievements) {
                Achievements.showToast(`Need ${hintCost} coins (you have ${GameState.currentUser.coins})`, 'error');
            }
            return;
        }

        const hintBtn = document.getElementById('survival-hint-btn');
        const originalHTML = hintBtn.innerHTML;
        hintBtn.disabled = true;
        hintBtn.style.opacity = '0.5';

        try {
            const response = await Utils.fetchWithTimeout('/api/survival/get-hint', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GameState.authToken}`
                },
                body: JSON.stringify({
                    sessionId: GameState.survival.sessionId
                }),
                credentials: 'include'
            }, 8000);

            if (!response.ok) {
                const errorInfo = Utils.handleFetchError(new Error(`HTTP ${response.status}`), response);
                this.updateSurvivalHintButton();
                hintBtn.style.opacity = '1';
                if (Achievements) {
                    Achievements.showToast(errorInfo.userMessage, 'error');
                }
                return;
            }

            const data = await response.json();

            if (data.success) {
                // Update local state
                if (!GameState.survival.revealedHints) {
                    GameState.survival.revealedHints = new Map();
                }
                GameState.survival.revealedHints.set(data.position, data.digit);

                // Update user coins
                GameState.currentUser.coins = data.remainingCoins;
                localStorage.setItem('currentUser', JSON.stringify(GameState.currentUser));

                // Update UI
                this.displaySurvivalHint(data.position, data.digit);
                this.updateSurvivalHintButton();
                hintBtn.style.opacity = '1';

                if (Auth) {
                    Auth.updateCoinDisplay();
                    Auth.showCoinAnimation(-hintCost);
                }

                if (Achievements) {
                    Achievements.showToast(`Hint revealed! Position ${data.position + 1} is ${data.digit} 💡`, 'success');
                }
            } else {
                hintBtn.disabled = false;
                hintBtn.style.opacity = '1';
                if (Achievements) {
                    Achievements.showToast(data.message || 'Failed to get hint', 'error');
                }
            }
        } catch (error) {
            hintBtn.innerHTML = originalHTML;
            hintBtn.disabled = false;
            hintBtn.style.opacity = '1';
            const errorInfo = Utils.handleFetchError(error);
            if (Achievements) {
                Achievements.showToast(errorInfo.userMessage, 'error');
            }
        }
    },

    displaySurvivalHint: function(position, digit) {
        const hintsContainer = document.getElementById('survival-hints-container');
        const hintsList = document.getElementById('survival-hints-list');

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

    updateSurvivalHintButton: function() {
        const hintBtn = document.getElementById('survival-hint-btn');
        if (!hintBtn) return;

        const hintCost = 10;

        // Recreate button HTML
        hintBtn.innerHTML = `<span class="hint-text">Hint</span> <span class="hint-cost">${hintCost}</span> <i class="fas fa-coins"></i>`;

        // Disable if not logged in
        if (!GameState.currentUser || !GameState.authToken) {
            hintBtn.disabled = true;
            hintBtn.setAttribute('data-locked', 'true');
            hintBtn.setAttribute('data-tooltip', 'Login required for hints');
            return;
        }

        // Disable if insufficient coins
        if (GameState.currentUser.coins < hintCost) {
            hintBtn.disabled = true;
            hintBtn.setAttribute('data-locked', 'true');
            hintBtn.setAttribute('data-tooltip', `Need ${hintCost} coins (you have ${GameState.currentUser.coins})`);
            return;
        }

        // Enable button
        hintBtn.disabled = false;
        hintBtn.removeAttribute('data-locked');
        hintBtn.setAttribute('data-tooltip', 'Reveal one digit position');
    },

    resetSurvivalHintState: function() {
        if (GameState.survival) {
            GameState.survival.revealedHints = new Map();
        }

        // Hide hints container
        const hintsContainer = document.getElementById('survival-hints-container');
        if (hintsContainer) {
            hintsContainer.style.display = 'none';
        }

        // Clear hints list
        const hintsList = document.getElementById('survival-hints-list');
        if (hintsList) {
            hintsList.innerHTML = '';
        }

        // Update button
        this.updateSurvivalHintButton();
    }
};
