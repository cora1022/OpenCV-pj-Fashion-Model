package com.cora.stylefinder.member;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cora.stylefinder.member.auth.RefreshTokenRepository;
import com.cora.stylefinder.member.member.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.util.Base64;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootTest(classes = {MemberServiceApplication.class, MemberApiIntegrationTest.AdminApi.class})
@AutoConfigureMockMvc
class MemberApiIntegrationTest {
    private static final KeyPaths KEY_PATHS = createKeys();

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository users;
    @Autowired RefreshTokenRepository refreshTokens;

    @DynamicPropertySource
    static void jwtProperties(DynamicPropertyRegistry registry) {
        registry.add("app.security.private-key-path", () -> KEY_PATHS.privateKey().toString());
        registry.add("app.security.public-key-path", () -> KEY_PATHS.publicKey().toString());
    }

    @BeforeEach
    void cleanDatabase() {
        refreshTokens.deleteAll();
        users.deleteAll();
    }

    @Test
    void unauthenticatedMemberRequestReturnsJson401() throws Exception {
        mockMvc.perform(get("/api/members/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("AUTHENTICATION_REQUIRED"))
                .andExpect(jsonPath("$.error.requestId").isNotEmpty());
    }

    @Test
    void signupNormalizesEmailAndRejectsCaseInsensitiveDuplicate() throws Exception {
        signup("Member@Example.com").andExpect(status().isCreated());

        signup("member@example.COM")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("EMAIL_ALREADY_EXISTS"));
    }

    @Test
    void loginAccessTokenAuthenticatesMember() throws Exception {
        signup("member@example.com").andExpect(status().isCreated());
        String accessToken = login("member@example.com");

        mockMvc.perform(get("/api/members/me").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("member@example.com"));
    }

    @Test
    void invalidAccessTokenReturnsJson401() throws Exception {
        mockMvc.perform(get("/api/members/me").header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("ACCESS_TOKEN_INVALID"));
    }

    @Test
    void userRoleCannotAccessAdminEndpoint() throws Exception {
        signup("member@example.com").andExpect(status().isCreated());
        String accessToken = login("member@example.com");

        mockMvc.perform(get("/api/members/admin/ping")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    private org.springframework.test.web.servlet.ResultActions signup(String email) throws Exception {
        return mockMvc.perform(post("/api/members/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                        new SignupPayload(email, "password123", "테스트 사용자"))));
    }

    private String login(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/members/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginPayload(email, "password123"))))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
        return response.get("accessToken").asText();
    }

    private static String pem(String type, byte[] encoded) {
        String body = Base64.getMimeEncoder(64, new byte[] {'\n'}).encodeToString(encoded);
        return "-----BEGIN " + type + "-----\n" + body + "\n-----END " + type + "-----\n";
    }

    private static KeyPaths createKeys() {
        try {
            Path directory = Files.createTempDirectory("style-finder-jwt-test");
            Path privateKey = directory.resolve("private.pem");
            Path publicKey = directory.resolve("public.pem");
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            KeyPair keyPair = generator.generateKeyPair();
            Files.writeString(privateKey, pem("PRIVATE KEY", keyPair.getPrivate().getEncoded()));
            Files.writeString(publicKey, pem("PUBLIC KEY", keyPair.getPublic().getEncoded()));
            return new KeyPaths(privateKey, publicKey);
        } catch (Exception exception) {
            throw new IllegalStateException("Could not create test JWT keys", exception);
        }
    }

    record SignupPayload(String email, String password, String displayName) {}

    record LoginPayload(String email, String password) {}

    record KeyPaths(Path privateKey, Path publicKey) {}

    @RestController
    static class AdminApi {
        @GetMapping("/api/members/admin/ping")
        String ping() {
            return "ok";
        }
    }
}
