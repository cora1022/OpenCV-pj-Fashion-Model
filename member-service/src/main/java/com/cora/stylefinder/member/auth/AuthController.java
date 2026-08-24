package com.cora.stylefinder.member.auth;

import com.cora.stylefinder.member.auth.dto.LoginRequest;
import com.cora.stylefinder.member.auth.dto.SignupRequest;
import com.cora.stylefinder.member.auth.dto.TokenResponse;
import com.cora.stylefinder.member.member.User;
import com.cora.stylefinder.member.member.dto.MemberResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/members")
public class AuthController {
  private final AuthService auth;
  private final RefreshCookieService refreshCookie;

  public AuthController(AuthService auth, RefreshCookieService refreshCookie) {
    this.auth = auth;
    this.refreshCookie = refreshCookie;
  }

  @PostMapping("/signup")
  ResponseEntity<MemberResponse> signup(@Valid @RequestBody SignupRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(auth.signup(request));
  }

  @PostMapping("/login")
  ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest request) {
    IssuedTokens tokens = auth.login(request);
    return tokenResponse(tokens);
  }

  @PostMapping("/token/refresh")
  ResponseEntity<TokenResponse> refresh(
      @CookieValue(
              name = "${app.security.refresh-cookie.name:style_finder_refresh}",
              required = false)
          String refreshToken) {
    IssuedTokens tokens = auth.refresh(refreshToken);
    return tokenResponse(tokens);
  }

  @PostMapping("/logout")
  ResponseEntity<Void> logout(
      @AuthenticationPrincipal User user,
      @CookieValue(
              name = "${app.security.refresh-cookie.name:style_finder_refresh}",
              required = false)
          String refreshToken) {
    auth.logout(user, refreshToken);
    return ResponseEntity.noContent()
        .header(HttpHeaders.SET_COOKIE, refreshCookie.clear().toString())
        .build();
  }

  @GetMapping("/me")
  MemberResponse me(@AuthenticationPrincipal User user) {
    return auth.me(user);
  }

  private ResponseEntity<TokenResponse> tokenResponse(IssuedTokens tokens) {
    return ResponseEntity.ok()
        .header(HttpHeaders.SET_COOKIE, refreshCookie.create(tokens.refreshToken()).toString())
        .body(tokens.response());
  }
}
