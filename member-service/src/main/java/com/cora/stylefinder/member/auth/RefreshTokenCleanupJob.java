package com.cora.stylefinder.member.auth;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class RefreshTokenCleanupJob {
  private final RefreshTokenRepository tokens;
  private final long revokedRetentionHours;

  public RefreshTokenCleanupJob(
      RefreshTokenRepository tokens,
      @Value("${app.security.refresh-token-cleanup.revoked-retention-hours}")
          long revokedRetentionHours) {
    this.tokens = tokens;
    this.revokedRetentionHours = revokedRetentionHours;
  }

  @Scheduled(fixedDelayString = "${app.security.refresh-token-cleanup.interval-ms}")
  @Transactional
  public int removeExpiredTokens() {
    Instant now = Instant.now();
    return tokens.deleteExpiredOrOldRevoked(
        now, now.minus(revokedRetentionHours, ChronoUnit.HOURS));
  }
}
