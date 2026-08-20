package com.cora.stylefinder.member.common;
import jakarta.servlet.http.HttpServletRequest; import java.util.Map; import org.springframework.http.*; import org.springframework.web.bind.MethodArgumentNotValidException; import org.springframework.web.bind.annotation.*;
@RestControllerAdvice public class ApiExceptionHandler {
 @ExceptionHandler(ApiException.class) ResponseEntity<Map<String,Object>> api(ApiException e,HttpServletRequest r){return response(e.status(),e.code(),e.getMessage(),r);}
 @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<Map<String,Object>> validation(HttpServletRequest r){return response(HttpStatus.BAD_REQUEST,"VALIDATION_ERROR","요청 값을 확인해주세요.",r);}
 @ExceptionHandler(Exception.class) ResponseEntity<Map<String,Object>> internal(Exception e,HttpServletRequest r){return response(HttpStatus.INTERNAL_SERVER_ERROR,"INTERNAL_ERROR","요청을 처리하지 못했습니다.",r);}
 static ResponseEntity<Map<String,Object>> response(HttpStatus s,String c,String m,HttpServletRequest r){return ResponseEntity.status(s).body(Map.of("error",Map.of("code",c,"message",m,"requestId",String.valueOf(r.getAttribute("requestId")))));}
}
