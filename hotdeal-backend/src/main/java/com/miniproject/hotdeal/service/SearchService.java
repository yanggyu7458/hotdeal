package com.miniproject.hotdeal.service;

import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class SearchService {
    
    private final StringRedisTemplate redisTemplate;
    private static final String POPULAR_SEARCH_KEY = "ranking:popular_searches";

    public SearchService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    // 1. 검색어 점수 +1 증가
    public void addSearchKeyword(String keyword) {
        // 검색어가 공백이거나 너무 짧으면 무시 (옵션)
        if (keyword == null || keyword.trim().isEmpty() || keyword.length() < 2) {
            return;
        }
        // ZSET에 해당 키워드의 점수를 1 증가시킴 (없으면 새로 추가됨)
        redisTemplate.opsForZSet().incrementScore(POPULAR_SEARCH_KEY, keyword.trim(), 1);
    }

    // 2. 인기 검색어 Top 10 가져오기
    public List<String> getPopularKeywords() {
        // 점수가 가장 높은 순(reverseRange)으로 10개 조회
        Set<String> topKeywords = redisTemplate.opsForZSet().reverseRange(POPULAR_SEARCH_KEY, 0, 9);
        
        if (topKeywords == null || topKeywords.isEmpty()) {
            return Collections.emptyList();
        }
        
        return topKeywords.stream().collect(Collectors.toList());
    }
}
