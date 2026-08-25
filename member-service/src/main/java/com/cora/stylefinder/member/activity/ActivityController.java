package com.cora.stylefinder.member.activity;

import com.cora.stylefinder.member.activity.dto.CreateSavedResultRequest;
import com.cora.stylefinder.member.activity.dto.CreateSearchHistoryRequest;
import com.cora.stylefinder.member.activity.dto.PageResponse;
import com.cora.stylefinder.member.activity.dto.SavedResultResponse;
import com.cora.stylefinder.member.activity.dto.SearchHistoryResponse;
import com.cora.stylefinder.member.member.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/members")
public class ActivityController {
  private final ActivityService activity;

  public ActivityController(ActivityService activity) {
    this.activity = activity;
  }

  @GetMapping("/search-histories")
  PageResponse<SearchHistoryResponse> histories(
      @AuthenticationPrincipal User user,
      @RequestParam(defaultValue = "0") @Min(0) int page,
      @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
    return activity.histories(user.getId(), page, size);
  }

  @PostMapping("/search-histories")
  ResponseEntity<SearchHistoryResponse> addHistory(
      @AuthenticationPrincipal User user, @Valid @RequestBody CreateSearchHistoryRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(activity.addHistory(user, request));
  }

  @DeleteMapping("/search-histories/{id}")
  ResponseEntity<Void> removeHistory(@AuthenticationPrincipal User user, @PathVariable Long id) {
    activity.removeHistory(user.getId(), id);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/saved-results")
  PageResponse<SavedResultResponse> savedResults(
      @AuthenticationPrincipal User user,
      @RequestParam(defaultValue = "0") @Min(0) int page,
      @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
    return activity.savedResults(user.getId(), page, size);
  }

  @PostMapping("/saved-results")
  ResponseEntity<SavedResultResponse> addSavedResult(
      @AuthenticationPrincipal User user, @Valid @RequestBody CreateSavedResultRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(activity.addSavedResult(user, request));
  }

  @DeleteMapping("/saved-results/{id}")
  ResponseEntity<Void> removeSavedResult(
      @AuthenticationPrincipal User user, @PathVariable Long id) {
    activity.removeSavedResult(user.getId(), id);
    return ResponseEntity.noContent().build();
  }
}
