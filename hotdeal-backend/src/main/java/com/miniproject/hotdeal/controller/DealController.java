package com.miniproject.hotdeal.controller;

import java.util.List;
import java.util.Map;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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

    // React 메인 조회(최신 30개)
    @GetMapping
    public List<Deal> list(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "30") int size
    ) {
        return dealRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "postedAt").and(Sort.by(Sort.Direction.DESC, "scrappedAt")))
        ).getContent();
    }
}
