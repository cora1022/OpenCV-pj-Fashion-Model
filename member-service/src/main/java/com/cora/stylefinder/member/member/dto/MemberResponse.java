package com.cora.stylefinder.member.member.dto;
import com.cora.stylefinder.member.member.User;
public record MemberResponse(Long id, String email, String displayName, String role) { public static MemberResponse from(User user) { return new MemberResponse(user.getId(), user.getEmail(), user.getDisplayName(), user.getRole().name()); } }
