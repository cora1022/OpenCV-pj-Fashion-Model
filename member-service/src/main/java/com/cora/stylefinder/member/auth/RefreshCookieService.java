package com.cora.stylefinder.member.auth;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class RefreshCookieService {
  private final String name;
  private final String path;
  private final String sameSite;
  private final boolean secure;
  private final long maxAgeSeconds;

  public RefreshCookieService(
      @Value("${app.security.refresh-cookie.name}") String name,
      @Value("${app.security.refresh-cookie.path}") String path,
      @Value("${app.security.refresh-cookie.same-site}") String sameSite,
      @Value("${app.security.refresh-cookie.secure}") boolean secure,
      @Value("${app.security.refresh-cookie.max-age-seconds}") long maxAgeSeconds) {
    this.name = name;
    this.path = path;
    this.sameSite = sameSite;
    this.secure = secure;
    this.maxAgeSeconds = maxAgeSeconds;
  }

  ResponseCookie create(String token) {
    return base(token).maxAge(Duration.ofSeconds(maxAgeSeconds)).build();
  }

  ResponseCookie clear() {
    return base("").maxAge(Duration.ZERO).build();
  }

  private ResponseCookie.ResponseCookieBuilder base(String value) {
    return ResponseCookie.from(name, value)
        .httpOnly(true)
        .secure(secure)
        .sameSite(sameSite)
        .path(path);
  }
}
