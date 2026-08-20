package com.cora.stylefinder.member.common;
import java.util.Map; import org.springframework.web.bind.annotation.*;
@RestController public class HealthController { @GetMapping("/health/live") Map<String,String> live(){return Map.of("status","live");} @GetMapping("/health/ready") Map<String,String> ready(){return Map.of("status","ready");} }
