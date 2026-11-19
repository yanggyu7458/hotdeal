package com.miniproject.hotdeal.controller.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class KeywordRequest {
    private String expoToken; // FCM Expo Push Token
    private String keyword;
    private Integer minPrice; // 최소 가격 (선택 사항)
    private Integer maxPrice; // 최대 가격 (선택 사항)
    private String category;  // 카테고리 (선택 사항, "전체" 포함)
}
