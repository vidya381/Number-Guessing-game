package com.example.numberguessinggame.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "achievements")
public class Achievement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AchievementType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AchievementCategory category;

    @Column(name = "threshold_value")
    private Integer thresholdValue;

    @Column(name = "icon_class", length = 50)
    private String iconClass;

    @Column(name = "icon_color", length = 20)
    private String iconColor;

    @Column(nullable = false)
    private Integer points = 0;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // Constructors
    public Achievement() {}

    public Achievement(String code, String name, String description, AchievementType type,
                      AchievementCategory category, Integer thresholdValue,
                      String iconClass, String iconColor, Integer points) {
        this.code = code;
        this.name = name;
        this.description = description;
        this.type = type;
        this.category = category;
        this.thresholdValue = thresholdValue;
        this.iconClass = iconClass;
        this.iconColor = iconColor;
        this.points = points;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public AchievementType getType() {
        return type;
    }

    public void setType(AchievementType type) {
        this.type = type;
    }

    public AchievementCategory getCategory() {
        return category;
    }

    public void setCategory(AchievementCategory category) {
        this.category = category;
    }

    public Integer getThresholdValue() {
        return thresholdValue;
    }

    public void setThresholdValue(Integer thresholdValue) {
        this.thresholdValue = thresholdValue;
    }

    public String getIconClass() {
        return iconClass;
    }

    public void setIconClass(String iconClass) {
        this.iconClass = iconClass;
    }

    public String getIconColor() {
        return iconColor;
    }

    public void setIconColor(String iconColor) {
        this.iconColor = iconColor;
    }

    public Integer getPoints() {
        return points;
    }

    public void setPoints(Integer points) {
        this.points = points;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    // Enums
    public enum AchievementType {
        MILESTONE,    // Total games/wins milestones
        SKILL,        // Based on performance (attempts, time)
        DIFFICULTY,   // Difficulty-specific achievements
        STREAK        // Future: consecutive wins/plays
    }

    public enum AchievementCategory {
        GAMES,        // Total games played
        WINS,         // Total wins
        ATTEMPTS,     // Performance based on attempts
        TIME,         // Performance based on time
        DIFFICULTY,   // Difficulty-specific
        STREAK        // Future: streak tracking
    }
}
