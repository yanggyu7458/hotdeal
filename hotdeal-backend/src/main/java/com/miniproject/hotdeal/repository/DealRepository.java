package com.miniproject.hotdeal.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.miniproject.hotdeal.domain.deal.Deal;

public interface DealRepository extends JpaRepository<Deal, Long>{
    Optional<Deal> findBySourceAndExternalId(String source, String externalId);
    Page<Deal> findBySource(String source, Pageable pageable);
}
