package com.cora.stylefinder.member.activity;

import com.cora.stylefinder.member.activity.dto.CatalogMetadata;
import com.cora.stylefinder.member.activity.dto.CreateSavedResultRequest;
import com.cora.stylefinder.member.activity.dto.CreateSearchHistoryRequest;
import com.cora.stylefinder.member.activity.dto.PageResponse;
import com.cora.stylefinder.member.activity.dto.SavedResultResponse;
import com.cora.stylefinder.member.activity.dto.SearchHistoryResponse;
import com.cora.stylefinder.member.common.ApiException;
import com.cora.stylefinder.member.member.User;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ActivityService {
  private final SearchHistoryRepository histories;
  private final SavedResultRepository savedResults;
  private final ObjectMapper objectMapper;

  public ActivityService(
      SearchHistoryRepository histories,
      SavedResultRepository savedResults,
      ObjectMapper objectMapper) {
    this.histories = histories;
    this.savedResults = savedResults;
    this.objectMapper = objectMapper;
  }

  @Transactional(readOnly = true)
  public PageResponse<SearchHistoryResponse> histories(Long userId, int page, int size) {
    Page<SearchHistory> result =
        histories.findByUserIdOrderBySearchedAtDesc(userId, PageRequest.of(page, size));
    List<SearchHistoryResponse> items =
        result.getContent().stream().map(SearchHistoryResponse::from).toList();
    return PageResponse.from(result, items);
  }

  public SearchHistoryResponse addHistory(User user, CreateSearchHistoryRequest request) {
    SearchHistory history =
        histories.save(new SearchHistory(user, request.searchType(), request.cropMode()));
    return SearchHistoryResponse.from(history);
  }

  public void removeHistory(Long userId, Long id) {
    SearchHistory history =
        histories.findByIdAndUserId(id, userId).orElseThrow(this::historyNotFound);
    histories.delete(history);
  }

  @Transactional(readOnly = true)
  public PageResponse<SavedResultResponse> savedResults(Long userId, int page, int size) {
    Page<SavedResult> result =
        savedResults.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size));
    List<SavedResultResponse> items =
        result.getContent().stream().map(this::savedResponse).toList();
    return PageResponse.from(result, items);
  }

  public SavedResultResponse addSavedResult(User user, CreateSavedResultRequest request) {
    if (savedResults.existsByUserIdAndCatalogItemId(user.getId(), request.catalogItemId())) {
      throw duplicateSavedResult();
    }
    try {
      SavedResult result =
          savedResults.saveAndFlush(
              new SavedResult(
                  user,
                  request.catalogItemId(),
                  request.title(),
                  request.imageUrl(),
                  request.sourceUrl(),
                  request.similarityScore(),
                  request.modelVersion(),
                  writeMetadata(request.metadata())));
      return savedResponse(result);
    } catch (DataIntegrityViolationException exception) {
      throw duplicateSavedResult();
    }
  }

  public void removeSavedResult(Long userId, Long id) {
    SavedResult result =
        savedResults.findByIdAndUserId(id, userId).orElseThrow(this::savedResultNotFound);
    savedResults.delete(result);
  }

  private SavedResultResponse savedResponse(SavedResult result) {
    return new SavedResultResponse(
        result.getId(),
        result.getCatalogItemId(),
        result.getTitle(),
        result.getImageUrl(),
        result.getSourceUrl(),
        result.getSimilarityScore(),
        readMetadata(result.getMetadataJson()),
        result.getModelVersion(),
        result.getCreatedAt());
  }

  private String writeMetadata(CatalogMetadata metadata) {
    try {
      return objectMapper.writeValueAsString(metadata);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("Could not serialize catalog metadata", exception);
    }
  }

  private CatalogMetadata readMetadata(String metadataJson) {
    try {
      return objectMapper.readValue(metadataJson, CatalogMetadata.class);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("Could not deserialize catalog metadata", exception);
    }
  }

  private ApiException duplicateSavedResult() {
    return new ApiException("DUPLICATE_SAVED_RESULT", "이미 저장한 결과입니다.", HttpStatus.CONFLICT);
  }

  private ApiException historyNotFound() {
    return new ApiException("SEARCH_HISTORY_NOT_FOUND", "검색 기록을 찾을 수 없습니다.", HttpStatus.NOT_FOUND);
  }

  private ApiException savedResultNotFound() {
    return new ApiException("SAVED_RESULT_NOT_FOUND", "저장한 결과를 찾을 수 없습니다.", HttpStatus.NOT_FOUND);
  }
}
