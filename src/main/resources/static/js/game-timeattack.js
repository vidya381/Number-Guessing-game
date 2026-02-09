/**
 * Time Attack Game Mode
 * Handles 5-minute rapid-fire challenge with score accumulation
 */

window.TimeAttackGame = {
    // ==========================================
    // SESSION MANAGEMENT
    // ==========================================

    startTimeAttackSession: async function(difficulty) {
        // Guest warning
        if (!GameState.authToken) {
            const proceed = confirm("You're playing as guest. Your score won't be saved to the leaderboard. Continue?");
            if (!proceed) return;
        }

        try {
            const headers = { 'Content-Type': 'application/json' };
            if (GameState.authToken) {
                headers['Authorization'] = `Bearer ${GameState.authToken}`;
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
                // Update state
                GameState.timeAttack.sessionId = data.sessionId;
                GameState.timeAttack.difficulty = difficulty;
                GameState.timeAttack.digitCount = data.digitCount;
                GameState.timeAttack.timeRemaining = 300;
                GameState.timeAttack.score = 0;
                GameState.timeAttack.wins = 0;
                GameState.timeAttack.gamesPlayed = 0;
                GameState.timeAttack.gameHistory = [];
                GameState.timeAttack.currentGame = { attempts: 0, startTime: Date.now() };

                // Update game status
                if (Utils) {
                    Utils.updateGameStatus('time-attack');
                }

                // Show time attack page
                const homePage = document.getElementById('home-page');
                const resultPage = document.getElementById('time-attack-result-page');
                const timeAttackPage = document.getElementById('time-attack-page');

                // Hide whichever page is currently visible
                if (homePage && homePage.style.display !== 'none') {
                    if (Utils) {
                        Utils.fadeOutElement(homePage, () => {
                            Utils.fadeInElement(timeAttackPage, 'flex');
                        });
                    }
                } else if (resultPage && resultPage.style.display !== 'none') {
                    if (Utils) {
                        Utils.fadeOutElement(resultPage, () => {
                            Utils.fadeInElement(timeAttackPage, 'flex');
                        });
                    }
                } else {
                    if (Utils) {
                        Utils.fadeInElement(timeAttackPage, 'flex');
                    }
                }

                // Setup input fields for first game
                this.createDigitInputs('ta-input-container', GameState.timeAttack.digitCount);

                // Start countdown timer
                this.startTimeAttackTimer();

                // Update UI
                const scoreEl = document.getElementById('ta-score');
                const winsEl = document.getElementById('ta-wins');
                const historyEl = document.getElementById('ta-guess-history');
                const feedbackEl = document.getElementById('ta-feedback');

                if (scoreEl) scoreEl.textContent = '0';
                if (winsEl) winsEl.textContent = '0';
                if (historyEl) historyEl.innerHTML = '';
                if (feedbackEl) feedbackEl.textContent = '';

                // Reset and update hint system
                this.resetTimeAttackHintState();
                this.updateTimeAttackHintButton();

                // Update attempts display
                const attemptsEl = document.getElementById('ta-attempts-display');
                if (attemptsEl) attemptsEl.textContent = '0';

                // Focus first input
                document.querySelector('#ta-input-container .digit-input')?.focus();
            }
        } catch (error) {
            debug.error('Failed to start Time Attack:', error);
            if (Achievements) {
                Achievements.showToast('Failed to start Time Attack. Try again!', 'error');
            }
        }
    },

    // ==========================================
    // COUNTDOWN TIMER
    // ==========================================

    startTimeAttackTimer: function() {
        const timerElement = document.getElementById('ta-timer');
        const timerBadge = document.getElementById('ta-timer-badge');

        GameState.timeAttack.timerInterval = setInterval(() => {
            GameState.timeAttack.timeRemaining--;

            const minutes = Math.floor(GameState.timeAttack.timeRemaining / 60);
            const seconds = GameState.timeAttack.timeRemaining % 60;
            if (timerElement) {
                timerElement.textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
            }

            // Visual warning when < 30 seconds
            if (GameState.timeAttack.timeRemaining <= 30 && GameState.timeAttack.timeRemaining > 10) {
                if (timerBadge) {
                    timerBadge.classList.add('timer-warning');
                    timerBadge.classList.remove('timer-critical');
                }
            }

            // Visual critical when < 10 seconds
            if (GameState.timeAttack.timeRemaining <= 10) {
                if (timerBadge) {
                    timerBadge.classList.add('timer-critical');
                    timerBadge.classList.remove('timer-warning');
                }
            }

            // Time's up!
            if (GameState.timeAttack.timeRemaining <= 0) {
                clearInterval(GameState.timeAttack.timerInterval);
                this.endTimeAttackSession();
            }
        }, 1000);
    },

    // ==========================================
    // GAME FLOW
    // ==========================================

    startTimeAttackGame: async function() {
        try {
            const response = await fetch(`/api/time-attack/start-game?sessionId=${GameState.timeAttack.sessionId}`, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('Failed to start new game');
            }

            const data = await response.json();

            if (data.expired) {
                this.endTimeAttackSession();
                return;
            }

            // Reset current game state
            GameState.timeAttack.currentGame = {
                attempts: 0,
                startTime: Date.now()
            };

            // Clear inputs, feedback, and guess history
            const inputs = document.querySelectorAll('#ta-input-container .digit-input');
            inputs.forEach(input => input.value = '');

            const feedbackEl = document.getElementById('ta-feedback');
            const historyEl = document.getElementById('ta-guess-history');

            if (feedbackEl) feedbackEl.textContent = '';
            if (historyEl) historyEl.innerHTML = '';

            // Reset hint system for new game
            this.resetTimeAttackHintState();

            // Reset attempts display
            const attemptsEl = document.getElementById('ta-attempts-display');
            if (attemptsEl) attemptsEl.textContent = '0';

            // Focus first input
            if (inputs[0]) inputs[0].focus();

        } catch (error) {
            debug.error('Failed to start new game:', error);
            if (Achievements) {
                Achievements.showToast('Failed to start new game', 'error');
            }
        }
    },

    submitTimeAttackGuess: async function() {
        const inputs = document.querySelectorAll('#ta-input-container .digit-input');
        const guess = Array.from(inputs).map(input => input.value).join('');

        // Validation
        if (guess.length !== GameState.timeAttack.digitCount) {
            if (Achievements) {
                Achievements.showToast(`Please enter all ${GameState.timeAttack.digitCount} digits! 🔢`, 'error');
            }
            return;
        }

        // Check for unique digits
        const uniqueDigits = new Set(guess);
        if (uniqueDigits.size !== guess.length) {
            if (Achievements) {
                Achievements.showToast('Oops! Each digit must be different. Try again! 🔢', 'error');
            }
            return;
        }

        GameState.timeAttack.currentGame.attempts++;

        // Update attempts display
        const attemptsEl = document.getElementById('ta-attempts-display');
        if (attemptsEl) {
            attemptsEl.textContent = GameState.timeAttack.currentGame.attempts;
        }

        try {
            const response = await fetch('/api/time-attack/guess', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: GameState.timeAttack.sessionId,
                    guess: guess
                })
            });

            if (!response.ok) {
                throw new Error('Failed to submit guess');
            }

            const data = await response.json();

            if (data.expired) {
                this.endTimeAttackSession();
                return;
            }

            if (data.won) {
                // Calculate game time
                const gameTimeMs = Date.now() - GameState.timeAttack.currentGame.startTime;
                const gameTimeSeconds = Math.floor(gameTimeMs / 1000);

                // Show win feedback
                this.showTimeAttackWinFeedback(data.points, GameState.timeAttack.currentGame.attempts, gameTimeSeconds);

                // Update session stats
                GameState.timeAttack.score = data.totalScore;
                GameState.timeAttack.wins = data.gamesWon;
                GameState.timeAttack.gamesPlayed++;

                // Record game result
                GameState.timeAttack.gameHistory.push({
                    won: true,
                    attempts: GameState.timeAttack.currentGame.attempts,
                    timeSeconds: gameTimeSeconds,
                    points: data.points
                });

                // Update UI
                const scoreEl = document.getElementById('ta-score');
                const winsEl = document.getElementById('ta-wins');
                if (scoreEl) scoreEl.textContent = GameState.timeAttack.score;
                if (winsEl) winsEl.textContent = GameState.timeAttack.wins;

                // Show coin animation (coins per win based on difficulty)
                if (GameState.currentUser && Auth) {
                    const coinsPerWin = GameState.timeAttack.difficulty === 0 ? 3 : GameState.timeAttack.difficulty === 1 ? 6 : 9;
                    // Update local coin count
                    GameState.currentUser.coins = (GameState.currentUser.coins || 0) + coinsPerWin;
                    localStorage.setItem('currentUser', JSON.stringify(GameState.currentUser));
                    // Show animation
                    Auth.showCoinAnimation(coinsPerWin);
                }

                // Play sound
                if (GameState.soundVolume > 0 && GameConfig) {
                    GameConfig.sounds.win.play();
                }

                // Start next game after 2 seconds
                setTimeout(() => {
                    this.startTimeAttackGame();
                }, 2000);

            } else {
                // Add to guess history
                this.addToTimeAttackGuessHistory(guess, data.bulls, data.cows);

                // Clear inputs for next guess
                inputs.forEach(input => input.value = '');
                if (inputs[0]) inputs[0].focus();

                // Play sound
                if (GameState.soundVolume > 0 && GameConfig) {
                    GameConfig.sounds.incorrect.play();
                }
            }

        } catch (error) {
            debug.error('Failed to submit guess:', error);
            if (Achievements) {
                Achievements.showToast('Failed to submit guess. Try again!', 'error');
            }
        }
    },

    showTimeAttackWinFeedback: function(coins, attempts, timeSeconds) {
        const feedbackElement = document.getElementById('ta-feedback');
        if (!feedbackElement) return;

        feedbackElement.innerHTML = `
            <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #14532D 0%, #4ea8de 100%); border-radius: 15px; color: white; animation: tada 0.5s;">
                <h3 style="margin: 0 0 10px 0;">🎉 CORRECT!</h3>
                <p style="font-size: 2em; font-weight: bold; margin: 10px 0;">+${coins} <i class="fas fa-coins" style="color: #ffd700;"></i></p>
                <p style="font-size: 0.9em; opacity: 0.9;">${attempts} attempts • ${timeSeconds}s</p>
            </div>
        `;

        if (Utils) {
            Utils.createConfetti();
        }
    },

    // ==========================================
    // GUESS HISTORY
    // ==========================================

    addToTimeAttackGuessHistory: function(guess, bulls, cows) {
        const historyContainer = document.getElementById('ta-guess-history');
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

        // Always scroll to top to show the newest guess
        historyContainer.scrollTop = 0;
    },

    // ==========================================
    // END SESSION
    // ==========================================

    endTimeAttackSession: async function() {
        clearInterval(GameState.timeAttack.timerInterval);

        try {
            const headers = { 'Content-Type': 'application/json' };
            if (GameState.authToken) {
                headers['Authorization'] = `Bearer ${GameState.authToken}`;
            }

            const response = await fetch(`/api/time-attack/end?sessionId=${GameState.timeAttack.sessionId}`, {
                method: 'POST',
                headers: headers
            });

            if (!response.ok) {
                throw new Error('Failed to end session');
            }

            const data = await response.json();

            // Update coins and show animation if earned
            if (data.coinsAwarded && data.coinsAwarded > 0 && GameState.currentUser && Auth) {
                GameState.currentUser.coins = data.totalCoins || (GameState.currentUser.coins + data.coinsAwarded);
                localStorage.setItem('currentUser', JSON.stringify(GameState.currentUser));
                Auth.showCoinAnimation(data.coinsAwarded);
            }

            // Show results page
            this.displayTimeAttackResults(data);

            const timeAttackPage = document.getElementById('time-attack-page');
            const resultPage = document.getElementById('time-attack-result-page');

            if (Utils) {
                Utils.fadeOutElement(timeAttackPage, () => {
                    Utils.fadeInElement(resultPage, 'flex');
                });
            }

        } catch (error) {
            debug.error('Failed to end session:', error);
            if (Achievements) {
                Achievements.showToast('Failed to save session', 'error');
            }

            // Still show results even if save failed
            const data = {
                totalScore: GameState.timeAttack.score,
                gamesWon: GameState.timeAttack.wins,
                gamesPlayed: GameState.timeAttack.gamesPlayed,
                gameDetails: GameState.timeAttack.gameHistory
            };
            this.displayTimeAttackResults(data);

            const timeAttackPage = document.getElementById('time-attack-page');
            const resultPage = document.getElementById('time-attack-result-page');

            if (Utils) {
                Utils.fadeOutElement(timeAttackPage, () => {
                    Utils.fadeInElement(resultPage, 'flex');
                });
            }
        }
    },

    // ==========================================
    // RESULTS DISPLAY - MODERN CARD DESIGN
    // ==========================================

    displayTimeAttackResults: function(data) {
        // Update game status
        if (Utils) {
            Utils.updateGameStatus('result');
        }

        const statsContainer = document.getElementById('time-attack-stats');
        if (!statsContainer) return;

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

        // Add stat cards
        const gamesWon = data.gamesWon || 0;
        const avgAttempts = data.averageAttempts ? data.averageAttempts.toFixed(1) : '--';
        const fastestTime = formatTime(data.fastestWinSeconds);

        statsGrid.appendChild(createStatCard('fas fa-trophy', gamesWon, 'Wins', gamesWon > 0));
        statsGrid.appendChild(createStatCard('fas fa-tachometer-alt', avgAttempts, 'Avg Tries'));
        statsGrid.appendChild(createStatCard('fas fa-bolt', fastestTime, 'Best Time'));

        // Leaderboard rank card (if available)
        if (data.rank && GameState.authToken) {
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
                const difficultyColors = ['#14532D', '#f39c12', '#e74c3c'];
                const difficultyNames = ['EASY', 'MED', 'HARD'];
                const diffColor = difficultyColors[GameState.timeAttack.difficulty] || '#14532D';

                gameCard.style.cssText = `
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 16px;
                    background: rgba(13, 148, 136, 0.08);
                    border-radius: 10px;
                    border-left: 4px solid ${diffColor};
                `;

                gameCard.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="background: ${diffColor}; color: white; padding: 4px 8px; border-radius: 6px; font-size: 0.7em; font-weight: 700;">${difficultyNames[GameState.timeAttack.difficulty]}</div>
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
    },

    // ==========================================
    // LEADERBOARD
    // ==========================================

    loadTimeAttackLeaderboard: async function(difficulty = 0) {
        const modal = document.getElementById('time-attack-leaderboard-modal');
        const loadingDiv = document.getElementById('ta-leaderboard-loading');
        const contentDiv = document.getElementById('ta-leaderboard-content');

        if (!modal || !loadingDiv || !contentDiv) return;

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
                contentDiv.innerHTML = '<div class="no-data">No players yet on this difficulty. Be the first! 🏆</div>';
            } else {
                // Create leaderboard table
                let html = `
                    <div class="leaderboard-table">
                        <div class="leaderboard-header">
                            <div class="lb-rank">Rank</div>
                            <div class="lb-username">Player</div>
                            <div class="lb-wins">Wins</div>
                            <div class="lb-avg">Avg</div>
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
                            <div class="lb-wins">${entry.gamesWon}</div>
                            <div class="lb-avg">${entry.averageAttempts ? entry.averageAttempts.toFixed(1) : '--'}</div>
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

    // ==========================================
    // DIGIT INPUT HELPERS
    // ==========================================

    createDigitInputs: function(containerId, digitCount) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        for (let i = 0; i < digitCount; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'digit-input';
            input.maxLength = 1;
            input.inputMode = 'numeric';
            input.pattern = '[0-9]';
            input.dataset.index = i;

            input.addEventListener('input', (e) => this.handleDigitInput(e, i, containerId));
            input.addEventListener('keydown', (e) => this.handleDigitKeydown(e, i, containerId));

            container.appendChild(input);
        }
    },

    handleDigitInput: function(e, index, containerId) {
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
        } else {
            // Last input - check auto-submit preference
            const autoSubmitEnabled = Utils.getGameplayPreference('autoSubmit');
            if (autoSubmitEnabled) {
                // Auto-submit when all digits are filled
                GameState.autoSubmitTriggered = true;
                if (containerId === 'ta-input-container') {
                    this.submitTimeAttackGuess();
                } else if (containerId === 'warmup-input-container') {
                    this.submitWarmupGuess();
                }
                // Reset flag after a short delay
                setTimeout(() => {
                    GameState.autoSubmitTriggered = false;
                }, 300);
            }
        }
    },

    handleDigitKeydown: function(e, index, containerId) {
        if (e.key === 'Backspace' && e.target.value === '') {
            // Move to previous input on backspace
            const prevInput = document.querySelector(`#${containerId} .digit-input[data-index="${index - 1}"]`);
            if (prevInput) {
                prevInput.focus();
                prevInput.select();
            }
        } else if (e.key === 'Enter' && !GameState.autoSubmitTriggered) {
            // Submit guess on Enter (only if auto-submit didn't just trigger)
            if (containerId === 'ta-input-container') {
                this.submitTimeAttackGuess();
            }
        }
    },

    // ==========================================
    // NAVIGATION
    // ==========================================

    quitTimeAttackGame: function() {
        if (confirm('Are you sure you want to end this session? Your current score will be saved.')) {
            this.endTimeAttackSession();
        }
    },

    showMainMenu: function() {
        const resultPage = document.getElementById('time-attack-result-page');
        const homePage = document.getElementById('home-page');

        if (Utils) {
            Utils.fadeOutElement(resultPage, () => {
                Utils.updateGameStatus('home');
                Utils.fadeInElement(homePage, 'flex');
            });
        }
    },

    // ==========================================
    // EVENT LISTENERS
    // ==========================================

    attachTimeAttackListeners: function() {
        // Difficulty selection buttons
        document.querySelectorAll('.ta-difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const difficulty = parseInt(btn.dataset.difficulty);
                this.startTimeAttackSession(difficulty);
            });
        });

        // Submit guess
        const submitBtn = document.getElementById('submit-ta-guess');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitTimeAttackGuess());
        }

        // Quit time attack
        const quitBtn = document.getElementById('quit-time-attack');
        if (quitBtn) {
            quitBtn.addEventListener('click', () => this.quitTimeAttackGame());
        }

        // Hint button
        const hintBtn = document.getElementById('ta-hint-btn');
        if (hintBtn) {
            hintBtn.addEventListener('click', () => this.getTimeAttackHint());
        }

        // Result page buttons
        const playAgainBtn = document.getElementById('ta-play-again');
        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => {
                this.startTimeAttackSession(GameState.timeAttack.difficulty);
            });
        }

        const mainMenuBtn = document.getElementById('ta-main-menu');
        if (mainMenuBtn) {
            mainMenuBtn.addEventListener('click', () => this.showMainMenu());
        }

        // Leaderboard modal buttons
        const viewLeaderboardBtn = document.getElementById('view-time-attack-leaderboard');
        if (viewLeaderboardBtn) {
            viewLeaderboardBtn.addEventListener('click', () => {
                this.loadTimeAttackLeaderboard(0); // Default to Easy
            });
        }

        const closeLeaderboardBtn = document.getElementById('ta-leaderboard-close');
        if (closeLeaderboardBtn) {
            closeLeaderboardBtn.addEventListener('click', () => {
                const modal = document.getElementById('time-attack-leaderboard-modal');
                if (modal && Utils) {
                    Utils.closeModalWithAnimation(modal);
                }
            });
        }

        // Leaderboard difficulty tabs
        document.querySelectorAll('#time-attack-leaderboard-modal .lb-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                // Update active tab
                document.querySelectorAll('#time-attack-leaderboard-modal .lb-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Load leaderboard for selected difficulty
                const difficulty = parseInt(tab.dataset.difficulty);
                this.loadTimeAttackLeaderboard(difficulty);
            });
        });

        // Click-outside-to-close is now handled globally in utils.js
    },

    // ==========================================
    // HINT SYSTEM
    // ==========================================

    getTimeAttackHint: async function() {
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

        const hintBtn = document.getElementById('ta-hint-btn');
        const originalHTML = hintBtn.innerHTML;
        hintBtn.disabled = true;
        hintBtn.style.opacity = '0.5';

        try {
            const response = await Utils.fetchWithTimeout('/api/time-attack/get-hint', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GameState.authToken}`
                },
                body: JSON.stringify({
                    sessionId: GameState.timeAttack.sessionId
                }),
                credentials: 'include'
            }, 8000);

            if (!response.ok) {
                const errorInfo = Utils.handleFetchError(new Error(`HTTP ${response.status}`), response);
                this.updateTimeAttackHintButton();
                hintBtn.style.opacity = '1';
                if (Achievements) {
                    Achievements.showToast(errorInfo.userMessage, 'error');
                }
                return;
            }

            const data = await response.json();

            if (data.success) {
                // Update local state
                if (!GameState.timeAttack.revealedHints) {
                    GameState.timeAttack.revealedHints = new Map();
                }
                GameState.timeAttack.revealedHints.set(data.position, data.digit);

                // Update user coins
                GameState.currentUser.coins = data.remainingCoins;
                localStorage.setItem('currentUser', JSON.stringify(GameState.currentUser));

                // Apply 10 second time penalty
                GameState.timeAttack.timeRemaining = Math.max(0, GameState.timeAttack.timeRemaining - 10);
                this.updateTimeDisplay();

                // Update UI
                this.displayTimeAttackHint(data.position, data.digit);
                this.updateTimeAttackHintButton();
                hintBtn.style.opacity = '1';

                if (Auth) {
                    Auth.updateCoinDisplay();
                    Auth.showCoinAnimation(-hintCost);
                }

                if (Achievements) {
                    Achievements.showToast(`Hint revealed! Position ${data.position + 1} is ${data.digit} (-10s) 💡`, 'warning');
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

    displayTimeAttackHint: function(position, digit) {
        const hintsContainer = document.getElementById('ta-hints-container');
        const hintsList = document.getElementById('ta-hints-list');

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

    updateTimeAttackHintButton: function() {
        const hintBtn = document.getElementById('ta-hint-btn');
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
        hintBtn.setAttribute('data-tooltip', 'Reveal one digit (+10s penalty)');
    },

    resetTimeAttackHintState: function() {
        if (GameState.timeAttack) {
            GameState.timeAttack.revealedHints = new Map();
        }

        // Hide hints container
        const hintsContainer = document.getElementById('ta-hints-container');
        if (hintsContainer) {
            hintsContainer.style.display = 'none';
        }

        // Clear hints list
        const hintsList = document.getElementById('ta-hints-list');
        if (hintsList) {
            hintsList.innerHTML = '';
        }

        // Update button
        this.updateTimeAttackHintButton();
    },

    updateTimeDisplay: function() {
        const timerElement = document.getElementById('ta-timer');
        if (timerElement && GameState.timeAttack) {
            const mins = Math.floor(GameState.timeAttack.timeRemaining / 60);
            const secs = GameState.timeAttack.timeRemaining % 60;
            timerElement.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        }
    },

    // ==========================================
    // INITIALIZATION
    // ==========================================

    init: function() {
        this.attachTimeAttackListeners();
    }
};
