package com.cora.stylefinder.member.activity;

import com.cora.stylefinder.member.member.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "search_histories")
public class SearchHistory {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @Column(name = "search_type", nullable = false, length = 30)
  private String searchType;

  @Column(name = "crop_mode", length = 30)
  private String cropMode;

  @Column(name = "searched_at", nullable = false, updatable = false)
  private Instant searchedAt;

  protected SearchHistory() {}

  public SearchHistory(User user, String searchType, String cropMode) {
    this.user = user;
    this.searchType = searchType;
    this.cropMode = cropMode;
  }

  @PrePersist
  void setSearchedAt() {
    if (searchedAt == null) searchedAt = Instant.now();
  }

  public Long getId() {
    return id;
  }

  public String getSearchType() {
    return searchType;
  }

  public String getCropMode() {
    return cropMode;
  }

  public Instant getSearchedAt() {
    return searchedAt;
  }
}
