package com.cora.stylefinder.member.activity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CreateSearchHistoryRequest(
    @NotBlank @Pattern(regexp = "IMAGE_UPLOAD|CATALOG_ITEM") String searchType,
    @Pattern(regexp = "AUTO|MANUAL|CATALOG") String cropMode) {}
