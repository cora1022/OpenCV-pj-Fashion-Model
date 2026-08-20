package com.cora.stylefinder.member.config;
import io.jsonwebtoken.*; import io.jsonwebtoken.security.Keys; import java.nio.charset.StandardCharsets; import java.time.*; import java.util.*; import javax.crypto.SecretKey; import org.springframework.beans.factory.annotation.Value; import org.springframework.stereotype.Service;
@Service public class JwtService {
 private final SecretKey key; private final long accessSeconds; private final long refreshSeconds;
 public JwtService(@Value("${app.security.jwt-secret}") String secret,@Value("${app.security.access-token-seconds}") long access,@Value("${app.security.refresh-token-seconds}") long refresh){ if(secret==null||secret.getBytes(StandardCharsets.UTF_8).length<32) throw new IllegalStateException("JWT secret must be at least 32 bytes"); key=Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)); accessSeconds=access; refreshSeconds=refresh; }
 public String accessToken(Long userId,String role){return token(userId,"access",role,accessSeconds);} public String refreshToken(Long userId){return token(userId,"refresh",null,refreshSeconds);} private String token(Long id,String type,String role,long seconds){JwtBuilder b=Jwts.builder().subject(id.toString()).claim("type",type).issuedAt(new Date()).expiration(Date.from(Instant.now().plusSeconds(seconds))).signWith(key); if(role!=null)b.claim("role",role); return b.compact();}
 public Claims parse(String token){return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();} public long accessSeconds(){return accessSeconds;}
}
