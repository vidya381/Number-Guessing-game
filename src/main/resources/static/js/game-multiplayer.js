/**
 * Multiplayer Mode JavaScript
 * Handles friends system, challenges, and real-time 1v1 games
 */

// Helper function for notifications
function showNotification(message, type) {
    if (typeof Achievements !== 'undefined' && Achievements.showToast) {
        Achievements.showToast(message, type);
    } else {
        debug.log(`[${type}] ${message}`);
    }
}

const MultiplayerGame = {
    /**
     * Initialize multiplayer mode
     */
    init() {
        debug.log('Initializing multiplayer mode...');

        // Initialize WebSocket connection
        this.connectWebSocket();

        // Load initial data
        this.loadFriends();
        this.loadPendingRequests();
        this.loadPendingChallenges();
        this.loadSentChallenges();
        this.loadStats();

        // Set up event listeners
        this.setupEventListeners();
    },

    /**
     * WebSocket Management
     */
    connectWebSocket() {
        if (GameState.multiplayer.connected) {
            debug.log('WebSocket already connected');
            return;
        }

        try {
            // Pass JWT token as query parameter in WebSocket URL
            const socket = new SockJS('/ws?token=' + encodeURIComponent(GameState.authToken));
            const stompClient = Stomp.over(socket);

            stompClient.connect({}, (frame) => {
                debug.log('WebSocket connected:', frame);
                GameState.multiplayer.websocket = socket;
                GameState.multiplayer.stompClient = stompClient;
                GameState.multiplayer.connected = true;

                // Subscribe to user-specific channels
                const userId = GameState.currentUser.id;

                // Friend requests
                stompClient.subscribe(`/queue/friend-requests.${userId}`, (message) => {
                    this.handleFriendRequestNotification(JSON.parse(message.body));
                });

                // Challenges
                stompClient.subscribe(`/queue/challenges.${userId}`, (message) => {
                    this.handleChallengeNotification(JSON.parse(message.body));
                });

                // Game events
                stompClient.subscribe(`/queue/game.${userId}`, (message) => {
                    this.handleGameNotification(JSON.parse(message.body));
                });

                // Presence updates
                stompClient.subscribe('/topic/presence', (message) => {
                    this.handlePresenceUpdate(JSON.parse(message.body));
                });

                this.updateConnectionStatus(true);
            }, (error) => {
                debug.error('WebSocket error:', error);
                GameState.multiplayer.connected = false;
                this.updateConnectionStatus(false);

                // Retry connection after 5 seconds
                setTimeout(() => this.connectWebSocket(), 5000);
            });
        } catch (error) {
            debug.error('Failed to create WebSocket connection:', error);
        }
    },

    disconnectWebSocket() {
        if (GameState.multiplayer.stompClient) {
            GameState.multiplayer.stompClient.disconnect();
            GameState.multiplayer.connected = false;
            this.updateConnectionStatus(false);
        }
    },

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('ws-connection-status');
        if (statusElement) {
            statusElement.className = connected ? 'connected' : 'disconnected';
            statusElement.textContent = connected ? 'Online' : 'Offline';
        }
    },

    /**
     * Friends Management
     */
    async loadFriends() {
        try {
            const response = await fetch('/api/friends/list', {
                headers: {
                    'Authorization': `Bearer ${GameState.authToken}`
                }
            });

            const data = await response.json();
            if (data.success) {
                GameState.multiplayer.friends = data.friends;
                this.renderFriendsList();
            }
        } catch (error) {
            debug.error('Failed to load friends:', error);
        }
    },

    async searchUsers(query) {
        if (!query || query.length < 2) {
            document.getElementById('user-search-results').innerHTML = '';
            return;
        }

        try {
            const response = await fetch(`/api/friends/search?query=${encodeURIComponent(query)}`, {
                headers: {
                    'Authorization': `Bearer ${GameState.authToken}`
                }
            });

            const data = await response.json();
            if (data.success) {
                this.renderSearchResults(data.users);
            }
        } catch (error) {
            debug.error('Failed to search users:', error);
        }
    },

    async sendFriendRequest(userId) {
        try {
            const response = await fetch('/api/friends/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GameState.authToken}`
                },
                body: JSON.stringify({ toUserId: userId })
            });

            const data = await response.json();
            if (data.success) {
                showNotification('Friend request sent!', 'success');
                // Refresh search results
                const searchInput = document.getElementById('friend-search-input');
                if (searchInput) {
                    this.searchUsers(searchInput.value);
                }
            } else {
                showNotification(data.error || 'Failed to send request', 'error');
            }
        } catch (error) {
            debug.error('Failed to send friend request:', error);
            showNotification('Failed to send friend request', 'error');
        }
    },

    async acceptFriendRequest(requestId) {
        try {
            const response = await fetch(`/api/friends/accept/${requestId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GameState.authToken}`
                }
            });

            const data = await response.json();
            if (data.success) {
                showNotification(`You are now friends with ${data.friendUsername}!`, 'success');
                this.loadFriends();
                this.loadPendingRequests();
            } else {
                showNotification(data.error || 'Failed to accept request', 'error');
            }
        } catch (error) {
            debug.error('Failed to accept friend request:', error);
            showNotification('Failed to accept friend request', 'error');
        }
    },

    async declineFriendRequest(requestId) {
        try {
            const response = await fetch(`/api/friends/decline/${requestId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GameState.authToken}`
                }
            });

            const data = await response.json();
            if (data.success) {
                showNotification('Friend request declined', 'info');
                this.loadPendingRequests();
            }
        } catch (error) {
            debug.error('Failed to decline friend request:', error);
        }
    },

    async removeFriend(friendId) {
        if (!confirm('Are you sure you want to remove this friend?')) {
            return;
        }

        try {
            const response = await fetch(`/api/friends/${friendId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${GameState.authToken}`
                }
            });

            const data = await response.json();
            if (data.success) {
                showNotification('Friend removed', 'info');
                this.loadFriends();
            }
        } catch (error) {
            debug.error('Failed to remove friend:', error);
        }
    },

    async loadPendingRequests() {
        try {
            const response = await fetch('/api/friends/requests/pending', {
                headers: {
                    'Authorization': `Bearer ${GameState.authToken}`
                }
            });

            const data = await response.json();
            if (data.success) {
                GameState.multiplayer.pendingRequests = data.requests;
                this.renderPendingRequests();
                this.updateNotificationBadge();
            }
        } catch (error) {
            debug.error('Failed to load pending requests:', error);
        }
    },

    /**
     * Challenge Flow
     */
    async challengeFriend(friendId, difficulty) {
        try {
            const response = await fetch('/api/multiplayer/challenge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GameState.authToken}`
                },
                body: JSON.stringify({ challengedId: friendId, difficulty })
            });

            const data = await response.json();
            if (data.success) {
                showNotification('Challenge sent!', 'success');
                this.closeChallengeModal();
                this.loadSentChallenges();
            } else {
                showNotification(data.error || 'Failed to send challenge', 'error');
            }
        } catch (error) {
            debug.error('Failed to send challenge:', error);
            showNotification('Failed to send challenge', 'error');
        }
    },

    async loadPendingChallenges() {
        try {
            const response = await fetch('/api/multiplayer/challenges/pending', {
                headers: {
                    'Authorization': `Bearer ${GameState.authToken}`
                }
            });

            const data = await response.json();
            if (data.success) {
                GameState.multiplayer.pendingChallenges = data.challenges;
                this.renderPendingChallenges();
                this.updateNotificationBadge();
            }
        } catch (error) {
            debug.error('Failed to load pending challenges:', error);
        }
    },

    async loadSentChallenges() {
        try {
            const response = await fetch('/api/multiplayer/challenges/sent', {
                headers: {
                    'Authorization': `Bearer ${GameState.authToken}`
                }
            });

            const data = await response.json();
            if (data.success) {
                GameState.multiplayer.sentChallenges = data.challenges;
                this.renderSentChallenges();
            }
        } catch (error) {
            debug.error('Failed to load sent challenges:', error);
        }
    },

    async acceptChallenge(challengeId) {
        try {
            const response = await fetch(`/api/multiplayer/challenge/${challengeId}/accept`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GameState.authToken}`
                }
            });

            const data = await response.json();
            if (data.success) {
                // Game started!
                this.startGame(data.sessionId, data.digitCount, data.opponentUsername, data.opponentId, data.maxAttempts);
                this.loadPendingChallenges();
            } else {
                showNotification(data.error || 'Failed to accept challenge', 'error');
            }
        } catch (error) {
            debug.error('Failed to accept challenge:', error);
            showNotification('Failed to accept challenge', 'error');
        }
    },

    async declineChallenge(challengeId) {
        try {
            const response = await fetch(`/api/multiplayer/challenge/${challengeId}/decline`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GameState.authToken}`
                }
            });

            const data = await response.json();
            if (data.success) {
                showNotification('Challenge declined', 'info');
                this.loadPendingChallenges();
            }
        } catch (error) {
            debug.error('Failed to decline challenge:', error);
        }
    },

    /**
     * Game Logic
     */
    startGame(sessionId, digitCount, opponentUsername, opponentId, maxAttempts) {
        debug.log('Starting multiplayer game:', sessionId, 'max attempts:', maxAttempts);

        GameState.multiplayer.sessionId = sessionId;
        GameState.multiplayer.digitCount = digitCount;
        GameState.multiplayer.maxAttempts = maxAttempts || 0;
        GameState.multiplayer.currentGame.opponentUsername = opponentUsername;
        GameState.multiplayer.currentGame.opponentId = opponentId;
        GameState.multiplayer.currentGame.myAttempts = 0;
        GameState.multiplayer.currentGame.opponentAttempts = 0;
        GameState.multiplayer.currentGame.guessHistory = [];
        GameState.multiplayer.currentGame.startTime = Date.now();

        // Show game UI
        this.showGameUI();
    },

    async submitGuess() {
        const inputContainer = document.getElementById('mp-input-container');
        const inputs = inputContainer ? inputContainer.querySelectorAll('.digit-input') : [];
        let guess = '';
        for (let input of inputs) {
            guess += input.value;
        }

        if (guess.length !== GameState.multiplayer.digitCount) {
            showNotification(`Please enter ${GameState.multiplayer.digitCount} digits`, 'error');
            return;
        }

        // Check for unique digits
        const uniqueDigits = new Set(guess);
        if (uniqueDigits.size !== guess.length) {
            showNotification('All digits must be unique!', 'error');
            return;
        }

        // Check if max attempts reached
        if (GameState.multiplayer.maxAttempts > 0 &&
            GameState.multiplayer.currentGame.myAttempts >= GameState.multiplayer.maxAttempts) {
            showNotification('You have used all your attempts!', 'error');
            return;
        }

        try {
            const response = await fetch('/api/multiplayer/guess', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GameState.authToken}`
                },
                body: JSON.stringify({
                    sessionId: GameState.multiplayer.sessionId,
                    guess: guess
                })
            });

            const data = await response.json();
            if (data.success) {
                // Add to guess history
                GameState.multiplayer.currentGame.guessHistory.push({
                    guess: guess,
                    bulls: data.bulls,
                    cows: data.cows
                });
                GameState.multiplayer.currentGame.myAttempts = data.attempts;

                // Update UI
                this.renderGuessHistory();
                this.updateAttemptsDisplay();

                // Clear inputs and focus on first
                inputs.forEach(input => input.value = '');
                if (inputs[0]) inputs[0].focus();

                // Don't handle game completion here - wait for WebSocket notification
                // which will have all the correct data (secretNumber, coinsAwarded, etc.)
            } else {
                showNotification(data.error || 'Invalid guess', 'error');
            }
        } catch (error) {
            debug.error('Failed to submit guess:', error);
            showNotification('Failed to submit guess', 'error');
        }
    },

    /**
     * Show multiplayer result page
     */
    showMultiplayerResult(result, myAttempts, opponentAttempts, coinsAwarded, secretNumber, reason = null) {
        const gameView = document.getElementById('mp-game-view');
        const resultPage = document.getElementById('mp-result-page');
        const statsContainer = document.getElementById('mp-game-stats');

        if (!statsContainer) return;

        // Calculate match time
        const matchTime = GameState.multiplayer.currentGame.startTime ?
            Math.floor((Date.now() - GameState.multiplayer.currentGame.startTime) / 1000) : 0;
        const minutes = Math.floor(matchTime / 60);
        const seconds = matchTime % 60;
        const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        if (Utils) {
            Utils.fadeOutElement(gameView, () => {
                statsContainer.textContent = '';

                // Hero Section - Win/Loss/Draw Status
                const heroSection = document.createElement('div');
                heroSection.style.cssText = 'text-align: center; margin-bottom: 25px;';

                if (result === 'won') {
                    // Determine win message based on reason
                    let statusMessage;
                    if (reason === 'opponent_left') {
                        statusMessage = 'Opponent forfeited!';
                    } else if (coinsAwarded > 0) {
                        statusMessage = `+${coinsAwarded} coins earned!`;
                    } else {
                        statusMessage = 'You solved it first!';
                    }

                    heroSection.innerHTML = `
                        <div style="background: linear-gradient(135deg, #14532D 0%, #4ea8de 100%); padding: 25px; border-radius: 20px; box-shadow: 0 8px 24px rgba(20, 83, 45, 0.3);">
                            <div style="font-size: 2.5em; margin-bottom: 10px;">🏆</div>
                            <div style="font-size: 2em; font-weight: 800; color: white; line-height: 1.2;">VICTORY!</div>
                            <div style="font-size: 1.2em; color: rgba(255,255,255,0.9); margin-top: 8px;">${statusMessage}</div>
                            <div style="font-size: 0.85em; color: rgba(255,255,255,0.8); margin-top: 5px;">1v1 Multiplayer</div>
                        </div>
                    `;
                    if (Utils) {
                        Utils.createConfetti();
                    }
                } else if (result === 'draw') {
                    // Determine draw message based on attempts
                    const maxAttempts = GameState.multiplayer.maxAttempts;
                    let drawMessage;
                    if (myAttempts >= maxAttempts && opponentAttempts >= maxAttempts) {
                        drawMessage = 'Both ran out of attempts!';
                    } else {
                        drawMessage = 'Both solved with same attempts!';
                    }

                    heroSection.innerHTML = `
                        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 25px; border-radius: 20px; box-shadow: 0 8px 24px rgba(240, 147, 251, 0.3);">
                            <div style="font-size: 2.5em; margin-bottom: 10px;">🤝</div>
                            <div style="font-size: 2em; font-weight: 800; color: white; line-height: 1.2;">DRAW!</div>
                            <div style="font-size: 1.2em; color: rgba(255,255,255,0.9); margin-top: 8px;">${drawMessage}</div>
                            <div style="font-size: 0.85em; color: rgba(255,255,255,0.8); margin-top: 5px;">1v1 Multiplayer</div>
                        </div>
                    `;
                } else if (result === 'forfeit') {
                    heroSection.innerHTML = `
                        <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); padding: 25px; border-radius: 20px; box-shadow: 0 8px 24px rgba(231, 76, 60, 0.3);">
                            <div style="font-size: 2.5em; margin-bottom: 10px;">🏳️</div>
                            <div style="font-size: 2em; font-weight: 800; color: white; line-height: 1.2;">FORFEITED</div>
                            <div style="font-size: 1.2em; color: rgba(255,255,255,0.9); margin-top: 8px;">You left the game!</div>
                            <div style="font-size: 0.85em; color: rgba(255,255,255,0.8); margin-top: 5px;">1v1 Multiplayer</div>
                        </div>
                    `;
                } else {
                    // Determine loss message
                    let lossMessage = 'Opponent solved it first!';

                    heroSection.innerHTML = `
                        <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); padding: 25px; border-radius: 20px; box-shadow: 0 8px 24px rgba(231, 76, 60, 0.3);">
                            <div style="font-size: 2.5em; margin-bottom: 10px;">😔</div>
                            <div style="font-size: 2em; font-weight: 800; color: white; line-height: 1.2;">DEFEAT</div>
                            <div style="font-size: 1.2em; color: rgba(255,255,255,0.9); margin-top: 8px;">${lossMessage}</div>
                            <div style="font-size: 0.85em; color: rgba(255,255,255,0.8); margin-top: 5px;">1v1 Multiplayer</div>
                        </div>
                    `;
                }
                statsContainer.appendChild(heroSection);

                // Stats Grid - 2x2 Cards (4 tiles)
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

                // Add 4 stat cards
                const myAttemptsDisplay = myAttempts;
                const oppAttemptsDisplay = opponentAttempts === -1 ? 'DNF' : opponentAttempts;

                statsGrid.appendChild(createStatCard('fas fa-bullseye', myAttemptsDisplay, 'Your Attempts'));
                statsGrid.appendChild(createStatCard('fas fa-crosshairs', oppAttemptsDisplay, 'Opponent Attempts'));
                statsGrid.appendChild(createStatCard('fas fa-stopwatch', timeDisplay, 'Match Time'));
                statsGrid.appendChild(createStatCard('fas fa-key', secretNumber, 'Secret Number'));

                statsContainer.appendChild(statsGrid);

                if (Utils) {
                    Utils.fadeInElement(resultPage);
                }
            });
        }
    },

    handleGameWin(data) {
        showNotification(data.message || 'You won!', 'success');

        // Show result page - use attempt counts from WebSocket data
        this.showMultiplayerResult(
            'won',
            data.myAttempts || GameState.multiplayer.currentGame.myAttempts,
            data.opponentAttempts || GameState.multiplayer.currentGame.opponentAttempts,
            data.coinsAwarded || 0,
            data.secretNumber || '',
            data.reason || null
        );

        // Refresh stats (before reset so we can display updated win rate)
        this.loadStats();

        // Don't auto-navigate - user clicks back to lobby button
    },

    handleGameLoss(data) {
        showNotification('Your opponent won!', 'info');

        // Show result page - use attempt counts from WebSocket data
        this.showMultiplayerResult(
            'lost',
            data.myAttempts || GameState.multiplayer.currentGame.myAttempts,
            data.opponentAttempts || GameState.multiplayer.currentGame.opponentAttempts,
            0,
            data.secretNumber || data,
            null
        );

        // Refresh stats
        this.loadStats();

        // Don't auto-navigate - user clicks back to lobby button
    },

    handleGameDraw(data) {
        showNotification("It's a draw!", 'info');

        // Show result page - use attempt counts from WebSocket data
        this.showMultiplayerResult(
            'draw',
            data.myAttempts || GameState.multiplayer.currentGame.myAttempts,
            data.opponentAttempts || GameState.multiplayer.currentGame.opponentAttempts,
            0,
            data.secretNumber || data,
            null
        );

        // Refresh stats
        this.loadStats();

        // Don't auto-navigate - user clicks back to lobby button
    },

    handleGameForfeit(data) {
        showNotification('You forfeited the game', 'warning');

        // Show result page - use attempt counts from WebSocket data
        this.showMultiplayerResult(
            'forfeit',
            data.myAttempts || GameState.multiplayer.currentGame.myAttempts,
            data.opponentAttempts || GameState.multiplayer.currentGame.opponentAttempts,
            0,
            data.secretNumber || data,
            null
        );

        // Refresh stats
        this.loadStats();

        // Don't auto-navigate - user clicks back to lobby button
    },

    /**
     * WebSocket Event Handlers
     */
    handleFriendRequestNotification(data) {
        debug.log('Friend request notification:', data);
        showNotification(`${data.fromUsername} sent you a friend request`, 'info');
        this.loadPendingRequests();
    },

    handleChallengeNotification(data) {
        debug.log('Challenge notification:', data);

        switch (data.type) {
            case 'challenge_received':
                showNotification(`${data.challengerUsername} challenged you to a game!`, 'info');
                this.loadPendingChallenges();
                break;
            case 'challenge_accepted':
                showNotification(`${data.acceptedBy} accepted your challenge!`, 'success');
                this.loadSentChallenges();
                break;
        }
    },

    handleGameNotification(data) {
        debug.log('Game notification:', data);

        switch (data.type) {
            case 'game_started':
                debug.log('Game started notification received:', data);
                this.startGame(data.sessionId, data.digitCount, data.opponentUsername, data.opponentId, data.maxAttempts);
                this.loadSentChallenges(); // Refresh sent challenges list
                this.loadPendingChallenges(); // Refresh pending challenges list
                break;
            case 'opponent_guessed':
                GameState.multiplayer.currentGame.opponentAttempts = data.opponentAttempts;
                this.updateAttemptsDisplay();
                break;
            case 'game_completed':
                if (data.result === 'won') {
                    // Check if win was because opponent left
                    if (data.reason === 'opponent_left') {
                        showNotification('Your opponent left the game. You win by forfeit!', 'success');
                    }
                    this.handleGameWin(data);
                } else if (data.result === 'draw') {
                    this.handleGameDraw(data);
                } else if (data.result === 'forfeit') {
                    this.handleGameForfeit(data);
                } else {
                    this.handleGameLoss(data);
                }
                break;
        }
    },

    handlePresenceUpdate(data) {
        debug.log('Presence update:', data);
        // Update friend online status
        this.updateFriendOnlineStatus(data.userId, data.online);
    },

    /**
     * Stats
     */
    async loadStats() {
        try {
            const response = await fetch('/api/multiplayer/stats', {
                headers: {
                    'Authorization': `Bearer ${GameState.authToken}`
                }
            });

            const data = await response.json();
            if (data.success) {
                GameState.multiplayer.stats = data.stats;
                this.renderStats();
            }
        } catch (error) {
            debug.error('Failed to load stats:', error);
        }
    },

    /**
     * UI Rendering Functions
     */
    renderFriendsList() {
        const friendsList = document.getElementById('friends-list');
        if (!friendsList) return;

        if (GameState.multiplayer.friends.length === 0) {
            friendsList.innerHTML = '<p class="no-friends">No friends yet. Search for users to add!</p>';
            return;
        }

        friendsList.innerHTML = GameState.multiplayer.friends.map(friend => {
            const isOnline = friend.online || false;
            return '<div class="friend-card" data-friend-id="' + friend.id + '">' +
                '<div class="friend-info">' +
                    '<span class="online-indicator' + (isOnline ? '' : ' offline') + '"></span>' +
                    '<span class="friend-name">' + escapeHtml(friend.username) + '</span>' +
                '</div>' +
                '<div class="friend-actions">' +
                    '<button class="challenge-btn" onclick="MultiplayerGame.showChallengeModal(' + friend.id + ', \'' + escapeHtml(friend.username) + '\')">' +
                        '🎮' +
                    '</button>' +
                    '<button class="remove-btn" onclick="MultiplayerGame.removeFriend(' + friend.id + ')">' +
                        '✕' +
                    '</button>' +
                '</div>' +
            '</div>';
        }).join('');
    },

    renderSearchResults(users) {
        const searchResults = document.getElementById('user-search-results');
        if (!searchResults) {
            debug.error('user-search-results container not found');
            return;
        }

        debug.log('Rendering search results, users count:', users ? users.length : 0);

        if (!users || users.length === 0) {
            searchResults.innerHTML = '<p class="no-results">No users found</p>';
            return;
        }

        const htmlParts = [];
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            let actionButton = '';

            switch (user.relationshipStatus) {
                case 'FRIENDS':
                    actionButton = '<span class="status-badge friends">Friends</span>';
                    break;
                case 'REQUEST_SENT':
                    actionButton = '<span class="status-badge pending">Request Sent</span>';
                    break;
                case 'REQUEST_RECEIVED':
                    actionButton = '<span class="status-badge received">Request Received</span>';
                    break;
                default:
                    actionButton = '<button class="add-friend-btn" onclick="MultiplayerGame.sendFriendRequest(' + user.id + ')">+</button>';
            }

            const username = escapeHtml(user.username || 'Unknown');
            const wins = user.totalWins || 0;
            const games = user.totalGames || 0;

            htmlParts.push(
                '<div class="user-search-result">' +
                    '<div class="user-info">' +
                        '<span class="user-name">' + username + '</span>' +
                        '<span class="user-stats">' + wins + 'W / ' + games + 'G</span>' +
                    '</div>' +
                    '<div class="user-action">' +
                        actionButton +
                    '</div>' +
                '</div>'
            );
        }

        searchResults.innerHTML = htmlParts.join('');
        debug.log('Search results rendered successfully, items:', htmlParts.length);
    },

    renderPendingRequests() {
        const requestsContainer = document.getElementById('pending-requests');
        if (!requestsContainer) {
            debug.error('pending-requests container not found');
            return;
        }

        debug.log('Rendering pending requests, count:', GameState.multiplayer.pendingRequests.length);

        if (GameState.multiplayer.pendingRequests.length === 0) {
            requestsContainer.innerHTML = '<div class="empty-state">No pending friend requests</div>';
            return;
        }

        const htmlParts = [];

        for (let i = 0; i < GameState.multiplayer.pendingRequests.length; i++) {
            const request = GameState.multiplayer.pendingRequests[i];
            const username = escapeHtml(request.fromUsername || 'Unknown');

            htmlParts.push(
                '<div class="friend-request-card">' +
                    '<span class="requester-name">' + username + '</span>' +
                    '<div class="request-actions">' +
                        '<button class="accept-btn" onclick="MultiplayerGame.acceptFriendRequest(' + request.id + ')" title="Accept">' +
                            '<i class="fas fa-check"></i>' +
                        '</button>' +
                        '<button class="decline-btn" onclick="MultiplayerGame.declineFriendRequest(' + request.id + ')" title="Decline">' +
                            '<i class="fas fa-times"></i>' +
                        '</button>' +
                    '</div>' +
                '</div>'
            );
        }

        requestsContainer.innerHTML = htmlParts.join('');
        debug.log('Pending requests rendered successfully, items:', GameState.multiplayer.pendingRequests.length);
    },

    renderPendingChallenges() {
        const challengesContainer = document.getElementById('pending-challenges');
        if (!challengesContainer) return;

        debug.log('Rendering pending challenges, count:', GameState.multiplayer.pendingChallenges.length);

        if (GameState.multiplayer.pendingChallenges.length === 0) {
            challengesContainer.innerHTML = '<div class="empty-state">No incoming challenges</div>';
            return;
        }

        const difficultyNames = ['Easy', 'Medium', 'Hard'];
        const htmlParts = [];

        for (let i = 0; i < GameState.multiplayer.pendingChallenges.length; i++) {
            const challenge = GameState.multiplayer.pendingChallenges[i];
            const challengerName = escapeHtml(challenge.challengerUsername || 'Unknown');
            const difficulty = difficultyNames[challenge.difficulty] || 'Unknown';
            const diffClass = difficulty.toLowerCase();

            htmlParts.push(
                '<div class="challenge-card">' +
                    '<div class="challenge-info">' +
                        '<span class="challenger-name">' + challengerName + '</span>' +
                        '<span class="difficulty-badge ' + diffClass + '">' + difficulty + '</span>' +
                    '</div>' +
                    '<div class="challenge-actions">' +
                        '<button class="challenge-accept-btn" onclick="MultiplayerGame.acceptChallenge(' + challenge.id + ')" title="Accept">' +
                            '<i class="fas fa-check"></i>' +
                        '</button>' +
                        '<button class="challenge-decline-btn" onclick="MultiplayerGame.declineChallenge(' + challenge.id + ')" title="Decline">' +
                            '<i class="fas fa-times"></i>' +
                        '</button>' +
                    '</div>' +
                '</div>'
            );
        }

        challengesContainer.innerHTML = htmlParts.join('');
    },

    renderSentChallenges() {
        const sentContainer = document.getElementById('sent-challenges');
        if (!sentContainer) return;

        debug.log('Rendering sent challenges, count:', GameState.multiplayer.sentChallenges.length);

        if (GameState.multiplayer.sentChallenges.length === 0) {
            sentContainer.innerHTML = '<div class="empty-state">No sent challenges</div>';
            return;
        }

        const difficultyNames = ['Easy', 'Medium', 'Hard'];
        const htmlParts = [];

        for (let i = 0; i < GameState.multiplayer.sentChallenges.length; i++) {
            const challenge = GameState.multiplayer.sentChallenges[i];
            const challengedName = escapeHtml(challenge.challengedUsername || 'Unknown');
            const difficulty = difficultyNames[challenge.difficulty] || 'Unknown';
            const diffClass = difficulty.toLowerCase();

            htmlParts.push(
                '<div class="challenge-card sent">' +
                    '<div class="challenge-info">' +
                        '<span class="challenged-name">Waiting for ' + challengedName + '</span>' +
                        '<span class="difficulty-badge ' + diffClass + '">' + difficulty + '</span>' +
                    '</div>' +
                '</div>'
            );
        }

        sentContainer.innerHTML = htmlParts.join('');
    },

    renderGuessHistory() {
        const historyContainer = document.getElementById('mp-guess-history');
        if (!historyContainer) return;

        const history = GameState.multiplayer.currentGame.guessHistory;

        if (history.length === 0) {
            historyContainer.innerHTML = '<p class="no-guesses">No guesses yet. Make your first guess!</p>';
            return;
        }

        historyContainer.innerHTML = '';

        // Render in reverse order (newest first)
        for (let i = history.length - 1; i >= 0; i--) {
            const entry = history[i];
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';

            // Add animation class to the newest item
            if (i === history.length - 1) {
                historyItem.classList.add('new-item');
            }

            const guessSpan = document.createElement('span');
            guessSpan.className = 'guess';
            guessSpan.textContent = entry.guess;

            const correctSpan = document.createElement('span');
            correctSpan.className = 'correct';
            correctSpan.textContent = `🐂 Correct: ${entry.bulls}`;

            const misplacedSpan = document.createElement('span');
            misplacedSpan.className = 'misplaced';
            misplacedSpan.textContent = `🐄 Misplaced: ${entry.cows}`;

            historyItem.appendChild(guessSpan);
            historyItem.appendChild(correctSpan);
            historyItem.appendChild(misplacedSpan);
            historyContainer.appendChild(historyItem);
        }

        // Scroll to top to show the newest guess
        historyContainer.scrollTop = 0;
    },

    renderStats() {
        const stats = GameState.multiplayer.stats;

        // Determine hero status based on win rate
        const winRateNum = parseFloat(stats.winRate);
        let heroGradient, heroEmoji, heroTitle, heroSubtitle;

        if (stats.totalGames === 0) {
            heroGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            heroEmoji = '🎮';
            heroTitle = 'READY TO PLAY';
            heroSubtitle = 'Start your first match!';
        } else if (winRateNum >= 60) {
            heroGradient = 'linear-gradient(135deg, #14532D 0%, #4ea8de 100%)';
            heroEmoji = '🏆';
            heroTitle = 'CHAMPION';
            heroSubtitle = `${stats.winRate} Win Rate`;
        } else if (winRateNum >= 40) {
            heroGradient = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
            heroEmoji = '⚔️';
            heroTitle = 'COMPETITOR';
            heroSubtitle = `${stats.winRate} Win Rate`;
        } else {
            heroGradient = 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
            heroEmoji = '💪';
            heroTitle = 'IMPROVING';
            heroSubtitle = `${stats.winRate} Win Rate`;
        }

        const statsHTML = `
            <div style="display: flex; flex-direction: column; width: 100%;">
                <!-- Hero Section -->
                <div style="text-align: center; margin-bottom: 20px; width: 100%;">
                    <div style="background: ${heroGradient}; padding: 25px; border-radius: 20px; box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);">
                        <div style="font-size: 2.5em; margin-bottom: 10px;">${heroEmoji}</div>
                        <div style="font-size: 2em; font-weight: 800; color: white; line-height: 1.2;">${heroTitle}</div>
                        <div style="font-size: 1.2em; color: rgba(255,255,255,0.9); margin-top: 8px;">${heroSubtitle}</div>
                        <div style="font-size: 0.85em; color: rgba(255,255,255,0.8); margin-top: 5px;">Multiplayer 1v1</div>
                    </div>
                </div>

                <!-- Stats Grid -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%;">
                <!-- Total Games -->
                <div style="background: rgba(167, 139, 250, 0.1); padding: 18px; border-radius: 12px; text-align: center; border: 1px solid rgba(167, 139, 250, 0.2);">
                    <i class="fas fa-gamepad" style="font-size: 2em; color: var(--primary-color); margin-bottom: 8px;"></i>
                    <div style="font-size: 1.8em; font-weight: 700; color: var(--text-color); line-height: 1.2;">${stats.totalGames}</div>
                    <div style="font-size: 0.75em; color: var(--text-secondary); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Total Games</div>
                </div>

                <!-- Wins -->
                <div style="background: rgba(167, 139, 250, 0.1); padding: 18px; border-radius: 12px; text-align: center; border: 1px solid rgba(167, 139, 250, 0.2);">
                    <i class="fas fa-trophy" style="font-size: 2em; color: var(--primary-color); margin-bottom: 8px;"></i>
                    <div style="font-size: 1.8em; font-weight: 700; color: var(--text-color); line-height: 1.2;">${stats.wins}</div>
                    <div style="font-size: 0.75em; color: var(--text-secondary); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Wins</div>
                </div>

                <!-- Losses -->
                <div style="background: rgba(167, 139, 250, 0.1); padding: 18px; border-radius: 12px; text-align: center; border: 1px solid rgba(167, 139, 250, 0.2);">
                    <i class="fas fa-times-circle" style="font-size: 2em; color: var(--primary-color); margin-bottom: 8px;"></i>
                    <div style="font-size: 1.8em; font-weight: 700; color: var(--text-color); line-height: 1.2;">${stats.losses}</div>
                    <div style="font-size: 0.75em; color: var(--text-secondary); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Losses</div>
                </div>

                <!-- Win Rate -->
                <div style="background: rgba(167, 139, 250, 0.1); padding: 18px; border-radius: 12px; text-align: center; border: 1px solid rgba(167, 139, 250, 0.2);">
                    <i class="fas fa-chart-line" style="font-size: 2em; color: var(--primary-color); margin-bottom: 8px;"></i>
                    <div style="font-size: 1.8em; font-weight: 700; color: var(--text-color); line-height: 1.2;">${stats.winRate}</div>
                    <div style="font-size: 0.75em; color: var(--text-secondary); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Win Rate</div>
                </div>
                </div>
            </div>
        `;

        // Update stats in multiplayer page (if exists)
        const statsContainer = document.getElementById('mp-stats');
        if (statsContainer) {
            statsContainer.innerHTML = statsHTML;
        }

        // Update stats in modal (for homepage banner button)
        const modalStatsContainer = document.getElementById('mp-stats-modal-content');
        if (modalStatsContainer) {
            modalStatsContainer.innerHTML = statsHTML;
        }
    },

    updateAttemptsDisplay() {
        const myAttemptsEl = document.getElementById('mp-my-attempts');
        const oppAttemptsEl = document.getElementById('mp-opponent-attempts');
        const maxAttempts = GameState.multiplayer.maxAttempts;
        const submitBtn = document.getElementById('mp-submit-guess');

        if (myAttemptsEl) {
            myAttemptsEl.textContent = maxAttempts > 0 ?
                `${GameState.multiplayer.currentGame.myAttempts}/${maxAttempts}` :
                GameState.multiplayer.currentGame.myAttempts;
        }
        if (oppAttemptsEl) {
            oppAttemptsEl.textContent = maxAttempts > 0 ?
                `${GameState.multiplayer.currentGame.opponentAttempts}/${maxAttempts}` :
                GameState.multiplayer.currentGame.opponentAttempts;
        }

        // Disable submit button if max attempts reached
        if (submitBtn && maxAttempts > 0 && GameState.multiplayer.currentGame.myAttempts >= maxAttempts) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.5';
            submitBtn.style.cursor = 'not-allowed';
        }
    },

    updateFriendOnlineStatus(userId, online) {
        // Update friend in state
        const friend = GameState.multiplayer.friends.find(f => f.id === userId);
        if (friend) {
            friend.online = online;
        }

        // Update friend card with online indicator
        const friendCard = document.querySelector(`.friend-card[data-friend-id="${userId}"]`);
        if (friendCard) {
            const indicator = friendCard.querySelector('.online-indicator');
            if (indicator) {
                indicator.className = online ? 'online-indicator online' : 'online-indicator';
            }
        }
    },

    updateNotificationBadge() {
        const badge = document.getElementById('mp-notification-badge');
        if (!badge) return;

        const count = GameState.multiplayer.pendingRequests.length +
                      GameState.multiplayer.pendingChallenges.length;

        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    },

    /**
     * UI State Management
     */
    showFriendsView() {
        document.getElementById('mp-friends-view').style.display = 'block';
        document.getElementById('mp-game-view').style.display = 'none';
        document.getElementById('mp-result-page').style.display = 'none';
    },

    showGameUI() {
        document.getElementById('mp-friends-view').style.display = 'none';
        document.getElementById('mp-game-view').style.display = 'flex';

        // Update opponent info
        document.getElementById('mp-opponent-name').textContent =
            GameState.multiplayer.currentGame.opponentUsername;

        // Reset attempts display
        this.updateAttemptsDisplay();

        // Clear guess history
        this.renderGuessHistory();

        // Create input boxes
        this.updateInputFields(GameState.multiplayer.digitCount);

        // Focus on first input
        const firstInput = document.querySelector('#mp-input-container .digit-input');
        if (firstInput) {
            firstInput.focus();
        }

        // Setup quit button
        const quitBtn = document.getElementById('mp-quit-game');
        if (quitBtn) {
            quitBtn.onclick = () => this.quitGame();
        }

        // Setup submit button
        const submitBtn = document.getElementById('mp-submit-guess');
        if (submitBtn) {
            submitBtn.onclick = () => this.submitGuess();
        }
    },

    updateInputFields(digitCount) {
        const inputContainer = document.getElementById('mp-input-container');
        if (!inputContainer) return;

        inputContainer.innerHTML = '';

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
                        // Last input - check auto-submit preference
                        const autoSubmitEnabled = Utils.getGameplayPreference('autoSubmit');
                        if (autoSubmitEnabled) {
                            // Auto-submit when all digits are filled
                            GameState.autoSubmitTriggered = true;
                            document.getElementById('mp-submit-guess').click();
                            // Reset flag after a short delay
                            setTimeout(() => {
                                GameState.autoSubmitTriggered = false;
                            }, 300);
                        } else {
                            document.getElementById('mp-submit-guess').focus();
                        }
                    }
                }
            });

            input.addEventListener('keydown', function (e) {
                if (e.key === 'Backspace' && !this.value && this.previousElementSibling) {
                    this.previousElementSibling.focus();
                }
                // Submit on Enter key (only if auto-submit didn't just trigger)
                if (e.key === 'Enter' && !GameState.autoSubmitTriggered) {
                    document.getElementById('mp-submit-guess').click();
                }
            });

            inputContainer.appendChild(input);
        }
    },

    async quitGame() {
        if (!confirm('Are you sure you want to leave the game? This will count as a forfeit.')) {
            return;
        }

        const sessionId = GameState.multiplayer.sessionId;

        try {
            // Notify backend that player is leaving
            if (sessionId) {
                const response = await fetch('/api/multiplayer/leave', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${GameState.authToken}`
                    },
                    body: JSON.stringify({ sessionId })
                });

                if (response.ok) {
                    // WebSocket will send forfeit notification
                    // Don't reset state or show friends view yet - wait for WebSocket
                } else {
                    showNotification('Failed to leave game', 'error');
                    // If backend fails, reset locally
                    GameState.resetMultiplayer();
                    this.showFriendsView();
                }
            }
        } catch (error) {
            debug.error('Failed to notify server of game leave:', error);
            showNotification('Failed to leave game', 'error');
            // If request fails, reset locally
            GameState.resetMultiplayer();
            this.showFriendsView();
        }
    },

    showChallengeModal(friendId, friendUsername) {
        const modal = document.getElementById('challenge-modal');
        if (!modal) return;

        const title = document.getElementById('challenge-modal-title');
        if (title) {
            title.textContent = `Challenge ${friendUsername}`;
        }
        modal.dataset.friendId = friendId;
        modal.style.display = 'flex';
    },

    closeChallengeModal() {
        const modal = document.getElementById('challenge-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    sendChallengeFromModal(difficulty) {
        const modal = document.getElementById('challenge-modal');
        const friendId = parseInt(modal.dataset.friendId);
        this.challengeFriend(friendId, difficulty);
    },

    showGameResultModal(result, coinsAwarded, secretNumber) {
        const modal = document.getElementById('game-result-modal');
        if (!modal) return;

        const title = modal.querySelector('.result-title');
        const message = modal.querySelector('.result-message');

        if (result === 'won') {
            title.textContent = '🎉 You Won!';
            message.textContent = `Congratulations! You earned ${coinsAwarded} coins!`;
            modal.className = 'game-result-modal win';
        } else if (result === 'draw') {
            title.textContent = '🤝 Draw!';
            message.textContent = `Both players ran out of attempts! The answer was: ${secretNumber}`;
            modal.className = 'game-result-modal draw';
        } else {
            title.textContent = '😔 You Lost';
            message.textContent = `Better luck next time! The answer was: ${secretNumber}`;
            modal.className = 'game-result-modal loss';
        }

        modal.style.display = 'flex';

        // Auto-close after 3 seconds
        setTimeout(() => {
            modal.style.display = 'none';
        }, 3000);
    },

    /**
     * Event Listeners Setup
     */
    setupEventListeners() {
        // Friend search
        const searchInput = document.getElementById('friend-search-input');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchUsers(e.target.value);
                }, 300);
            });
        }

        // Guess submission
        const guessInput = document.getElementById('mp-guess-input');
        if (guessInput) {
            guessInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.submitGuess();
                }
            });
        }

        // Challenge modal difficulty buttons
        document.querySelectorAll('#challenge-modal .modal-difficulty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const difficulty = parseInt(e.currentTarget.dataset.difficulty);
                this.sendChallengeFromModal(difficulty);
            });
        });

        // Back to lobby button
        const backToLobbyBtn = document.getElementById('mp-back-to-lobby');
        if (backToLobbyBtn) {
            backToLobbyBtn.addEventListener('click', () => {
                const resultPage = document.getElementById('mp-result-page');
                if (Utils) {
                    Utils.fadeOutElement(resultPage, () => {
                        // Reset game state
                        GameState.resetMultiplayer();
                        // Show friends view
                        this.showFriendsView();
                    });
                } else {
                    GameState.resetMultiplayer();
                    this.showFriendsView();
                }
            });
        }
    },

    /**
     * Cleanup
     */
    cleanup() {
        this.disconnectWebSocket();
        GameState.resetMultiplayer();
    }
};

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize when multiplayer tab is shown
document.addEventListener('DOMContentLoaded', () => {
    const multiplayerTab = document.getElementById('multiplayer-tab-btn');
    if (multiplayerTab) {
        multiplayerTab.addEventListener('click', () => {
            MultiplayerGame.init();
        });
    }
});
