package com.miniproject.hotdeal.domain.deal;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.*;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(
        name="deal",
        uniqueConstraints = {
            @UniqueConstraint(name = "uk_deal_source_external", columnNames = {"source", "extenalId"})
        },
        indexes = {
            @Index(name = "idx_deal_posted_at", columnList = "postedAt"),
            @Index(name = "idx_deal_category", columnList = "category"),
            @Index(name = "idx_deal_is_expired", columnList = "isExpired")
        }
)
public class Deal {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String source; // 사이트 이름, 출처 (예 : FMKOREA)

    @Column(nullable = false, length = 50)
    private String externalId; // 원본 사이트의 글 번호 document_srl

    @Column(length = 50)
    private String category; // 카테고리 (예 : PC, 먹거리, 의류 등)

    @Column(nullable = false, length = 300)
    private String title; //게시글 제목

    @Column(columnDefinition = "TEXT")
    private String content; // 본문 내용

    @Column(nullable = false, length = 500)
    private String sourceUrl; // 에펨코리아 해당 글 주소

    @Column(length = 1000)
    private String shopUrl; // 실제 물건을 파는 쇼핑몰 주소 (아웃링크)

    @Column(length = 500)
    private String thumbnailUrl; // 목록에 보여줄 대표 이미지 주소

    @Column(length = 120)
    private String mallName; // 쇼핑몰 이름 (예 : 쿠팡, 11번가, 알리)

    
    private Integer price; // 정렬 및 필터링을 위한 숫자형 가격
    
    @Column(length = 80)
    private String priceText; // 실제 크롤링한 원본 가격 텍스트 (예 : "약 34,000원")

    @Column(length = 80)
    private String shippingFee; // 배송비 정보 (예: "무료배송", "3,000원")

    private Integer upvotes; // 추천수 (인기 핫딜 판별용)

    private Integer views; // 조회수

    private Integer commentCount; // 댓글수

    @Column(nullable = false)
    @Builder.Default
    private Boolean isExpired = false; // 딜 종료 여부

    private OffsetDateTime postedAt; // 원본 글 작성 시각

    private OffsetDateTime scrapedAt; // 우리 서버가 크롤링 한 시각

    public void updateFrom(Deal other) {
        this.category = other.category;
        this.title = other.title;
        this.content = other.content;
        this.shopUrl = other.shopUrl;
        this.thumbnailUrl = other.thumbnailUrl;
        this.mallName = other.mallName;
        this.price = other.price;
        this.priceText = other.priceText;
        this.shippingFee = other.shippingFee;
        this.upvotes = other.upvotes;
        this.commentCount = other.commentCount;
        this.isExpired = other.isExpired;
        this.scrapedAt = other.scrapedAt;
        // source, externalId, sourceUrl, postedAt 은 보통 변하지 않으므로 제외
    }
}
