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
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

@Entity
@Table(
    name = "saved_results",
    uniqueConstraints =
        @UniqueConstraint(
            name = "uk_saved_user_catalog",
            columnNames = {"user_id", "catalog_item_id"}))
public class SavedResult {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @Column(name = "catalog_item_id", nullable = false, length = 128)
  private String catalogItemId;

  @Column(nullable = false, length = 255)
  private String title;

  @Column(name = "image_url", nullable = false, length = 500)
  private String imageUrl;

  @Column(name = "source_url", length = 500)
  private String sourceUrl;

  @Column(name = "similarity_score", nullable = false)
  private double similarityScore;

  @Column(name = "model_version", nullable = false, length = 255)
  private String modelVersion;

  @Column(name = "metadata_json", nullable = false, columnDefinition = "TEXT")
  private String metadataJson;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  protected SavedResult() {}

  public SavedResult(
      User user,
      String catalogItemId,
      String title,
      String imageUrl,
      String sourceUrl,
      double similarityScore,
      String modelVersion,
      String metadataJson) {
    this.user = user;
    this.catalogItemId = catalogItemId;
    this.title = title;
    this.imageUrl = imageUrl;
    this.sourceUrl = sourceUrl;
    this.similarityScore = similarityScore;
    this.modelVersion = modelVersion;
    this.metadataJson = metadataJson;
  }

  @PrePersist
  void setCreatedAt() {
    if (createdAt == null) createdAt = Instant.now();
  }

  public Long getId() {
    return id;
  }

  public String getCatalogItemId() {
    return catalogItemId;
  }

  public String getTitle() {
    return title;
  }

  public String getImageUrl() {
    return imageUrl;
  }

  public String getSourceUrl() {
    return sourceUrl;
  }

  public double getSimilarityScore() {
    return similarityScore;
  }

  public String getModelVersion() {
    return modelVersion;
  }

  public String getMetadataJson() {
    return metadataJson;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
