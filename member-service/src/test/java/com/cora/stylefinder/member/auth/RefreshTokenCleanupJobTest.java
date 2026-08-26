package com.cora.stylefinder.member.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;

class RefreshTokenCleanupJobTest {
  @Test
  void removesExpiredAndOldRevokedTokens() {
    RefreshTokenRepository tokens = mock(RefreshTokenRepository.class);
    when(tokens.deleteExpiredOrOldRevoked(any(), any())).thenReturn(3);
    RefreshTokenCleanupJob cleanup = new RefreshTokenCleanupJob(tokens, 24);

    assertEquals(3, cleanup.removeExpiredTokens());
    verify(tokens).deleteExpiredOrOldRevoked(any(), any());
  }
}
