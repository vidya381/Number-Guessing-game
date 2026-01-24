/**
 * Notifications System
 * Handles friend requests and challenge notifications
 */

window.Notifications = {
    // ==========================================
    // BADGE UPDATE
    // ==========================================

    updateBellBadge: function() {
        // Count total notifications
        let totalCount = 0;

        // Friend requests count
        const friendBadge = document.getElementById('friend-requests-badge');
        if (friendBadge && friendBadge.style.display !== 'none') {
            totalCount += parseInt(friendBadge.textContent) || 0;
        }

        // Challenge notifications count
        const challengeBadge = document.getElementById('challenge-notifications-badge');
        if (challengeBadge && challengeBadge.style.display !== 'none') {
            totalCount += parseInt(challengeBadge.textContent) || 0;
        }

        // Update bell badge
        const bellBadge = document.getElementById('notifications-bell-badge');
        if (bellBadge) {
            if (totalCount > 0) {
                bellBadge.textContent = totalCount;
                bellBadge.style.display = 'inline-block';
            } else {
                bellBadge.style.display = 'none';
            }
        }
    },

    // ==========================================
    // FRIEND REQUESTS
    // ==========================================

    loadFriendRequests: async function() {
        if (!GameState.authToken) {
            this.showEmptyState('friend-requests-list', 'Please log in to see friend requests');
            return;
        }

        const listContainer = document.getElementById('friend-requests-list');
        const badge = document.getElementById('friend-requests-badge');

        if (!listContainer) return;

        // Show loading state
        listContainer.innerHTML = '<div class="notification-empty"><i class="fas fa-spinner fa-spin"></i><div>Loading...</div></div>';

        try {
            const response = await fetch('/api/friends/requests/pending', {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + GameState.authToken,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                const requests = data.requests || [];

                if (requests.length === 0) {
                    this.showEmptyState('friend-requests-list', 'No pending friend requests');
                    if (badge) badge.style.display = 'none';
                } else {
                    this.displayFriendRequests(requests);
                    if (badge) {
                        badge.textContent = requests.length;
                        badge.style.display = 'inline-block';
                    }
                }
                this.updateBellBadge();
            } else if (response.status === 401) {
                this.showEmptyState('friend-requests-list', 'Session expired. Please log in again');
                if (badge) badge.style.display = 'none';
                this.updateBellBadge();
            } else {
                this.showEmptyState('friend-requests-list', 'Failed to load friend requests');
                if (badge) badge.style.display = 'none';
                this.updateBellBadge();
            }
        } catch (error) {
            debug.error('Error loading friend requests:', error);
            this.showEmptyState('friend-requests-list', 'Failed to load friend requests');
            const badge = document.getElementById('friend-requests-badge');
            if (badge) badge.style.display = 'none';
            this.updateBellBadge();
        }
    },

    displayFriendRequests: function(requests) {
        const listContainer = document.getElementById('friend-requests-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';

        requests.forEach(request => {
            const item = document.createElement('div');
            item.className = 'friend-request-item';
            item.dataset.requestId = request.id;

            const info = document.createElement('div');
            info.className = 'friend-request-info';

            const username = document.createElement('div');
            username.className = 'friend-request-username';
            username.textContent = request.fromUsername || 'Unknown User';

            const time = document.createElement('div');
            time.className = 'friend-request-time';
            time.textContent = this.formatTimeAgo(request.sentAt);

            info.appendChild(username);
            info.appendChild(time);

            const actions = document.createElement('div');
            actions.className = 'friend-request-actions';

            const acceptBtn = document.createElement('button');
            acceptBtn.className = 'friend-request-btn accept';
            acceptBtn.textContent = 'Accept';
            acceptBtn.onclick = () => this.acceptFriendRequest(request.id);

            const declineBtn = document.createElement('button');
            declineBtn.className = 'friend-request-btn decline';
            declineBtn.textContent = 'Decline';
            declineBtn.onclick = () => this.declineFriendRequest(request.id);

            actions.appendChild(acceptBtn);
            actions.appendChild(declineBtn);

            item.appendChild(info);
            item.appendChild(actions);

            listContainer.appendChild(item);
        });
    },

    acceptFriendRequest: async function(requestId) {
        if (!GameState.authToken) {
            if (Achievements) {
                Achievements.showToast('Please log in to accept friend requests', 'error');
            }
            return;
        }

        try {
            const response = await fetch(`/api/friends/accept/${requestId}`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + GameState.authToken,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (Achievements) {
                    Achievements.showToast(data.message || 'Friend request accepted!', 'success');
                }
                // Reload friend requests to update the list
                this.loadFriendRequests();
            } else {
                const data = await response.json();
                if (Achievements) {
                    Achievements.showToast(data.error || 'Failed to accept friend request', 'error');
                }
            }
        } catch (error) {
            debug.error('Error accepting friend request:', error);
            if (Achievements) {
                Achievements.showToast('Failed to accept friend request', 'error');
            }
        }
    },

    declineFriendRequest: async function(requestId) {
        if (!GameState.authToken) {
            if (Achievements) {
                Achievements.showToast('Please log in to decline friend requests', 'error');
            }
            return;
        }

        try {
            const response = await fetch(`/api/friends/decline/${requestId}`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + GameState.authToken,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (Achievements) {
                    Achievements.showToast(data.message || 'Friend request declined', 'info');
                }
                // Reload friend requests to update the list
                this.loadFriendRequests();
            } else {
                const data = await response.json();
                if (Achievements) {
                    Achievements.showToast(data.error || 'Failed to decline friend request', 'error');
                }
            }
        } catch (error) {
            debug.error('Error declining friend request:', error);
            if (Achievements) {
                Achievements.showToast('Failed to decline friend request', 'error');
            }
        }
    },

    showEmptyState: function(containerId, message) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="notification-empty">
                <i class="fas fa-inbox"></i>
                <div>${message}</div>
            </div>
        `;
    },

    formatTimeAgo: function(timestamp) {
        if (!timestamp) return 'Just now';

        const now = new Date();
        const then = new Date(timestamp);
        const diffMs = now - then;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 7) {
            return then.toLocaleDateString();
        } else if (diffDays > 0) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else if (diffHours > 0) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffMins > 0) {
            return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        } else {
            return 'Just now';
        }
    },

    // ==========================================
    // CHALLENGE NOTIFICATIONS
    // ==========================================

    loadChallengeNotifications: async function() {
        if (!GameState.authToken) {
            this.showEmptyState('challenge-notifications-list', 'Please log in to see challenge invites');
            return;
        }

        const listContainer = document.getElementById('challenge-notifications-list');
        const badge = document.getElementById('challenge-notifications-badge');

        if (!listContainer) return;

        // Show loading state
        listContainer.innerHTML = '<div class="notification-empty"><i class="fas fa-spinner fa-spin"></i><div>Loading...</div></div>';

        try {
            const response = await fetch('/api/multiplayer/challenges/pending', {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + GameState.authToken,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                const challenges = data.challenges || [];

                if (challenges.length === 0) {
                    this.showEmptyState('challenge-notifications-list', 'No pending challenge invites');
                    if (badge) badge.style.display = 'none';
                } else {
                    this.displayChallengeNotifications(challenges);
                    if (badge) {
                        badge.textContent = challenges.length;
                        badge.style.display = 'inline-block';
                    }
                }
                this.updateBellBadge();
            } else if (response.status === 401) {
                this.showEmptyState('challenge-notifications-list', 'Session expired. Please log in again');
                if (badge) badge.style.display = 'none';
                this.updateBellBadge();
            } else {
                this.showEmptyState('challenge-notifications-list', 'Failed to load challenge invites');
                if (badge) badge.style.display = 'none';
                this.updateBellBadge();
            }
        } catch (error) {
            debug.error('Error loading challenge notifications:', error);
            this.showEmptyState('challenge-notifications-list', 'Failed to load challenge invites');
            const badge = document.getElementById('challenge-notifications-badge');
            if (badge) badge.style.display = 'none';
            this.updateBellBadge();
        }
    },

    displayChallengeNotifications: function(challenges) {
        const listContainer = document.getElementById('challenge-notifications-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';

        challenges.forEach(challenge => {
            const item = document.createElement('div');
            item.className = 'challenge-notification-item';
            item.dataset.challengeId = challenge.id;

            const info = document.createElement('div');
            info.className = 'challenge-notification-info';

            const username = document.createElement('div');
            username.className = 'challenge-notification-username';
            username.textContent = challenge.challengerUsername || 'Unknown Player';

            const details = document.createElement('div');
            details.className = 'challenge-notification-details';

            const difficultyBadge = document.createElement('span');
            difficultyBadge.className = 'challenge-difficulty-badge';
            const difficultyText = this.getDifficultyText(challenge.difficulty);
            difficultyBadge.textContent = difficultyText;
            difficultyBadge.classList.add(difficultyText.toLowerCase());

            const time = document.createElement('span');
            time.className = 'challenge-notification-time';
            time.textContent = this.formatTimeAgo(challenge.createdAt);

            details.appendChild(difficultyBadge);
            details.appendChild(document.createTextNode('•'));
            details.appendChild(time);

            info.appendChild(username);
            info.appendChild(details);

            const actions = document.createElement('div');
            actions.className = 'challenge-notification-actions';

            const acceptBtn = document.createElement('button');
            acceptBtn.className = 'challenge-notification-btn accept';
            acceptBtn.textContent = 'Accept';
            acceptBtn.onclick = () => this.acceptChallenge(challenge.id);

            const declineBtn = document.createElement('button');
            declineBtn.className = 'challenge-notification-btn decline';
            declineBtn.textContent = 'Decline';
            declineBtn.onclick = () => this.declineChallenge(challenge.id);

            actions.appendChild(acceptBtn);
            actions.appendChild(declineBtn);

            item.appendChild(info);
            item.appendChild(actions);

            listContainer.appendChild(item);
        });
    },

    acceptChallenge: async function(challengeId) {
        if (!GameState.authToken) {
            if (Achievements) {
                Achievements.showToast('Please log in to accept challenges', 'error');
            }
            return;
        }

        try {
            const response = await fetch(`/api/multiplayer/challenge/${challengeId}/accept`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + GameState.authToken,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (Achievements) {
                    Achievements.showToast(data.message || 'Challenge accepted! Starting game...', 'success');
                }
                // Reload challenge notifications to update the list
                this.loadChallengeNotifications();

                // Navigate to multiplayer page if available
                if (typeof MultiplayerGame !== 'undefined' && MultiplayerGame.loadChallenges) {
                    setTimeout(() => {
                        // Switch to multiplayer page
                        const homePage = document.getElementById('home-page');
                        const multiplayerPage = document.getElementById('multiplayer-page');

                        if (homePage && multiplayerPage && Utils) {
                            Utils.fadeOutElement(homePage, () => {
                                Utils.fadeInElement(multiplayerPage, 'flex');
                            });
                        }
                    }, 1000);
                }
            } else {
                const data = await response.json();
                if (Achievements) {
                    Achievements.showToast(data.error || 'Failed to accept challenge', 'error');
                }
            }
        } catch (error) {
            debug.error('Error accepting challenge:', error);
            if (Achievements) {
                Achievements.showToast('Failed to accept challenge', 'error');
            }
        }
    },

    declineChallenge: async function(challengeId) {
        if (!GameState.authToken) {
            if (Achievements) {
                Achievements.showToast('Please log in to decline challenges', 'error');
            }
            return;
        }

        try {
            const response = await fetch(`/api/multiplayer/challenge/${challengeId}/decline`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + GameState.authToken,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (Achievements) {
                    Achievements.showToast(data.message || 'Challenge declined', 'info');
                }
                // Reload challenge notifications to update the list
                this.loadChallengeNotifications();
            } else {
                const data = await response.json();
                if (Achievements) {
                    Achievements.showToast(data.error || 'Failed to decline challenge', 'error');
                }
            }
        } catch (error) {
            debug.error('Error declining challenge:', error);
            if (Achievements) {
                Achievements.showToast('Failed to decline challenge', 'error');
            }
        }
    },

    getDifficultyText: function(difficulty) {
        switch (difficulty) {
            case 0: return 'Easy';
            case 1: return 'Medium';
            case 2: return 'Hard';
            default: return 'Unknown';
        }
    }
};
