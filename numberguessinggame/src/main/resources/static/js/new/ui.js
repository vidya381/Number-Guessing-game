/**
 * UI Components
 * Handles modals, leaderboard, profile, settings, and UI updates
 */

window.UI = {
    // Leaderboard cache (30-second cache)
    LEADERBOARD_CACHE_DURATION: 30000,

    // ==========================================
    // STATS UPDATES
    // ==========================================

    updateBestScore: function() {
        const bestScoreEl = document.getElementById('best-score');
        if (bestScoreEl) {
            bestScoreEl.textContent = GameState.bestScore;
        }
    },

    updateStreakStats: function() {
        const streakStatsElement = document.getElementById('streak-stats');
        const currentStreakStat = document.getElementById('current-streak-stat');
        const bestStreakStat = document.getElementById('best-streak-stat');

        if (!streakStatsElement || !currentStreakStat || !bestStreakStat) return;

        if (GameState.currentUser && GameState.authToken) {
            // Show streak stats for logged-in users
            streakStatsElement.style.display = 'block';
            currentStreakStat.textContent = GameState.currentUser.currentWinStreak || 0;
            bestStreakStat.textContent = GameState.currentUser.bestWinStreak || 0;
        } else {
            // Hide streak stats for guests
            streakStatsElement.style.display = 'none';
        }
    },

    updateRecentScores: function() {
        const recentScoresList = document.getElementById('recent-scores');
        if (!recentScoresList) return;

        recentScoresList.innerHTML = '';
        GameState.recentScores.slice(0, GameConfig.MAX_RECENT_SCORES).forEach(score => {
            const li = document.createElement('li');
            li.textContent = `${score.difficulty} - ${score.attempts} attempts, ${score.time}`;
            recentScoresList.appendChild(li);
        });
    },

    // ==========================================
    // HEADER DROPDOWN
    // ==========================================

    setupHeaderDropdown: function() {
        const dropdownBtn = document.getElementById('profile-dropdown-btn');
        const dropdown = document.getElementById('profile-dropdown');
        const viewProfileBtn = document.getElementById('dropdown-view-profile');
        const settingsBtn = document.getElementById('dropdown-settings');
        const logoutBtn = document.getElementById('dropdown-logout');

        if (!dropdownBtn || !dropdown) return;

        // Toggle dropdown on button click
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (dropdown.style.display === 'block') {
                dropdown.classList.add('dropdown-exit');
                setTimeout(() => {
                    dropdown.style.display = 'none';
                    dropdown.classList.remove('dropdown-exit');
                }, 200);
            } else {
                dropdown.style.display = 'block';
                void dropdown.offsetWidth; // Force reflow
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && !dropdownBtn.contains(e.target)) {
                if (dropdown.style.display === 'block') {
                    dropdown.classList.add('dropdown-exit');
                    setTimeout(() => {
                        dropdown.style.display = 'none';
                        dropdown.classList.remove('dropdown-exit');
                    }, 200);
                }
            }
        });

        // View Profile
        if (viewProfileBtn) {
            viewProfileBtn.addEventListener('click', () => {
                dropdown.classList.add('dropdown-exit');
                setTimeout(() => {
                    dropdown.style.display = 'none';
                    dropdown.classList.remove('dropdown-exit');
                    this.loadAndShowProfile();
                }, 200);
            });
        }

        // Settings
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                dropdown.classList.add('dropdown-exit');
                setTimeout(() => {
                    dropdown.style.display = 'none';
                    dropdown.classList.remove('dropdown-exit');
                    const settingsModal = document.getElementById('settings-modal');
                    if (settingsModal && Utils) {
                        Utils.openModalWithAnimation(settingsModal);
                    }
                }, 200);
            });
        }

        // Logout
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                dropdown.classList.add('dropdown-exit');
                setTimeout(() => {
                    dropdown.style.display = 'none';
                    dropdown.classList.remove('dropdown-exit');
                    if (Auth) {
                        Auth.logout();
                    }
                }, 200);
            });
        }
    },

    // ==========================================
    // SETTINGS MODAL
    // ==========================================

    setupSettingsModal: function() {
        const settingsModal = document.getElementById('settings-modal');
        const closeSettingsBtn = document.getElementById('close-settings');
        const settingsBtnGuest = document.getElementById('settings-btn');
        const volumeSlider = document.getElementById('volume-slider');
        const volumePercentage = document.getElementById('volume-percentage');

        if (!settingsModal) return;

        // Open settings modal from guest controls
        if (settingsBtnGuest && Utils) {
            settingsBtnGuest.addEventListener('click', () => {
                Utils.openModalWithAnimation(settingsModal);
            });
        }

        // Close settings modal
        if (closeSettingsBtn && Utils) {
            closeSettingsBtn.addEventListener('click', () => {
                Utils.closeModalWithAnimation(settingsModal);
            });
        }

        // Close when clicking outside modal
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal && Utils) {
                Utils.closeModalWithAnimation(settingsModal);
            }
        });

        // Volume slider in settings
        if (volumeSlider && volumePercentage) {
            // Initialize slider with saved volume
            volumeSlider.value = Math.round(GameState.soundVolume * 100);
            volumePercentage.textContent = volumeSlider.value + '%';
            if (Utils) {
                Utils.updateVolumeIcon(GameState.soundVolume);
            }

            volumeSlider.addEventListener('input', (e) => {
                const volume = parseInt(e.target.value);
                GameState.soundVolume = volume / 100;
                volumePercentage.textContent = volume + '%';
                if (GameConfig) {
                    GameConfig.updateSoundVolumes(GameState.soundVolume);
                }
                if (Utils) {
                    Utils.updateVolumeIcon(GameState.soundVolume);
                }
                localStorage.setItem('soundVolume', GameState.soundVolume);

                // Play a test sound when adjusting volume
                if (GameState.soundVolume > 0 && GameConfig) {
                    GameConfig.sounds.correct.currentTime = 0;
                    GameConfig.sounds.correct.play();
                }
            });
        }
    },

    // ==========================================
    // LEADERBOARD MODAL
    // ==========================================

    setupLeaderboardModal: function() {
        const leaderboardModal = document.getElementById('leaderboard-modal');
        const viewLeaderboardBtn = document.getElementById('view-leaderboard');
        const closeLeaderboardBtn = document.getElementById('close-leaderboard');

        if (!leaderboardModal) return;

        if (viewLeaderboardBtn && Utils) {
            viewLeaderboardBtn.addEventListener('click', () => {
                Utils.openModalWithAnimation(leaderboardModal);
                this.loadLeaderboard(false, true);
            });
        }

        if (closeLeaderboardBtn && Utils) {
            closeLeaderboardBtn.addEventListener('click', () => {
                Utils.closeModalWithAnimation(leaderboardModal);
            });
        }

        leaderboardModal.addEventListener('click', (e) => {
            if (e.target === leaderboardModal && Utils) {
                Utils.closeModalWithAnimation(leaderboardModal);
            }
        });
    },

    loadLeaderboard: async function(forceRefresh = false, isModal = false) {
        // Support both modal and inline leaderboard
        const loadingDiv = isModal ?
            document.getElementById('modal-leaderboard-loading') :
            document.getElementById('leaderboard-loading');
        const contentDiv = isModal ?
            document.getElementById('modal-leaderboard-content') :
            document.getElementById('leaderboard-content');

        if (!loadingDiv || !contentDiv) return;

        // Check if we have cached data and it's still valid
        const now = Date.now();
        if (!forceRefresh && GameState.leaderboardCache && (now - GameState.leaderboardCacheTime) < this.LEADERBOARD_CACHE_DURATION) {
            // Use cached data
            contentDiv.innerHTML = this.createLeaderboardHTML(GameState.leaderboardCache);
            loadingDiv.style.display = 'none';
            contentDiv.style.display = 'block';
            return;
        }

        try {
            const response = await fetch('/api/leaderboard?limit=10');
            const data = await response.json();

            if (data.success && data.leaderboard && data.leaderboard.length > 0) {
                // Update cache
                GameState.leaderboardCache = data.leaderboard;
                GameState.leaderboardCacheTime = now;

                contentDiv.innerHTML = this.createLeaderboardHTML(data.leaderboard);
                loadingDiv.style.display = 'none';
                contentDiv.style.display = 'block';
            } else {
                loadingDiv.textContent = 'No players on the leaderboard yet. Be the first!';
            }
        } catch (error) {
            loadingDiv.textContent = 'Couldn\'t load the leaderboard. Try again in a moment!';
        }
    },

    createLeaderboardHTML: function(players) {
        let html = '<table class="leaderboard-table"><thead><tr>';
        html += '<th>Rank</th>';
        html += '<th>Player</th>';
        html += '<th>Best Score</th>';
        html += '<th>Win Rate</th>';
        html += '<th>Games</th>';
        html += '</tr></thead><tbody>';

        players.forEach(player => {
            const rankClass = player.rank <= 3 ? 'rank-' + player.rank : '';
            const rankIcon = this.getRankIcon(player.rank);

            html += '<tr class="' + rankClass + '">';
            html += '<td class="rank-cell">' + rankIcon + ' ' + player.rank + '</td>';
            html += '<td class="username-cell">' + Utils.escapeHtml(player.username) + '</td>';
            html += '<td class="score-cell">' + player.bestScore + ' attempts</td>';
            html += '<td class="winrate-cell">' + player.winRate + '%</td>';
            html += '<td class="games-cell">' + player.totalWins + '/' + player.totalGames + '</td>';
            html += '</tr>';
        });

        html += '</tbody></table>';
        return html;
    },

    getRankIcon: function(rank) {
        switch (rank) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return '';
        }
    },

    // ==========================================
    // PROFILE MODAL
    // ==========================================

    profileCurrentFilter: 'all',
    profileAchievements: [],

    setupProfileListeners: function() {
        const profileBtn = document.getElementById('profile-btn');
        const profileModal = document.getElementById('profile-modal');
        const closeProfileBtn = document.getElementById('close-profile');

        if (profileBtn) {
            profileBtn.addEventListener('click', () => this.loadAndShowProfile());
        }

        if (closeProfileBtn && Utils) {
            closeProfileBtn.addEventListener('click', () => {
                Utils.closeModalWithAnimation(profileModal);
            });
        }

        if (profileModal) {
            profileModal.addEventListener('click', (e) => {
                if (e.target === profileModal && Utils) {
                    Utils.closeModalWithAnimation(profileModal);
                }
            });
        }
    },

    loadAndShowProfile: async function() {
        if (!GameState || !GameState.authToken || !GameState.currentUser) {
            if (Achievements) {
                Achievements.showToast('Please log in to see your profile and achievements!', 'info');
            }
            setTimeout(() => {
                const authModal = document.getElementById('auth-modal');
                if (authModal && Utils) {
                    Utils.openModalWithAnimation(authModal);
                }
            }, 1500);
            return;
        }

        const profileModal = document.getElementById('profile-modal');
        const loadingIndicator = document.getElementById('profile-loading');
        const profileContent = document.getElementById('profile-content');

        // Show modal with loading state
        if (Utils) {
            Utils.openModalWithAnimation(profileModal);
        }
        if (loadingIndicator) loadingIndicator.style.display = 'block';
        if (profileContent) profileContent.style.display = 'none';

        try {
            const response = await fetch('/api/user/profile', {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + GameState.authToken
                }
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error || 'Failed to load profile');
            }

            if (data.success && data.profile) {
                this.populateProfileModal(data.profile);
                // Load achievements into profile
                await this.loadProfileAchievements();
                if (loadingIndicator) loadingIndicator.style.display = 'none';
                if (profileContent) profileContent.style.display = 'block';
            } else {
                throw new Error('Invalid profile data received');
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
            if (Achievements) {
                Achievements.showToast('Couldn\'t load your profile right now. Try refreshing the page!', 'error');
            }
            profileModal.style.display = 'none';
        }
    },

    populateProfileModal: function(profile) {
        console.log('=== populateProfileModal called ===');
        console.log('Profile data:', profile);
        console.log('Recent games:', profile.recentGames);
        console.log('Recent games length:', profile.recentGames ? profile.recentGames.length : 0);

        // Update header info
        const usernameEl = document.getElementById('profile-username');
        const emailEl = document.getElementById('profile-email');
        const joinDateEl = document.getElementById('profile-join-date');

        if (usernameEl) usernameEl.textContent = profile.username || 'N/A';
        if (emailEl) emailEl.textContent = profile.email || 'N/A';
        if (joinDateEl && Utils) joinDateEl.textContent = Utils.formatDate(profile.createdAt);

        // Update stats
        const totalGamesEl = document.getElementById('profile-total-games');
        const totalWinsEl = document.getElementById('profile-total-wins');
        const winRateEl = document.getElementById('profile-win-rate');
        const bestScoreEl = document.getElementById('profile-best-score');

        if (totalGamesEl) totalGamesEl.textContent = profile.totalGames || 0;
        if (totalWinsEl) totalWinsEl.textContent = profile.totalWins || 0;
        if (winRateEl) winRateEl.textContent = profile.winRate || '0%';
        if (bestScoreEl) bestScoreEl.textContent = profile.bestScore || 'Not set';

        // Update streaks (corrected IDs to match HTML)
        const currentWinStreakEl = document.getElementById('profile-current-streak');
        const bestWinStreakEl = document.getElementById('profile-best-streak');
        const consecutiveDaysEl = document.getElementById('profile-play-days');
        const bestDaysStreakEl = document.getElementById('profile-best-play-days');

        if (currentWinStreakEl) currentWinStreakEl.textContent = profile.currentWinStreak || 0;
        if (bestWinStreakEl) bestWinStreakEl.textContent = profile.bestWinStreak || 0;
        if (consecutiveDaysEl) consecutiveDaysEl.textContent = profile.consecutivePlayDays || 0;
        if (bestDaysStreakEl) bestDaysStreakEl.textContent = profile.bestPlayDayStreak || 0;

        // Update difficulty breakdown
        this.updateDifficultyBreakdown(profile.difficultyStats);

        // Update achievements summary
        if (profile.achievementSummary) {
            const achievementCountEl = document.getElementById('profile-achievement-count');
            if (achievementCountEl) {
                achievementCountEl.textContent = `${profile.achievementSummary.unlockedCount || 0} / ${profile.achievementSummary.totalCount || 0}`;
            }
        }

        // Update recent games
        this.updateRecentGamesList(profile.recentGames || []);
    },

    updateDifficultyBreakdown: function(difficultyStats) {
        if (!difficultyStats) return;

        const difficulties = ['EASY', 'MEDIUM', 'HARD'];

        difficulties.forEach(difficulty => {
            const stats = difficultyStats[difficulty];
            if (!stats) return;

            const winsEl = document.getElementById(`profile-${difficulty.toLowerCase()}-wins`);
            const gamesEl = document.getElementById(`profile-${difficulty.toLowerCase()}-games`);
            const rateEl = document.getElementById(`profile-${difficulty.toLowerCase()}-rate`);

            const wins = stats.wins || 0;
            const total = stats.total || 0;
            const rate = stats.winRate || '0%';

            if (winsEl) winsEl.textContent = wins;
            if (gamesEl) gamesEl.textContent = total;
            if (rateEl) rateEl.textContent = rate;
        });
    },

    updateRecentGamesList: function(games) {
        console.log('=== updateRecentGamesList called ===');
        console.log('Games received:', games);
        console.log('Games length:', games ? games.length : 0);

        const recentGamesList = document.getElementById('profile-recent-games');
        if (!recentGamesList) {
            console.log('ERROR: profile-recent-games element not found!');
            return;
        }

        recentGamesList.innerHTML = '';

        if (!games || games.length === 0) {
            console.log('No games to display');
            recentGamesList.innerHTML = '<p style="text-align: center; opacity: 0.7; padding: 20px;">No recent games yet.</p>';
            return;
        }

        console.log('Displaying', games.length, 'games');

        games.forEach(game => {
            const gameItem = document.createElement('div');
            gameItem.className = 'recent-game-item ' + (game.won ? 'won' : 'lost');

            // Result icon (left side)
            const resultIcon = document.createElement('div');
            resultIcon.className = 'game-result-icon ' + (game.won ? 'won' : 'lost');
            resultIcon.innerHTML = game.won
                ? '<i class="fas fa-trophy"></i>'
                : '<i class="fas fa-times-circle"></i>';

            // Game details (middle section)
            const gameDetails = document.createElement('div');
            gameDetails.className = 'game-details';

            // Top row: Difficulty badge + stats
            const topRow = document.createElement('div');
            topRow.className = 'game-top-row';

            const difficultyBadge = document.createElement('span');
            difficultyBadge.className = 'difficulty-badge difficulty-' + (game.difficulty === 0 ? 'easy' : game.difficulty === 1 ? 'medium' : 'hard');
            difficultyBadge.textContent = this.formatDifficulty(game.difficulty);

            const statsRow = document.createElement('span');
            statsRow.className = 'game-stats-inline';
            statsRow.innerHTML = `
                <span><i class="fas fa-bullseye"></i> ${game.attempts || 0}</span>
                <span><i class="fas fa-clock"></i> ${Utils ? Utils.formatGameTime(game.timeTaken) : 'N/A'}</span>
            `;

            topRow.appendChild(difficultyBadge);
            topRow.appendChild(statsRow);

            // Bottom row: Date
            const dateSpan = document.createElement('div');
            dateSpan.className = 'game-date';
            dateSpan.innerHTML = `<i class="fas fa-calendar"></i> ${Utils ? Utils.formatRelativeDate(game.createdAt) : 'N/A'}`;

            gameDetails.appendChild(topRow);
            gameDetails.appendChild(dateSpan);

            gameItem.appendChild(resultIcon);
            gameItem.appendChild(gameDetails);

            recentGamesList.appendChild(gameItem);
        });
    },

    formatDifficulty: function(difficulty) {
        const difficultyMap = {
            0: 'Easy',
            1: 'Medium',
            2: 'Hard',
            'EASY': 'Easy',
            'MEDIUM': 'Medium',
            'HARD': 'Hard'
        };
        return difficultyMap[difficulty] || difficulty;
    },

    loadProfileAchievements: async function() {
        if (!GameState || !GameState.authToken || !GameState.currentUser) {
            return;
        }

        try {
            const response = await fetch('/api/achievements', {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + GameState.authToken
                }
            });

            const data = await response.json();

            if (data.success && data.achievements) {
                this.profileAchievements = data.achievements;
                this.displayProfileAchievements(data.achievements);
                this.setupProfileAchievementTabs();
            }
        } catch (error) {
            console.error('Failed to load achievements in profile:', error);
        }
    },

    displayProfileAchievements: function(achievements) {
        const unlocked = achievements.filter(a => a.unlocked);
        const total = achievements.length;
        const completionPercent = Math.round((unlocked.length / total) * 100);

        // Update stats
        const unlockedCountEl = document.getElementById('profile-unlocked-count');
        const totalCountEl = document.getElementById('profile-total-count');
        const completionPercentEl = document.getElementById('profile-completion-percent');

        if (unlockedCountEl) unlockedCountEl.textContent = unlocked.length;
        if (totalCountEl) totalCountEl.textContent = total;
        if (completionPercentEl) completionPercentEl.textContent = completionPercent + '%';

        // Render achievements list
        this.renderProfileAchievementsList(achievements);
    },

    renderProfileAchievementsList: function(achievements) {
        const listContainer = document.getElementById('profile-achievements-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';

        // Filter achievements based on current filter
        let filteredAchievements = achievements;
        if (this.profileCurrentFilter === 'unlocked') {
            filteredAchievements = achievements.filter(a => a.unlocked);
        } else if (this.profileCurrentFilter === 'locked') {
            filteredAchievements = achievements.filter(a => !a.unlocked);
        }

        // Sort: unlocked first, then by name
        filteredAchievements.sort((a, b) => {
            if (a.unlocked && !b.unlocked) return -1;
            if (!a.unlocked && b.unlocked) return 1;
            return a.name.localeCompare(b.name);
        });

        filteredAchievements.forEach(achievement => {
            if (Achievements) {
                const item = Achievements.createAchievementCard(achievement);
                listContainer.appendChild(item);
            }
        });

        if (filteredAchievements.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: var(--text-color); opacity: 0.7; padding: 40px;">No achievements in this category yet.</p>';
        }
    },

    setupProfileAchievementTabs: function() {
        const modal = document.getElementById('profile-modal');
        if (!modal) return;

        const tabs = modal.querySelectorAll('.achievement-tab');
        tabs.forEach(tab => {
            // Remove any existing listeners
            tab.replaceWith(tab.cloneNode(true));
        });

        // Re-query after replacing
        const newTabs = modal.querySelectorAll('.achievement-tab');
        newTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Update active state
                newTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Update filter and re-render
                this.profileCurrentFilter = tab.dataset.filter;
                this.renderProfileAchievementsList(this.profileAchievements);
            });
        });
    },

    // ==========================================
    // INITIALIZATION
    // ==========================================

    init: function() {
        this.setupHeaderDropdown();
        this.setupSettingsModal();
        this.setupLeaderboardModal();
        this.setupProfileListeners();
        this.updateBestScore();
        this.updateRecentScores();
    }
};
