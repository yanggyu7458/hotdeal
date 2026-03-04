package com.miniproject.hotdeal.controller.dto.request;

import java.time.OffsetDateTime;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class DealUpsertRequest {
    private String source;
    private String externalId;
    private String category;
    private String title;
    private String content;
    private String sourceUrl;
    private String shopUrl;
    private String thumbnailUrl;
    private String mallName;
    private Integer price;
    private String priceText;
    private String shippingFee;
    private Integer upvotes;
    private Integer views;
    private Integer commentCount;
    private Boolean isExpired;
    private OffsetDateTime postedAt;
    private OffsetDateTime scrapedAt;
}