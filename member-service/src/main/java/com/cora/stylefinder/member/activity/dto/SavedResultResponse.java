package com.cora.stylefinder.member.activity.dto;

import java.time.Instant;

public record SavedResultResponse(
    Long id,
    String catalogItemId,
    String title,
    String imageUrl,
    String sourceUrl,
    double similarityScore,
    CatalogMetadata metadata,
    String modelVersion,
    Instant createdAt) {}
