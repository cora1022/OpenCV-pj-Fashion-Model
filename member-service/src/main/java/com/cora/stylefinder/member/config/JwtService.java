package com.cora.stylefinder.member.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtBuilder;
import io.jsonwebtoken.Jwts;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    private final PrivateKey privateKey;
    private final PublicKey publicKey;
    private final long accessSeconds;
    private final long refreshSeconds;
    private final String issuer;
    private final String audience;

    public JwtService(
            @Value("${app.security.private-key-path}") Path privateKeyPath,
            @Value("${app.security.public-key-path}") Path publicKeyPath,
            @Value("${app.security.access-token-seconds}") long accessSeconds,
            @Value("${app.security.refresh-token-seconds}") long refreshSeconds,
            @Value("${app.security.issuer}") String issuer,
            @Value("${app.security.audience}") String audience) {
        this.privateKey = loadPrivateKey(privateKeyPath);
        this.publicKey = loadPublicKey(publicKeyPath);
        this.accessSeconds = accessSeconds;
        this.refreshSeconds = refreshSeconds;
        this.issuer = issuer;
        this.audience = audience;
    }

    public String accessToken(Long userId, String role) {
        return token(userId, "access", role, accessSeconds);
    }

    public String refreshToken(Long userId) {
        return token(userId, "refresh", null, refreshSeconds);
    }

    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(publicKey)
                .requireIssuer(issuer)
                .requireAudience(audience)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public long accessSeconds() {
        return accessSeconds;
    }

    public long refreshSeconds() {
        return refreshSeconds;
    }

    private String token(Long userId, String type, String role, long seconds) {
        Instant now = Instant.now();
        JwtBuilder builder = Jwts.builder()
                .subject(userId.toString())
                .issuer(issuer)
                .audience()
                .add(audience)
                .and()
                .claim("type", type)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(seconds)))
                .signWith(privateKey, Jwts.SIG.RS256);
        if (role != null) {
            builder.claim("role", role);
        }
        return builder.compact();
    }

    private static PrivateKey loadPrivateKey(Path path) {
        try {
            byte[] bytes = decodePem(Files.readString(path), "PRIVATE KEY");
            return KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(bytes));
        } catch (Exception exception) {
            throw new IllegalStateException("Could not load JWT private key", exception);
        }
    }

    private static PublicKey loadPublicKey(Path path) {
        try {
            byte[] bytes = decodePem(Files.readString(path), "PUBLIC KEY");
            return KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(bytes));
        } catch (Exception exception) {
            throw new IllegalStateException("Could not load JWT public key", exception);
        }
    }

    private static byte[] decodePem(String pem, String type) throws IOException {
        String encoded = pem
                .replace("-----BEGIN " + type + "-----", "")
                .replace("-----END " + type + "-----", "")
                .replaceAll("\\s", "");
        return Base64.getDecoder().decode(encoded);
    }
}
