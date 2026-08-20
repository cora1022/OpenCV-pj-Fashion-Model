package com.cora.stylefinder.member.member;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "users")
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true) private String email;
    @Column(name = "password_hash", nullable = false) private String passwordHash;
    @Column(name = "display_name", nullable = false) private String displayName;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private Role role = Role.USER;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    protected User() { }
    public User(String email, String passwordHash, String displayName) { this.email = email; this.passwordHash = passwordHash; this.displayName = displayName; }
    @PrePersist void created() { createdAt = Instant.now(); updatedAt = createdAt; }
    @PreUpdate void updated() { updatedAt = Instant.now(); }
    public Long getId() { return id; } public String getEmail() { return email; } public String getPasswordHash() { return passwordHash; } public String getDisplayName() { return displayName; } public Role getRole() { return role; }
}
