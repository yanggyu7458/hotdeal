# Spring Boot 백엔드

`hotdeal-backend`는 Spring Boot 4.0.2와 Java 17을 사용한다. Java 소스의 기본 패키지는 `com.miniproject.hotdeal`이다. Gradle 의존성에 Spring MVC, JPA, MySQL 드라이버, Redis가 선언되어 있다. [Gradle 설정](../hotdeal-backend/build.gradle)

## 컨트롤러

| API | 구현 | 요청과 응답 |
| --- | --- | --- |
| `POST /api/deals/ingest` | `DealController.ingest` | `DealUpsertRequest` 배열을 저장하고 `changed` 건수를 반환한다. |
| `GET /api/deals` | `DealController.list` | `page` 기본값 0, `size` 기본값 30으로 `id` 내림차순 목록을 반환한다. 선택한 `category`가 있으면 일치하는 딜을 조회한다. `전체`는 전체 목록을 조회한다. |
| `GET /api/deals/search?keyword=…` | `DealController.searchDeals` | 검색어 집계를 호출하고 제목에 검색어가 포함된 딜을 `postedAt` 내림차순으로 반환한다. |
| `GET /api/deals/popular-searches` | `DealController.getPopularSearches` | 인기 검색어를 최대 10개 반환한다. |
| `POST /api/keywords` | `KeywordController.registerKeyword` | 같은 기기와 키워드의 구독이 있으면 가격 범위와 카테고리를 갱신하고, 처음이면 구독을 저장한다. 성공 응답은 문자열이다. |

[DealController](../hotdeal-backend/src/main/java/com/miniproject/hotdeal/controller/DealController.java) · [KeywordController](../hotdeal-backend/src/main/java/com/miniproject/hotdeal/controller/KeywordController.java)

## 서비스와 저장소

- **딜 저장** — `DealService.upsertAll`이 트랜잭션에서 DTO를 `Deal`로 변환한다. `DealRepository.findBySourceAndExternalId`로 기존 행을 찾고, 기존 행에는 `Deal.updateFrom`을 적용한다. `changed`는 저장을 호출한 항목 수다. `DealRepository`는 카테고리 페이지 조회와 제목 검색도 담당한다. [DealService](../hotdeal-backend/src/main/java/com/miniproject/hotdeal/service/DealService.java) · [DealRepository](../hotdeal-backend/src/main/java/com/miniproject/hotdeal/repository/DealRepository.java)
- **검색 순위** — `SearchService`가 Redis 정렬 집합에서 조건에 맞는 검색어의 점수를 올리고 점수 내림차순으로 상위 10개를 읽는다. [SearchService](../hotdeal-backend/src/main/java/com/miniproject/hotdeal/service/SearchService.java)
- **키워드 알림** — 신규 딜은 `KeywordSubscriptionRepository.findMatchingSubscriptions`의 제목 포함, 가격 범위, 카테고리 조건을 거친다. `NotificationService`는 일치한 구독의 알림을 Expo 푸시 서비스로 전송한다. 이 호출은 딜 저장 트랜잭션 내부의 신규 딜 경로에서 시작한다. [구독 조회](../hotdeal-backend/src/main/java/com/miniproject/hotdeal/repository/KeywordSubscriptionRepository.java) · [NotificationService](../hotdeal-backend/src/main/java/com/miniproject/hotdeal/service/NotificationService.java)

## 스케줄러

`HotdealApplication`에 스케줄링이 활성화되어 있다. `CrawlerScheduler`에서 `runPpomppuCrawler`와 `runQzoneCrawler`는 직전 실행 종료 후 30분을 기다리는 `fixedDelay`를 사용한다. `runFMKoreaCrawler`의 예약 설정은 주석 처리되어 있다. 각 메서드는 `ProcessBuilder`로 Python을 실행하고 종료 코드를 기준으로 결과를 출력한다. [스케줄러 코드](../hotdeal-backend/src/main/java/com/miniproject/hotdeal/scheduler/CrawlerScheduler.java)

뽐뿌 실행은 Python 표준 출력과 표준 오류를 하나의 스트림으로 읽는다. 종료 코드 `0`은 실행 완료로 기록하며, 전송 성공과 0건 건너뜀은 Python 로그에서 구분한다. 종료 코드가 `0`이 아니면 스케줄러가 실패와 종료 코드를 표준 오류에 기록한다.
