/**
 * Notifications System
 * Handles friend requests and challenge notifications
 */

window.Notifications = {
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
            } else if (response.status === 401) {
                this.showEmptyState('friend-requests-list', 'Session expired. Please log in again');
                if (badge) badge.style.display = 'none';
            } else {
                this.showEmptyState('friend-requests-list', 'Failed to load friend requests');
                if (badge) badge.style.display = 'none';
            }
        } catch (error) {
            debug.error('Error loading friend requests:', error);
            this.showEmptyState('friend-requests-list', 'Failed to load friend requests');
            const badge = document.getElementById('friend-requests-badge');
            if (badge) badge.style.display = 'none';
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
    }
};
