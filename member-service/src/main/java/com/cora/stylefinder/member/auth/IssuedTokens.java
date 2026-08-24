package com.cora.stylefinder.member.auth;

import com.cora.stylefinder.member.auth.dto.TokenResponse;

public record IssuedTokens(
    String accessToken, String refreshToken, String tokenType, long expiresIn) {
  TokenResponse response() {
    return new TokenResponse(accessToken, tokenType, expiresIn);
  }
}
