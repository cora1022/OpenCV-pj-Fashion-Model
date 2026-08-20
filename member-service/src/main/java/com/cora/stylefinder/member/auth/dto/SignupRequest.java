package com.cora.stylefinder.member.auth.dto;
import jakarta.validation.constraints.*;
public record SignupRequest(@Email @NotBlank String email, @NotBlank @Size(min=8,max=72) String password, @NotBlank @Size(max=80) String displayName) { }
