package com.miniproject.hotdeal.controller;

import java.util.List;
import java.util.Map;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.miniproject.hotdeal.controller.dto.request.DealUpsertRequest;
import com.miniproject.hotdeal.domain.deal.Deal;
import com.miniproject.hotdeal.repository.DealRepository;
import com.miniproject.hotdeal.service.DealService;

import lombok.RequiredArgsConstructor;

@CrossOrigin("*")
@RequiredArgsConstructor
@RestController
@RequestMapping("/api/deals")
public class DealController {
    private final DealService dealService;
    private final DealRepository dealRepository;

    // 크롤러 -> 백엔드 저장
    @PostMapping("/ingest")
    public Map<String, Object> ingest(@RequestBody List<DealUpsertRequest> deals) {
        int changed = dealService.upsertAll(deals);
        return Map.of("changed", changed);
    }

    // React 메인 조회(최신 30개 + 카테고리 필터링)
    @GetMapping
    public List<Deal> list(
        @RequestParam(name = "page", defaultValue = "0") int page,
        @RequestParam(name = "size", defaultValue = "30") int size,
        @RequestParam(name = "category", required = false) String category // 카테고리 추가
    ) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));

        // 카테고리가 없거나 "전체"일 경우 모든 데이터 반환
        if (category == null || category.isEmpty() || category.equals("전체")) {
            return dealRepository.findAll(pageRequest).getContent();
        } 
        // 특정 카테고리가 있을 경우 해당 카테고리만 반환
        return dealRepository.findByCategory(category, pageRequest).getContent();
    }
}
