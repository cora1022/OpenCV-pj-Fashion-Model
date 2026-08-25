package com.cora.stylefinder.member.activity;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SearchHistoryRepository extends JpaRepository<SearchHistory, Long> {
  Page<SearchHistory> findByUserIdOrderBySearchedAtDesc(Long userId, Pageable pageable);

  Optional<SearchHistory> findByIdAndUserId(Long id, Long userId);
}
