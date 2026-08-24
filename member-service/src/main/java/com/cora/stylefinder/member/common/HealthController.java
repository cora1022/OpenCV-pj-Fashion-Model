package com.cora.stylefinder.member.common;

import java.util.Map;
import org.flywaydb.core.Flyway;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
  private final JdbcTemplate jdbc;
  private final Flyway flyway;

  public HealthController(JdbcTemplate jdbc, Flyway flyway) {
    this.jdbc = jdbc;
    this.flyway = flyway;
  }

  @GetMapping("/health/live")
  Map<String, String> live() {
    return Map.of("status", "live");
  }

  @GetMapping("/health/ready")
  ResponseEntity<Map<String, Object>> ready() {
    boolean databaseReady = false;
    boolean migrationsReady = false;
    try {
      Integer result = jdbc.queryForObject("SELECT 1", Integer.class);
      databaseReady = result != null && result == 1;
      migrationsReady = flyway.info().pending().length == 0 && flyway.info().current() != null;
    } catch (Exception ignored) {
      // The readiness contract exposes dependency state, not database details.
    }

    boolean ready = databaseReady && migrationsReady;
    Map<String, Object> payload =
        Map.of(
            "status",
            ready ? "ready" : "not_ready",
            "checks",
            Map.of(
                "database", databaseReady,
                "flyway", migrationsReady));
    return ResponseEntity.status(ready ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
        .body(payload);
  }
}
