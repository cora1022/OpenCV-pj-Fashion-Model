package com.cora.stylefinder.member.activity.dto;

import com.cora.stylefinder.member.activity.SearchHistory;
import java.time.Instant;

public record SearchHistoryResponse(
    Long id, String searchType, String cropMode, Instant searchedAt) {
  public static SearchHistoryResponse from(SearchHistory history) {
    return new SearchHistoryResponse(
        history.getId(), history.getSearchType(), history.getCropMode(), history.getSearchedAt());
  }
}
