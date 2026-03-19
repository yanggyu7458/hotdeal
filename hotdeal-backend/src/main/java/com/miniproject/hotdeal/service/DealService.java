package com.miniproject.hotdeal.service;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

import com.miniproject.hotdeal.controller.dto.request.DealUpsertRequest;
import com.miniproject.hotdeal.domain.deal.Deal;
import com.miniproject.hotdeal.repository.DealRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Service
public class DealService {
    private final DealRepository dealRepository;

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
                    .sourceUrl(r.getSourceUrl())       // url -> sourceUrl로 변경됨
                    .shopUrl(r.getShopUrl())           
                    .thumbnailUrl(r.getThumbnailUrl()) 
                    .mallName(r.getMallName())         // mall -> mallName으로 변경됨
                    .price(r.getPrice())               
                    .priceText(r.getPriceText())
                    .shippingFee(r.getShippingFee())   // shippingText -> shippingFee로 변경됨
                    .upvotes(r.getUpvotes())           
                    .views(r.getViews())               
                    .commentCount(r.getCommentCount())
                    .isExpired(r.getIsExpired() != null ? r.getIsExpired() : false) // (기본값 false)
                    .postedAt(r.getPostedAt())
                    .scrapedAt(r.getScrapedAt() != null ? r.getScrapedAt() : OffsetDateTime.now()) // 변경됨
                    .build();

            Deal saved = dealRepository.findBySourceAndExternalId(r.getSource(), r.getExternalId())
                    .map(existing -> {
                        existing.updateFrom(incoming);
                        return existing;
                    })
                    .orElseGet(() -> incoming);
            
            dealRepository.save(saved);
            changed++;
        }
        return changed;
    }
}
