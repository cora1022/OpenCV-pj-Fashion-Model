package com.cora.stylefinder.member.activity.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateSavedResultRequest(
    @NotBlank @Size(max = 128) String catalogItemId,
    @NotBlank @Size(max = 255) String title,
    @NotBlank @Size(max = 500) String imageUrl,
    @Size(max = 500) String sourceUrl,
    @DecimalMin("0.0") @DecimalMax("1.0") double similarityScore,
    @NotNull @Valid CatalogMetadata metadata,
    @NotBlank @Size(max = 255) String modelVersion) {}
