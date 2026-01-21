/**
 * Multiplayer Mode JavaScript
 * Handles friends system, challenges, and real-time 1v1 games
 */

// Helper function for notifications
function showNotification(message, type) {
    if (typeof Achievements !== 'undefined' && Achievements.showToast) {
        Achievements.showToast(message, type);
    } else {
        console.log(`[${type}] ${message}`);
    }
}

const MultiplayerGame = {
    /**
     * Initialize multiplayer mode
     */
    init() {
        console.log('Initializing multiplayer mode...');

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
            console.log('WebSocket already connected');
            return;
        }

        try {
            // Pass JWT token as query parameter in WebSocket URL
            const socket = new SockJS('/ws?token=' + encodeURIComponent(GameState.authToken));
            const stompClient = Stomp.over(socket);

            stompClient.connect({}, (frame) => {
                console.log('WebSocket connected:', frame);
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
                console.error('WebSocket error:', error);
                GameState.multiplayer.connected = false;
                this.updateConnectionStatus(false);

                // Retry connection after 5 seconds
                setTimeout(() => this.connectWebSocket(), 5000);
            });
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
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
            console.error('Failed to load friends:', error);
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
            console.error('Failed to search users:', error);
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
            console.error('Failed to send friend request:', error);
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
            console.error('Failed to accept friend request:', error);
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
            console.error('Failed to decline friend request:', error);
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
            console.error('Failed to remove friend:', error);
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
            console.error('Failed to load pending requests:', error);
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
            console.error('Failed to send challenge:', error);
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
            console.error('Failed to load pending challenges:', error);
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
            console.error('Failed to load sent challenges:', error);
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
                this.startGame(data.sessionId, data.digitCount, data.opponentUsername, data.opponentId);
                this.loadPendingChallenges();
            } else {
                showNotification(data.error || 'Failed to accept challenge', 'error');
            }
        } catch (error) {
            console.error('Failed to accept challenge:', error);
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
            console.error('Failed to decline challenge:', error);
        }
    },

    /**
     * Game Logic
     */
    startGame(sessionId, digitCount, opponentUsername, opponentId) {
        console.log('Starting multiplayer game:', sessionId);

        GameState.multiplayer.sessionId = sessionId;
        GameState.multiplayer.digitCount = digitCount;
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
        const guessInput = document.getElementById('mp-guess-input');
        const guess = guessInput.value.trim();

        if (!guess) {
            showNotification('Please enter your guess', 'error');
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

                // Clear input
                guessInput.value = '';

                // Check if won
                if (data.isCorrect) {
                    this.handleGameWin(data);
                }
            } else {
                showNotification(data.error || 'Invalid guess', 'error');
            }
        } catch (error) {
            console.error('Failed to submit guess:', error);
            showNotification('Failed to submit guess', 'error');
        }
    },

    handleGameWin(data) {
        showNotification(data.message || 'You won!', 'success');

        // Show win modal
        this.showGameResultModal('won', data.coinsAwarded);

        // Reset game state
        GameState.resetMultiplayer();

        // Refresh stats
        this.loadStats();

        // Show friends list again
        setTimeout(() => {
            this.showFriendsView();
        }, 3000);
    },

    handleGameLoss(secretNumber) {
        showNotification('Your opponent won!', 'info');

        // Show loss modal
        this.showGameResultModal('lost', 0, secretNumber);

        // Reset game state
        GameState.resetMultiplayer();

        // Refresh stats
        this.loadStats();

        // Show friends list again
        setTimeout(() => {
            this.showFriendsView();
        }, 3000);
    },

    /**
     * WebSocket Event Handlers
     */
    handleFriendRequestNotification(data) {
        console.log('Friend request notification:', data);
        showNotification(`${data.fromUsername} sent you a friend request`, 'info');
        this.loadPendingRequests();
    },

    handleChallengeNotification(data) {
        console.log('Challenge notification:', data);

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
        console.log('Game notification:', data);

        switch (data.type) {
            case 'game_started':
                console.log('Game started notification received:', data);
                this.startGame(data.sessionId, data.digitCount, data.opponentUsername, data.opponentId);
                this.loadSentChallenges(); // Refresh sent challenges list
                this.loadPendingChallenges(); // Refresh pending challenges list
                break;
            case 'opponent_guessed':
                GameState.multiplayer.currentGame.opponentAttempts = data.opponentAttempts;
                this.updateAttemptsDisplay();
                break;
            case 'game_completed':
                if (data.result === 'won') {
                    this.handleGameWin({ coinsAwarded: data.coinsAwarded });
                } else {
                    this.handleGameLoss(data.secretNumber);
                }
                break;
        }
    },

    handlePresenceUpdate(data) {
        console.log('Presence update:', data);
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
            console.error('Failed to load stats:', error);
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
            console.error('user-search-results container not found');
            return;
        }

        console.log('Rendering search results, users count:', users ? users.length : 0);

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
        console.log('Search results rendered successfully, items:', htmlParts.length);
    },

    renderPendingRequests() {
        const requestsContainer = document.getElementById('pending-requests');
        if (!requestsContainer) {
            console.error('pending-requests container not found');
            return;
        }

        console.log('Rendering pending requests, count:', GameState.multiplayer.pendingRequests.length);

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
                        '<button class="accept-btn" onclick="MultiplayerGame.acceptFriendRequest(' + request.id + ')">' +
                            '<i class="fas fa-check"></i> Accept' +
                        '</button>' +
                        '<button class="decline-btn" onclick="MultiplayerGame.declineFriendRequest(' + request.id + ')">' +
                            '<i class="fas fa-times"></i> Decline' +
                        '</button>' +
                    '</div>' +
                '</div>'
            );
        }

        requestsContainer.innerHTML = htmlParts.join('');
        console.log('Pending requests rendered successfully, items:', GameState.multiplayer.pendingRequests.length);
    },

    renderPendingChallenges() {
        const challengesContainer = document.getElementById('pending-challenges');
        if (!challengesContainer) return;

        console.log('Rendering pending challenges, count:', GameState.multiplayer.pendingChallenges.length);

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

            htmlParts.push(
                '<div class="challenge-card">' +
                    '<div class="challenge-info">' +
                        '<span class="challenger-name">' + challengerName + '</span>' +
                        '<span class="challenge-difficulty">' + difficulty + '</span>' +
                    '</div>' +
                    '<div class="challenge-actions">' +
                        '<button class="accept-btn" onclick="MultiplayerGame.acceptChallenge(' + challenge.id + ')">' +
                            '<i class="fas fa-check"></i> Accept' +
                        '</button>' +
                        '<button class="decline-btn" onclick="MultiplayerGame.declineChallenge(' + challenge.id + ')">' +
                            '<i class="fas fa-times"></i> Decline' +
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

        console.log('Rendering sent challenges, count:', GameState.multiplayer.sentChallenges.length);

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

            htmlParts.push(
                '<div class="challenge-card sent">' +
                    '<span class="challenged-name">Waiting for ' + challengedName + '</span>' +
                    '<span class="challenge-difficulty">' + difficulty + '</span>' +
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

        historyContainer.innerHTML = history.map((entry, index) => `
            <div class="guess-entry">
                <span class="guess-number">${index + 1}</span>
                <span class="guess-value">${entry.guess}</span>
                <span class="bulls">${entry.bulls} 🐂</span>
                <span class="cows">${entry.cows} 🐄</span>
            </div>
        `).reverse().join('');
    },

    renderStats() {
        const statsContainer = document.getElementById('mp-stats');
        if (!statsContainer) return;

        const stats = GameState.multiplayer.stats;
        statsContainer.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Total Games</span>
                <span class="stat-value">${stats.totalGames}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Wins</span>
                <span class="stat-value">${stats.wins}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Losses</span>
                <span class="stat-value">${stats.losses}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Win Rate</span>
                <span class="stat-value">${stats.winRate}</span>
            </div>
        `;
    },

    updateAttemptsDisplay() {
        const myAttemptsEl = document.getElementById('mp-my-attempts');
        const oppAttemptsEl = document.getElementById('mp-opponent-attempts');

        if (myAttemptsEl) {
            myAttemptsEl.textContent = GameState.multiplayer.currentGame.myAttempts;
        }
        if (oppAttemptsEl) {
            oppAttemptsEl.textContent = GameState.multiplayer.currentGame.opponentAttempts;
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
    },

    showGameUI() {
        document.getElementById('mp-friends-view').style.display = 'none';
        document.getElementById('mp-game-view').style.display = 'block';

        // Update opponent info
        document.getElementById('mp-opponent-name').textContent =
            GameState.multiplayer.currentGame.opponentUsername;

        // Reset attempts display
        this.updateAttemptsDisplay();

        // Clear guess history
        this.renderGuessHistory();

        // Focus on input
        document.getElementById('mp-guess-input').focus();
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
