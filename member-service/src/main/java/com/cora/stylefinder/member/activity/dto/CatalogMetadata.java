package com.cora.stylefinder.member.activity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CatalogMetadata(
    @NotBlank @Size(max = 80) String category,
    @NotNull @Size(max = 20) List<@NotBlank @Size(max = 50) String> colors,
    @NotNull @Size(max = 30) List<@NotBlank @Size(max = 80) String> styleTags) {}
