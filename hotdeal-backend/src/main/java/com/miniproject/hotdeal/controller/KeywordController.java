package com.miniproject.hotdeal.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.miniproject.hotdeal.controller.dto.request.KeywordRequest;
import com.miniproject.hotdeal.domain.deal.KeywordSubscription;
import com.miniproject.hotdeal.repository.KeywordSubscriptionRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/keywords")
@RequiredArgsConstructor
public class KeywordController {
    
    private final KeywordSubscriptionRepository keywordSubscriptionRepository;

    @PostMapping
    @Transactional
    public ResponseEntity<String> registerKeyword(@RequestBody KeywordRequest request) {
        // 1. 이미 등록된 토큰 + 키워드인지 확인
        KeywordSubscription existing = keywordSubscriptionRepository
            .findAll()
            .stream()
            .filter(k -> k.getExpoToken().equals(request.getExpoToken()) && k.getKeyword().equals(request.getKeyword()))
            .findFirst()
            .orElse(null);

        // 2. DB에 저장
        if (existing != null) {
            // 이미 등록된 경우, 가격 범위와 카테고리 업데이트
            existing.setMinPrice(request.getMinPrice());
            existing.setMaxPrice(request.getMaxPrice());
            existing.setCategory(request.getCategory());
            keywordSubscriptionRepository.save(existing);
        } else {
            // 신규 등록인 경우, 새 엔티티 생성
            KeywordSubscription newSubscription = new KeywordSubscription(
                request.getExpoToken(),
                request.getKeyword(),
                request.getMinPrice(),
                request.getMaxPrice(),
                request.getCategory()
            );

            keywordSubscriptionRepository.save(newSubscription);
        }

        return ResponseEntity.ok("키워드가 등록되었습니다.");
    }
}
