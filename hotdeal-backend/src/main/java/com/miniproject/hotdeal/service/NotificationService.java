package com.miniproject.hotdeal.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.text.DecimalFormat;

@Service
public class NotificationService {
    private final RestTemplate restTemplate = new RestTemplate();
    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

    public void sendPushNotification(List<String> tokens, String keyword, String dealTitle, Integer price) {
        if (tokens == null || tokens.isEmpty()) return;

        // 가격에 콤마 찍기 (예: 15000 -> 15,000원)
        String formattedPrice = "가격 확인";
        if (price != null && price > 0) {
            DecimalFormat df = new DecimalFormat("###,###");
            formattedPrice = df.format(price) + "원";
        }

        // Expo가 원하는 규격의 JSON 배열 구조 생성
        List<Map<String, Object>> bodyList = new ArrayList<>();
        
        for (String token : tokens) {
            Map<String, Object> message = new HashMap<>();
            message.put("to", token);
            
            // 푸시 알림 제목: 핫딜 게시글 제목
            message.put("title", "🔥 " + dealTitle);
            
            // 푸시 알림 본문: 가격 + 어떤 키워드로 알림이 왔는지 표시
            message.put("body", "가격 : " + formattedPrice + " (알림 키워드: " + keyword + ")");
            
            message.put("sound", "default"); // 알림음 설정
            
            bodyList.add(message);
        }

        // HTTP Header 설정
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<List<Map<String, Object>>> request = new HttpEntity<>(bodyList, headers);

        try {
            // Expo 푸시 서버로 전송!
            restTemplate.postForEntity(EXPO_PUSH_URL, request, String.class);
            System.out.println("푸시 알림 전송 완료! 대상 기기 수: " + tokens.size());
        } catch (Exception e) {
            System.err.println("푸시 알림 전송 중 에러 발생: " + e.getMessage());
        }
    }
}
