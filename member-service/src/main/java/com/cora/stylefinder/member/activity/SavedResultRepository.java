package com.cora.stylefinder.member.activity;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SavedResultRepository extends JpaRepository<SavedResult, Long> {
  Page<SavedResult> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

  Optional<SavedResult> findByIdAndUserId(Long id, Long userId);

  boolean existsByUserIdAndCatalogItemId(Long userId, String catalogItemId);
}
