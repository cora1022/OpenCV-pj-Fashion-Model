package com.cora.stylefinder.member.common;
import jakarta.servlet.*; import jakarta.servlet.http.*; import java.io.IOException; import java.util.UUID; import org.springframework.stereotype.Component; import org.springframework.web.filter.OncePerRequestFilter;
@Component public class RequestIdFilter extends OncePerRequestFilter {
 @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain)throws ServletException,IOException { String id=req.getHeader("X-Request-ID"); if(id==null||id.isBlank()) id=UUID.randomUUID().toString(); req.setAttribute("requestId",id); res.setHeader("X-Request-ID",id); chain.doFilter(req,res); }
}
