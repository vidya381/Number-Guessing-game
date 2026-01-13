/**
 * Achievement & Notification System
 * Handles achievement display, toast notifications, and the achievement queue
 */

window.Achievements = {
    // ==========================================
    // ACHIEVEMENT CARD DISPLAY
    // ==========================================

    createAchievementCard: function(achievement) {
        const card = document.createElement('div');
        card.className = 'achievement-item ' + (achievement.unlocked ? 'unlocked' : 'locked');

        const iconWrapper = document.createElement('div');
        iconWrapper.className = 'achievement-icon-wrapper';
        iconWrapper.style.color = achievement.iconColor || '#8b7abf';

        const icon = document.createElement('i');
        icon.className = achievement.iconClass + ' achievement-icon';
        iconWrapper.appendChild(icon);

        const info = document.createElement('div');
        info.className = 'achievement-info';

        const header = document.createElement('div');
        header.className = 'achievement-header';

        const name = document.createElement('div');
        name.className = 'achievement-name';
        name.textContent = achievement.name;
        header.appendChild(name);

        if (achievement.unlocked) {
            const badge = document.createElement('span');
            badge.className = 'achievement-badge-unlocked';
            badge.textContent = '✓';
            header.appendChild(badge);
        }

        const description = document.createElement('div');
        description.className = 'achievement-description';
        description.textContent = achievement.description;

        const meta = document.createElement('div');
        meta.className = 'achievement-meta';

        const type = document.createElement('div');
        type.className = 'achievement-type';
        type.innerHTML = '<i class="fas fa-tag"></i> ' + this.formatType(achievement.type);

        meta.appendChild(type);

        info.appendChild(header);
        info.appendChild(description);
        info.appendChild(meta);

        card.appendChild(iconWrapper);
        card.appendChild(info);

        return card;
    },

    formatType: function(type) {
        const typeMap = {
            'MILESTONE': 'Milestone',
            'SKILL': 'Skill',
            'DIFFICULTY': 'Difficulty',
            'STREAK': 'Streak'
        };
        return typeMap[type] || type;
    },

    // ==========================================
    // ACHIEVEMENT NOTIFICATION QUEUE
    // ==========================================

    showAchievementNotifications: function(achievements) {
        if (!achievements || achievements.length === 0) return;

        // Add achievements to queue
        achievements.forEach(achievement => {
            GameState.achievementQueue.push(achievement);
        });

        // Start processing queue if not already showing
        if (!GameState.isShowingAchievement) {
            this.processAchievementQueue();
        }
    },

    processAchievementQueue: function() {
        if (GameState.achievementQueue.length === 0) {
            GameState.isShowingAchievement = false;
            return;
        }

        GameState.isShowingAchievement = true;
        const achievement = GameState.achievementQueue.shift();

        this.displayAchievementToast(achievement);
    },

    // ==========================================
    // ACHIEVEMENT TOAST NOTIFICATIONS
    // ==========================================

    displayAchievementToast: function(achievement) {
        const container = document.getElementById('achievement-toast-container');
        if (!container) return;

        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'achievement-toast';

        // Icon wrapper
        const iconWrapper = document.createElement('div');
        iconWrapper.className = 'achievement-toast-icon-wrapper';
        iconWrapper.style.color = achievement.iconColor || '#8b7abf';

        const icon = document.createElement('i');
        icon.className = achievement.iconClass + ' achievement-toast-icon';
        iconWrapper.appendChild(icon);

        // Content
        const content = document.createElement('div');
        content.className = 'achievement-toast-content';

        const header = document.createElement('div');
        header.className = 'achievement-toast-header';

        const badge = document.createElement('div');
        badge.className = 'achievement-toast-badge';
        badge.textContent = '🏆 UNLOCKED';

        header.appendChild(badge);

        const title = document.createElement('div');
        title.className = 'achievement-toast-title';
        title.textContent = achievement.name;

        const description = document.createElement('div');
        description.className = 'achievement-toast-description';
        description.textContent = achievement.description;

        content.appendChild(header);
        content.appendChild(title);
        content.appendChild(description);

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'achievement-toast-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => {
            this.removeToast(toast);
        });

        // Assemble toast
        toast.appendChild(iconWrapper);
        toast.appendChild(content);
        toast.appendChild(closeBtn);

        // Add to container
        container.appendChild(toast);

        // Play sound
        if (GameState.soundVolume > 0) {
            GameConfig.sounds.achievement.play().catch(() => { });
        }

        // Create confetti for achievement
        if (Utils) {
            Utils.createAchievementConfetti();
        }

        // Auto-remove after 5 seconds
        setTimeout(() => {
            this.removeToast(toast);
        }, 5000);
    },

    removeToast: function(toast) {
        toast.classList.add('removing');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            // Process next achievement in queue
            setTimeout(() => {
                this.processAchievementQueue();
            }, 300);
        }, 500);
    },

    // ==========================================
    // SIMPLE TOAST NOTIFICATIONS
    // ==========================================

    showToast: function(message, type = 'info') {
        const container = document.getElementById('achievement-toast-container');
        if (!container) return;

        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'simple-toast simple-toast-' + type;

        // Icon based on type
        let iconClass = 'fas fa-info-circle';
        let iconColor = '#3498db';

        if (type === 'success') {
            iconClass = 'fas fa-check-circle';
            iconColor = '#27ae60';
        } else if (type === 'error') {
            iconClass = 'fas fa-exclamation-circle';
            iconColor = '#e74c3c';
        } else if (type === 'warning') {
            iconClass = 'fas fa-exclamation-triangle';
            iconColor = '#f39c12';
        }

        // Icon
        const icon = document.createElement('i');
        icon.className = iconClass + ' simple-toast-icon';
        icon.style.color = iconColor;

        // Message
        const messageEl = document.createElement('div');
        messageEl.className = 'simple-toast-message';
        messageEl.textContent = message;

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'simple-toast-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => this.removeSimpleToast(toast);

        toast.appendChild(icon);
        toast.appendChild(messageEl);
        toast.appendChild(closeBtn);
        container.appendChild(toast);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            this.removeSimpleToast(toast);
        }, 4000);
    },

    removeSimpleToast: function(toast) {
        toast.classList.add('removing');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    },

    // ==========================================
    // INITIALIZATION
    // ==========================================

    init: function() {
        // No specific initialization needed for achievements system
        // Queue and toast container are managed dynamically
    }
};
