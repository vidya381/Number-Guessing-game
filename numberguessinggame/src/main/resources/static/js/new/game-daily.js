/**
 * Daily Challenge Game Mode
 * Handles one daily challenge per day with leaderboard ranking
 */

window.DailyGame = {
    // ==========================================
    // LOAD DAILY CHALLENGE INFO
    // ==========================================

    loadDailyChallengeInfo: async function() {
        try {
            const headers = {};
            if (GameState.authToken) {
                headers['Authorization'] = `Bearer ${GameState.authToken}`;
            }

            const response = await fetch('/api/daily-challenge/info', {
                method: 'GET',
                headers: headers
            });

            const data = await response.json();

            if (response.ok) {
                GameState.dailyChallenge.info = data;

                // Update UI
                const dateEl = document.getElementById('challenge-date');
                const difficultyEl = document.getElementById('challenge-difficulty');
                const playersEl = document.getElementById('challenge-players');

                if (dateEl && Utils) {
                    dateEl.textContent = Utils.formatDate(data.challengeDate);
                }
                if (difficultyEl) {
                    difficultyEl.textContent = data.difficultyText;
                }
                if (playersEl) {
                    playersEl.textContent = `${data.totalPlayers} player${data.totalPlayers !== 1 ? 's' : ''}`;
                }

                const playBtn = document.getElementById('play-daily-challenge');
                const statusDiv = document.getElementById('daily-challenge-status');

                if (data.alreadyAttempted && data.userAttempt) {
                    // User already completed today's challenge
                    if (playBtn) {
                        playBtn.disabled = true;
                        playBtn.innerHTML = '<i class="fas fa-check"></i> COMPLETED TODAY';
                    }

                    if (statusDiv) {
                        statusDiv.style.display = 'block';
                        statusDiv.innerHTML = `
                            <h3>✓ Challenge Complete!</h3>
                            <p><strong>Attempts:</strong> ${data.userAttempt.attempts}</p>
                            <p><strong>Time:</strong> ${data.userAttempt.timeDisplay}</p>
                            ${data.userAttempt.won && data.userAttempt.rank ?
                                `<div class="rank-display">🏆 Rank #${data.userAttempt.rank}</div>` :
                                '<p>Better luck tomorrow!</p>'}
                        `;
                    }
                } else {
                    // Can still play
                    if (playBtn) {
                        playBtn.disabled = false;
                        playBtn.innerHTML = '<i class="fas fa-play"></i> PLAY NOW';
                    }
                    if (statusDiv) {
                        statusDiv.style.display = 'none';
                    }
                }
            } else {
                console.error('Failed to load daily challenge info:', data.error);
            }
        } catch (error) {
            console.error('Error loading daily challenge info:', error);
        }
    },

    // ==========================================
    // START DAILY CHALLENGE
    // ==========================================

    playDailyChallenge: async function() {
        if (!GameState.authToken) {
            if (Achievements) {
                Achievements.showToast('Please log in to play the daily challenge! 🔑', 'info');
            }
            const authModal = document.getElementById('auth-modal');
            if (authModal && Utils) {
                Utils.openModalWithAnimation(authModal);
            }
            return;
        }

        if (!GameState.dailyChallenge.info || GameState.dailyChallenge.info.alreadyAttempted) {
            if (Achievements) {
                Achievements.showToast('You\'ve already completed today\'s challenge! 📅', 'info');
            }
            return;
        }

        console.log('=== Starting Daily Challenge ===');
        console.log('Auth Token:', GameState.authToken ? 'Present' : 'Missing');

        try {
            const response = await fetch('/api/daily-challenge/start', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GameState.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Start response status:', response.status);
            const data = await response.json();
            console.log('Start response data:', data);

            if (response.ok) {
                GameState.dailyChallenge.sessionId = data.sessionId;
                GameState.dailyChallenge.digitCount = data.digitCount;
                console.log('Session created:', GameState.dailyChallenge.sessionId);
                console.log('Digit count:', GameState.dailyChallenge.digitCount);
                this.startDailyChallengeGame();
            } else {
                console.error('Failed to start:', data.error);
                if (Achievements) {
                    Achievements.showToast(data.error || 'Couldn\'t start the daily challenge. Try again! 🎮', 'error');
                }
            }
        } catch (error) {
            console.error('Start error:', error);
            if (Achievements) {
                Achievements.showToast('Couldn\'t start the daily challenge. Check your connection! 🔄', 'error');
            }
        }
    },

    // ==========================================
    // GAME LIFECYCLE
    // ==========================================

    startDailyChallengeGame: function() {
        // Reset state
        GameState.dailyChallenge.attempts = 0;
        GameState.dailyChallenge.guessHistory = [];
        GameState.dailyChallenge.startTime = Date.now();

        // Update game status
        if (Utils) {
            Utils.updateGameStatus('daily-challenge');
        }

        // Hide home, show daily challenge page
        const homePage = document.getElementById('home-page');
        const dailyChallengePage = document.getElementById('daily-challenge-page');

        if (Utils) {
            Utils.fadeOutElement(homePage, () => {
                Utils.fadeInElement(dailyChallengePage, 'flex');
            });
        }

        // Create input boxes
        const inputContainer = document.getElementById('daily-input-container');
        if (inputContainer) {
            inputContainer.innerHTML = '';

            for (let i = 0; i < GameState.dailyChallenge.digitCount; i++) {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'digit-input';
                input.maxLength = 1;
                input.inputMode = 'numeric';
                input.pattern = '[0-9]';
                input.dataset.index = i;

                input.addEventListener('input', (e) => this.handleDailyDigitInput(e, i));
                input.addEventListener('keydown', (e) => this.handleDailyDigitKeydown(e, i));

                inputContainer.appendChild(input);
            }

            // Focus first input
            const firstInput = inputContainer.querySelector('.digit-input');
            if (firstInput) firstInput.focus();
        }

        // Start timer
        const attemptsEl = document.getElementById('daily-attempts');
        if (attemptsEl) attemptsEl.textContent = '0';

        this.startDailyChallengeTimer();

        // Clear history
        const historyEl = document.getElementById('daily-guess-history');
        if (historyEl) historyEl.innerHTML = '';
    },

    // ==========================================
    // TIMER
    // ==========================================

    startDailyChallengeTimer: function() {
        GameState.dailyChallenge.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - GameState.dailyChallenge.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;

            // Update timer display
            const dailyTimerElement = document.getElementById('daily-timer');
            if (dailyTimerElement) {
                dailyTimerElement.textContent =
                    `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }
        }, 1000);
    },

    // ==========================================
    // INPUT HANDLING
    // ==========================================

    handleDailyDigitInput: function(e, index) {
        const inputs = document.querySelectorAll('#daily-input-container .digit-input');
        const value = e.target.value;

        if (value && /^\d$/.test(value)) {
            // Valid digit, move to next
            if (index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        }
    },

    handleDailyDigitKeydown: function(e, index) {
        const inputs = document.querySelectorAll('#daily-input-container .digit-input');

        if (e.key === 'Backspace' && !e.target.value && index > 0) {
            inputs[index - 1].focus();
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputs[index - 1].focus();
        } else if (e.key === 'ArrowRight' && index < inputs.length - 1) {
            inputs[index + 1].focus();
        } else if (e.key === 'Enter') {
            this.submitDailyGuess();
        }
    },

    // ==========================================
    // SUBMIT GUESS
    // ==========================================

    submitDailyGuess: async function() {
        const inputs = document.querySelectorAll('#daily-input-container .digit-input');
        const guess = Array.from(inputs).map(input => input.value).join('');

        // Validation
        if (guess.length !== GameState.dailyChallenge.digitCount) {
            if (Achievements) {
                Achievements.showToast('Please fill in all digit boxes to make your guess! 🎯', 'info');
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

        // Debug logging
        console.log('=== Daily Challenge Guess Debug ===');
        console.log('Session ID:', GameState.dailyChallenge.sessionId);
        console.log('Auth Token:', GameState.authToken ? 'Present' : 'Missing');
        console.log('Guess:', guess);
        console.log('Digit Count:', GameState.dailyChallenge.digitCount);

        try {
            const response = await fetch('/api/daily-challenge/guess', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GameState.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: GameState.dailyChallenge.sessionId,
                    guess: guess
                })
            });

            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);

            if (response.ok) {
                GameState.dailyChallenge.attempts = data.attempts;
                const attemptsEl = document.getElementById('daily-attempts');
                if (attemptsEl) {
                    attemptsEl.textContent = GameState.dailyChallenge.attempts;
                }

                // Play sound
                if (data.won) {
                    if (GameState.soundVolume > 0 && GameConfig) {
                        GameConfig.sounds.win.play();
                    }
                    // End immediately on win - don't add winning guess to history
                    this.endDailyChallenge(true);
                } else {
                    if (GameState.soundVolume > 0 && GameConfig) {
                        GameConfig.sounds.incorrect.play();
                    }

                    // Add to history only if not won
                    this.addDailyGuessToHistory(guess, data.bulls, data.cows);

                    // Clear inputs
                    inputs.forEach(input => input.value = '');
                    if (inputs[0]) inputs[0].focus();

                    // Check if lost (out of attempts)
                    if (GameState.dailyChallenge.attempts >= GameConfig.MAX_ATTEMPTS) {
                        this.endDailyChallenge(false);
                    }
                }
            } else {
                console.error('Server error:', data.error);
                if (Achievements) {
                    Achievements.showToast(data.error || 'Hmm, couldn\'t submit that guess. Try again! 🔄', 'error');
                }
            }
        } catch (error) {
            console.error('Fetch error:', error);
            if (Achievements) {
                Achievements.showToast('Hmm, couldn\'t submit that guess. Check your connection and try again! 🔄', 'error');
            }
        }
    },

    // ==========================================
    // GUESS HISTORY
    // ==========================================

    addDailyGuessToHistory: function(guess, bulls, cows) {
        GameState.dailyChallenge.guessHistory.push({ guess, bulls, cows });

        const historyDiv = document.getElementById('daily-guess-history');
        if (!historyDiv) return;

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

        historyDiv.insertBefore(historyItem, historyDiv.firstChild);
    },

    // ==========================================
    // END GAME
    // ==========================================

    endDailyChallenge: async function(won) {
        // Stop timer
        clearInterval(GameState.dailyChallenge.timerInterval);

        const timeTakenSeconds = Math.floor((Date.now() - GameState.dailyChallenge.startTime) / 1000);
        const minutes = Math.floor(timeTakenSeconds / 60);
        const seconds = timeTakenSeconds % 60;
        const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        try {
            const response = await fetch('/api/daily-challenge/end', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GameState.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: GameState.dailyChallenge.sessionId,
                    won: won,
                    timeTakenSeconds: timeTakenSeconds,
                    timeDisplay: timeDisplay
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Update coins and show animation if won
                if (won && data.coinsAwarded && data.coinsAwarded > 0 && GameState.currentUser && Auth) {
                    GameState.currentUser.coins = data.totalCoins || (GameState.currentUser.coins + data.coinsAwarded);
                    localStorage.setItem('currentUser', JSON.stringify(GameState.currentUser));
                    Auth.showCoinAnimation(data.coinsAwarded);
                }

                this.showDailyChallengeResult(won, GameState.dailyChallenge.attempts, timeDisplay, data.rank, data.totalPlayers);

                // Reload daily challenge info for home page (don't await - run in background)
                this.loadDailyChallengeInfo();
            } else {
                if (Achievements) {
                    Achievements.showToast(data.error || 'Couldn\'t save your result. Try refreshing! 💾', 'error');
                }
            }
        } catch (error) {
            if (Achievements) {
                Achievements.showToast('Couldn\'t save your result. Try refreshing! 💾', 'error');
            }
        }
    },

    // ==========================================
    // RESULTS DISPLAY
    // ==========================================

    showDailyChallengeResult: function(won, attempts, timeDisplay, rank, totalPlayers) {
        // Update game status
        if (Utils) {
            Utils.updateGameStatus('result');
        }

        const dailyChallengePage = document.getElementById('daily-challenge-page');
        const dailyResultPage = document.getElementById('daily-result-page');

        if (Utils) {
            Utils.fadeOutElement(dailyChallengePage, () => {
                const statsContainer = document.getElementById('daily-game-stats');
                if (!statsContainer) return;

                statsContainer.textContent = '';

                // Hero Section - Win/Loss Status
                const heroSection = document.createElement('div');
                heroSection.style.cssText = 'text-align: center; margin-bottom: 25px;';

                if (won) {
                    heroSection.innerHTML = `
                        <div style="background: linear-gradient(135deg, #52c98c 0%, #4ea8de 100%); padding: 25px; border-radius: 20px; box-shadow: 0 8px 24px rgba(82, 201, 140, 0.3);">
                            <div style="font-size: 2.5em; margin-bottom: 10px;">🏆</div>
                            <div style="font-size: 2em; font-weight: 800; color: white; line-height: 1.2;">COMPLETE!</div>
                            <div style="font-size: 1.2em; color: rgba(255,255,255,0.9); margin-top: 8px;">${attempts} ${attempts === 1 ? 'Attempt' : 'Attempts'}</div>
                            <div style="font-size: 0.85em; color: rgba(255,255,255,0.8); margin-top: 5px;">Daily Challenge</div>
                        </div>
                    `;
                    if (Utils) {
                        Utils.createConfetti();
                    }
                } else {
                    heroSection.innerHTML = `
                        <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); padding: 25px; border-radius: 20px; box-shadow: 0 8px 24px rgba(231, 76, 60, 0.3);">
                            <div style="font-size: 2.5em; margin-bottom: 10px;">😔</div>
                            <div style="font-size: 2em; font-weight: 800; color: white; line-height: 1.2;">NOT TODAY</div>
                            <div style="font-size: 1.2em; color: rgba(255,255,255,0.9); margin-top: 8px;">Out of attempts</div>
                            <div style="font-size: 0.85em; color: rgba(255,255,255,0.8); margin-top: 5px;">Daily Challenge</div>
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
                statsGrid.appendChild(createStatCard('fas fa-stopwatch', timeDisplay, 'Time'));
                statsGrid.appendChild(createStatCard('fas fa-bullseye', `${attempts}/10`, 'Attempts'));

                // Rank card (with medal emoji)
                if (rank) {
                    const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '📊';
                    statsGrid.appendChild(createStatCard('fas fa-ranking-star', `${rankEmoji} #${rank}`, 'Rank'));
                }

                // Total players card
                if (totalPlayers) {
                    statsGrid.appendChild(createStatCard('fas fa-users', totalPlayers, 'Players'));
                }

                statsContainer.appendChild(statsGrid);

                Utils.fadeInElement(dailyResultPage);
            });
        }
    },

    // ==========================================
    // LEADERBOARD
    // ==========================================

    loadDailyLeaderboard: async function() {
        const modal = document.getElementById('daily-leaderboard-modal');
        const loadingDiv = document.getElementById('modal-daily-leaderboard-loading');
        const contentDiv = document.getElementById('modal-daily-leaderboard-content');
        const dateDiv = document.getElementById('daily-leaderboard-date');

        if (!modal || !loadingDiv || !contentDiv) return;

        loadingDiv.style.display = 'block';
        contentDiv.style.display = 'none';

        try {
            const response = await fetch('/api/daily-challenge/leaderboard?limit=100');
            const data = await response.json();

            if (response.ok && Array.isArray(data)) {
                // Update date
                if (dateDiv && GameState.dailyChallenge.info && Utils) {
                    dateDiv.textContent = `📅 ${Utils.formatDate(GameState.dailyChallenge.info.challengeDate)}`;
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
                        const isCurrentUser = GameState.currentUser && entry.username === GameState.currentUser.username;
                        const rowClass = isCurrentUser ? 'leaderboard-row current-user' : 'leaderboard-row';
                        const escapedUsername = Utils ? Utils.escapeHtml(entry.username) : entry.username;

                        tableHTML += `
                            <tr class="${rowClass}">
                                <td>${this.getRankDisplay(entry.rank)}</td>
                                <td>${escapedUsername}${isCurrentUser ? ' (You)' : ''}</td>
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

        if (Utils) {
            Utils.openModalWithAnimation(modal);
        }
    },

    getRankDisplay: function(rank) {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    },

    // ==========================================
    // NAVIGATION
    // ==========================================

    quitDailyChallenge: function() {
        if (confirm('Are you sure you want to quit? You can only attempt the daily challenge once per day!')) {
            clearInterval(GameState.dailyChallenge.timerInterval);

            const dailyChallengePage = document.getElementById('daily-challenge-page');
            const homePage = document.getElementById('home-page');

            if (Utils) {
                Utils.fadeOutElement(dailyChallengePage, () => {
                    Utils.fadeInElement(homePage, 'flex');
                });
            }

            // Note: We don't save the attempt as they're quitting
            GameState.dailyChallenge.sessionId = null;
        }
    },

    showMainMenu: function() {
        const dailyResultPage = document.getElementById('daily-result-page');
        const homePage = document.getElementById('home-page');

        if (Utils) {
            Utils.fadeOutElement(dailyResultPage, () => {
                Utils.updateGameStatus('home');
                Utils.fadeInElement(homePage, 'flex');
            });
        }
    },

    // ==========================================
    // EVENT LISTENERS
    // ==========================================

    attachDailyListeners: function() {
        const playBtn = document.getElementById('play-daily-challenge');
        if (playBtn) {
            playBtn.addEventListener('click', () => this.playDailyChallenge());
        }

        const viewLeaderboardBtn = document.getElementById('view-daily-leaderboard');
        if (viewLeaderboardBtn) {
            viewLeaderboardBtn.addEventListener('click', () => this.loadDailyLeaderboard());
        }

        const viewResultsLeaderboardBtn = document.getElementById('view-daily-results-leaderboard');
        if (viewResultsLeaderboardBtn) {
            viewResultsLeaderboardBtn.addEventListener('click', () => this.loadDailyLeaderboard());
        }

        const submitBtn = document.getElementById('submit-daily-guess');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitDailyGuess());
        }

        const quitBtn = document.getElementById('quit-daily-challenge');
        if (quitBtn) {
            quitBtn.addEventListener('click', () => this.quitDailyChallenge());
        }

        const quitResultBtn = document.getElementById('quit-daily-result');
        if (quitResultBtn) {
            quitResultBtn.addEventListener('click', () => this.showMainMenu());
        }

        const closeModalBtn = document.getElementById('daily-leaderboard-modal-close');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                const modal = document.getElementById('daily-leaderboard-modal');
                if (modal && Utils) {
                    Utils.closeModalWithAnimation(modal);
                }
            });
        }
    },

    // ==========================================
    // INITIALIZATION
    // ==========================================

    init: function() {
        this.attachDailyListeners();

        // Load daily challenge info if home page is visible
        const homePage = document.getElementById('home-page');
        if (homePage && homePage.style.display !== 'none') {
            this.loadDailyChallengeInfo();
        }
    }
};
