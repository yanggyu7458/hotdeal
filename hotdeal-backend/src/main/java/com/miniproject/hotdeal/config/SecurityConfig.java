package com.miniproject.hotdeal.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // 크롤러/ 리액트 연동용 : API 는 CSRF 끄는게 편함(POST 막힘 방지)
            .csrf(csrf -> csrf.disable())
            // 일단 개발 단계: /api/** 전부 허용
            .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/api/**").permitAll()
                    .anyRequest().permitAll()
            )

            // 기본 로그인 폼도 꺼버림(나중에 필요 시 다시 켜기)
            .httpBasic(Customizer.withDefaults())
            .formLogin(form -> form.disable());

        return http.build();
    }
}
