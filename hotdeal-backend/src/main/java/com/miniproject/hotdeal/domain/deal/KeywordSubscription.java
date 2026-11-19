package com.miniproject.hotdeal.domain.deal;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name="keyword_subscription",
    uniqueConstraints = {
        // 유저별로 같은 키워드 중복 구독 방지
        @UniqueConstraint(columnNames = {"expo_token", "keyword"})
    }
)
@Getter
@Setter
@NoArgsConstructor
public class KeywordSubscription {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String expoToken; // Expo 푸시 토큰

    @Column(nullable = false)
    private String keyword; // 구독 키워드

    @Column(name = "min_price")
    private Integer minPrice; // 최소 가격 (선택 사항)

    @Column(name = "max_price")
    private Integer maxPrice; // 최대 가격 (선택 사항)

    @Column(name = "category")
    private String category; // 카테고리 (선택 사항)

    @Column(name="created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public KeywordSubscription(String expoToken, String keyword, Integer minPrice, Integer maxPrice, String category) {
        this.expoToken = expoToken;
        this.keyword = keyword;
        this.minPrice = minPrice;
        this.maxPrice = maxPrice;
        this.category = category == null ? "전체" : category; // 카테고리가 null이면 "전체"로 설정
    }
}
