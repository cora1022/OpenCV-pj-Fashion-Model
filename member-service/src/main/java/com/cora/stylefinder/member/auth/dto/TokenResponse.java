package com.cora.stylefinder.member.auth.dto;

public record TokenResponse(String accessToken, String tokenType, long expiresIn) {}
