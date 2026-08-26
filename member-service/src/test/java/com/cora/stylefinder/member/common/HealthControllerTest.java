package com.cora.stylefinder.member.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Map;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.CannotGetJdbcConnectionException;
import org.springframework.jdbc.core.JdbcTemplate;

class HealthControllerTest {
  @Test
  void readinessReturns503WhenDatabaseIsUnavailable() {
    JdbcTemplate jdbc = mock(JdbcTemplate.class);
    when(jdbc.queryForObject("SELECT 1", Integer.class))
        .thenThrow(new CannotGetJdbcConnectionException("unavailable"));
    HealthController health = new HealthController(jdbc, mock(Flyway.class));

    var response = health.ready();

    assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
    assertEquals("not_ready", response.getBody().get("status"));
    @SuppressWarnings("unchecked")
    Map<String, Boolean> checks = (Map<String, Boolean>) response.getBody().get("checks");
    assertEquals(false, checks.get("database"));
    assertEquals(false, checks.get("flyway"));
  }
}
