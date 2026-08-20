package com.cora.stylefinder.member.auth.dto;
public record TokenResponse(String accessToken, String refreshToken, String tokenType, long expiresIn) { }
