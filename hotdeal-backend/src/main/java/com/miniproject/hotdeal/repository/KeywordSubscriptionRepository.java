package com.miniproject.hotdeal.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.miniproject.hotdeal.domain.deal.KeywordSubscription;

public interface KeywordSubscriptionRepository extends JpaRepository<KeywordSubscription, Long> {

    // 역방향 LIKE 쿼리: dealTitle에 keyword가 포함된 구독 찾기 + 가격조건과 카테고리 조건
    @Query("SELECT k FROM KeywordSubscription k WHERE :dealTitle LIKE CONCAT('%', k.keyword, '%')" +
           " AND (k.minPrice IS NULL OR k.minPrice <= :dealPrice)" +
           " AND (k.maxPrice IS NULL OR k.maxPrice >= :dealPrice)" +
           " AND (k.category IS NULL OR k.category = '전체' OR k.category = :dealCategory)")
    List<KeywordSubscription> findMatchingSubscriptions(
        @Param("dealTitle") String dealTitle, 
        @Param("dealPrice") Integer dealPrice, 
        @Param("dealCategory") String dealCategory
);
    
}
