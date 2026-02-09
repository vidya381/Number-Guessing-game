package com.example.numberguessinggame.repository;

import com.example.numberguessinggame.entity.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    // Case-insensitive username lookup for authentication
    @Query("SELECT u FROM User u WHERE LOWER(u.username) = LOWER(:username)")
    Optional<User> findByUsernameIgnoreCase(String username);

    boolean existsByUsername(String username);

    // Case-insensitive check for username existence during registration
    @Query("SELECT CASE WHEN COUNT(u) > 0 THEN true ELSE false END FROM User u WHERE LOWER(u.username) = LOWER(:username)")
    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.bestScore IS NOT NULL ORDER BY u.bestScore ASC, u.totalWins DESC")
    List<User> findTopPlayersByBestScore(Pageable pageable);
}
