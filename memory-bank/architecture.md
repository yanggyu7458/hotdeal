# 핫딜 프로젝트 아키텍처

현재 작업 트리의 코드에 근거한 구조다. 실제 배포 환경의 실행 상태와 DB 스키마는 별도로 검증해야 한다.

```text
FMKorea · 뽐뿌 · 퀘이사존
  → 사이트별 Python 크롤러
  → POST /api/deals/ingest
  → Spring Boot DealService → JPA → MySQL deal

React Native 홈·검색 → GET /api/deals 또는 GET /api/deals/search → MySQL deal
React Native 인기 검색어 → GET /api/deals/popular-searches → Redis
React Native 키워드 설정 → POST /api/keywords → MySQL keyword_subscription
신규 딜 → 구독 조건 매칭 → NotificationService → Expo 푸시 서비스
```

## 데이터 흐름

1. **수집과 실행** — `hotdeal-crawler`의 `main.py`, `ppomppu_crawler.py`, `qz_crawler.py`가 사이트별 목록과 상세를 파싱한다. 실행당 상한은 각각 4건, 5건, 10건이다. 백엔드 `CrawlerScheduler`는 뽐뿌와 퀘이사존 스크립트를 자식 프로세스로 실행한다. FMKorea 예약 실행은 소스에서 주석 처리되어 있다. [크롤러 설명](crawler.md) · [확인된 문서 차이](progress.md#기존-크롤러-문서의-오류)
2. **전송과 저장** — 크롤러는 딜을 JSON 배열로 전송한다. `DealController`가 `DealUpsertRequest` 목록으로 받고, `DealService.upsertAll`이 `(source, externalId)`로 기존 행을 조회한 뒤 저장한다. 작성 시각과 수집 시각은 DTO의 `OffsetDateTime` 필드다. [백엔드 구성](backend.md)
3. **조회와 검색** — 앱 홈은 카테고리와 페이지 조건으로 딜을 조회한다. 검색은 MySQL에서 제목을 조회하고 Redis 정렬 집합에 검색 횟수를 반영한다. 상세 화면은 홈 또는 검색 화면이 넘긴 딜 객체를 사용한다. [프런트엔드 구성](frontend.md)
4. **알림** — 앱에서 등록한 키워드·가격 범위·카테고리 조건을 구독에 저장한다. 신규 딜 저장 경로에서 구독을 조회하고, 일치하는 구독이 있으면 Expo 푸시 전송을 시도한다. [알림 구현](backend.md#서비스와-저장소)

크롤러의 수집 API 주소는 `localhost:8080`으로 고정되어 있다. 앱의 HTTP API 주소는 화면별로 직접 지정되어 있고, 스케줄러는 Linux 절대 경로로 Python을 실행한다. 환경을 바꿀 때 세 실행 지점의 주소와 경로를 각각 확인한다.
