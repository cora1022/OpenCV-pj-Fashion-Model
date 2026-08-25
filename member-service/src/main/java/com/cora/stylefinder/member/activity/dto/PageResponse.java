package com.cora.stylefinder.member.activity.dto;

import java.util.List;
import org.springframework.data.domain.Page;

public record PageResponse<T>(
    List<T> items, int page, int size, long totalElements, int totalPages) {
  public static <S, T> PageResponse<T> from(Page<S> source, List<T> items) {
    return new PageResponse<>(
        items,
        source.getNumber(),
        source.getSize(),
        source.getTotalElements(),
        source.getTotalPages());
  }
}
