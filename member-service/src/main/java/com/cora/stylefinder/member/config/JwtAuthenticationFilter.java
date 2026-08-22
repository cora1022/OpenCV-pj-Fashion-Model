package com.cora.stylefinder.member.config;

import com.cora.stylefinder.member.common.SecurityErrorWriter;
import com.cora.stylefinder.member.member.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwt;
    private final UserRepository users;
    private final SecurityErrorWriter errorWriter;

    public JwtAuthenticationFilter(
            JwtService jwt, UserRepository users, SecurityErrorWriter errorWriter) {
        this.jwt = jwt;
        this.users = users;
        this.errorWriter = errorWriter;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            chain.doFilter(request, response);
            return;
        }

        try {
            Claims claims = jwt.parse(header.substring(7));
            if (!"access".equals(claims.get("type", String.class))) {
                writeInvalid(request, response);
                return;
            }
            Long userId = Long.valueOf(claims.getSubject());
            users.findById(userId).ifPresent(user -> {
                var authentication = new UsernamePasswordAuthenticationToken(
                        user,
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            });
        } catch (ExpiredJwtException exception) {
            errorWriter.write(
                    request,
                    response,
                    HttpServletResponse.SC_UNAUTHORIZED,
                    "ACCESS_TOKEN_EXPIRED",
                    "로그인이 만료되었습니다. 다시 로그인해주세요.");
            return;
        } catch (JwtException | IllegalArgumentException exception) {
            writeInvalid(request, response);
            return;
        }
        chain.doFilter(request, response);
    }

    private void writeInvalid(HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        errorWriter.write(
                request,
                response,
                HttpServletResponse.SC_UNAUTHORIZED,
                "ACCESS_TOKEN_INVALID",
                "유효하지 않은 인증 정보입니다.");
    }
}
