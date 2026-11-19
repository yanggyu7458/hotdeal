package com.miniproject.hotdeal.service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.miniproject.hotdeal.controller.dto.request.DealUpsertRequest;
import com.miniproject.hotdeal.domain.deal.Deal;
import com.miniproject.hotdeal.domain.deal.KeywordSubscription;
import com.miniproject.hotdeal.repository.DealRepository;
import com.miniproject.hotdeal.repository.KeywordSubscriptionRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Service
public class DealService {
    private final DealRepository dealRepository;
    // 알림발송을 위해 추가
    private final KeywordSubscriptionRepository keywordSubscriptionRepository; 
    private final NotificationService notificationService;

    @Transactional
    public int upsertAll(List<DealUpsertRequest> requests) {
        int changed = 0;

        for (DealUpsertRequest r : requests) {
            Deal incoming = Deal.builder()
                    .source(r.getSource())
                    .externalId(r.getExternalId())
                    .category(r.getCategory())         
                    .title(r.getTitle())
                    .content(r.getContent())           
                    .sourceUrl(r.getSourceUrl())       
                    .shopUrl(r.getShopUrl())           
                    .thumbnailUrl(r.getThumbnailUrl()) 
                    .mallName(r.getMallName())         
                    .price(r.getPrice())               
                    .priceText(r.getPriceText())
                    .shippingFee(r.getShippingFee())   
                    .upvotes(r.getUpvotes())           
                    .views(r.getViews())               
                    .commentCount(r.getCommentCount())
                    .isExpired(r.getIsExpired() != null ? r.getIsExpired() : false)
                    .postedAt(r.getPostedAt())
                    .scrapedAt(r.getScrapedAt() != null ? r.getScrapedAt() : OffsetDateTime.now())
                    .build();
            // 1. 기존 데이터 조회 및 신규 여부(isNewDeal) 판별
            Deal existing = dealRepository.findBySourceAndExternalId(r.getSource(), r.getExternalId()).orElse(null);
            boolean isNewDeal = (existing == null);

            Deal saved;
            if (isNewDeal) {
                // 신규 데이터면 들어온 그대로 세팅
                saved = incoming;
            } else {
                // 기존 데이터면 필드만 업데이트
                existing.updateFrom(incoming);
                saved = existing;
            }
            
            dealRepository.save(saved);
            changed++;

            // 2. [핵심] 오직 '새로 등록된 핫딜'일 경우에만 키워드 알림 발송 검사!
            if (isNewDeal) {
                sendKeywordNotifications(saved);
            }
        }
        return changed;
    }

    // 알림 발송을 전담하는 내부(Private) 메서드
    private void sendKeywordNotifications(Deal deal) {

        int checkedPrice = deal.getPrice() != null ? deal.getPrice() : 0;
        String dealCategory = deal.getCategory() != null ? deal.getCategory() : "전체";
        // 제목으로 매칭되는 키워드 찾기
        List<KeywordSubscription> matches = keywordSubscriptionRepository.findMatchingSubscriptions(deal.getTitle(), checkedPrice, dealCategory);

        if (!matches.isEmpty()) {
            Map<String, List<String>> keywordGroup = new HashMap<>();
            for (KeywordSubscription sub : matches) {
                keywordGroup.computeIfAbsent(sub.getKeyword(), k -> new ArrayList<>()).add(sub.getExpoToken());
            }

            keywordGroup.forEach((keyword, tokens) -> {
                notificationService.sendPushNotification(tokens, keyword, deal.getTitle(), deal.getPrice());
            });
        }
    }
}
