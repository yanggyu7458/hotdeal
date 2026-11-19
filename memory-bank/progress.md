# 구현 및 진행 현황

현재 작업 트리의 소스와 로컬 검증에서 확인한 내용이다. 운영 환경의 실행 결과, 배포 상태, 실제 DB 스키마는 별도 확인 대상이다.

## 구현된 기능

- Python 크롤러 3종의 목록·상세 파싱과 수집 API 전송. 뽐뿌·퀘이사존의 백엔드 예약 실행 코드.
- 뽐뿌의 HTTP 전송 실패는 0이 아닌 종료 코드와 스케줄러 실패 로그로 드러난다. 0건이면 POST를 건너뛰고 건너뜀 로그와 종료 코드 `0`을 남긴다. HTTP 200, HTTP 500, 연결 실패, 0건을 모의 테스트로 검증했다. [크롤러](../hotdeal-crawler/ppomppu_crawler.py) · [스케줄러](../hotdeal-backend/src/main/java/com/miniproject/hotdeal/scheduler/CrawlerScheduler.java)
- 딜 수집과 재수집 갱신, 페이지·카테고리 조회, 제목 검색, Redis 인기 검색어 집계.
- 앱의 홈·검색·상세·키워드 화면과 구독 등록, 신규 딜의 구독 매칭 및 Expo 푸시 전송 코드. 홈의 알림 목록과 상세의 댓글 영역은 예시 UI다.

## 확인된 문제

| 영역 | 코드에서 확인한 사항 |
| --- | --- |
| 시각과 타임아웃 | 퀘이사존은 서버 현지 시각에 `+09:00`을 붙여 작성일의 대체값과 수집 시각을 만든다. KST 이외 시간대에서는 값이 어긋날 수 있다. 상세 요청과 전송에는 호출별 타임아웃이 명시되어 있지 않다. [퀘이사존 코드](../hotdeal-crawler/qz_crawler.py) |
| 딜 저장 | `Deal` 고유 제약에 `extenalId` 오타가 있다. `updateFrom`은 조회수 갱신을 누락하고, 상세 파싱 실패로 비어 있는 값도 기존 값 위에 쓸 수 있다. 실제 DB 제약 상태는 확인 대상이다. [Deal 엔티티](../hotdeal-backend/src/main/java/com/miniproject/hotdeal/domain/deal/Deal.java) |
| 알림 카테고리 | 홈 화면은 일부 카테고리 값을 조회용으로 변환하지만 구독 화면은 선택값을 그대로 전송한다. 저장된 딜과 구독의 값이 다르면 해당 구독은 일치 조건을 통과하지 못한다. [키워드 화면](../hotdeal-frontend/app/keyword.tsx) · [구독 조회](../hotdeal-backend/src/main/java/com/miniproject/hotdeal/repository/KeywordSubscriptionRepository.java) |

## 기존 크롤러 문서의 오류

[crawler.md](crawler.md)의 아래 항목을 현재 Python 코드에 맞춰 정정했다. 코드 동작에 관한 미해결 사항은 [확인된 문제](#확인된-문제)에 기록되어 있다.

- **FMKorea** — `shippingFee`와 `upvotes`를 추가하고 조회수 중복을 정리했다. `externalId`의 두 추출 경로와 세션 저장 시점을 명시했다. [FMKorea 소스](../hotdeal-crawler/main.py)
- **뽐뿌** — 제목 길이·문자 필터, 배송비와 카테고리 추출, 목록과 상세의 종료 판정을 정리했다. [뽐뿌 소스](../hotdeal-crawler/ppomppu_crawler.py)
- **퀘이사존** — 상세 요청 전 1.5초와 함수 반환 후 0.5초의 대기, 목록과 상세의 필드 출처, 상세 실패 시 기본값, 시각 생성 방식과 명시적 타임아웃 범위를 정리했다. [퀘이사존 소스](../hotdeal-crawler/qz_crawler.py)
- **공통 설명** — JSON 전송 형식, 사이트별 실패 처리, URL 상수와 환경 변수의 차이, `%s`·`%d` 로깅 예제와 뽐뿌의 `print` 사용을 반영했다. [뽐뿌 전송](../hotdeal-crawler/ppomppu_crawler.py) · [퀘이사존 설정과 전송](../hotdeal-crawler/qz_crawler.py)

## 향후 작업

1. FMKorea와 퀘이사존의 0건 실행 로그를 점검하고, 퀘이사존 시각·타임아웃과 실행 환경별 주소·경로를 정리한다.
2. 재수집 시 조회수 갱신과 상세 파싱 실패 시 기존 값 보존을 검증한다. 고유 제약의 실제 상태를 확인하고 스키마 변경이 필요하면 사용자 승인을 받는다.
3. 목록 필터, 크롤러 저장 값, 구독 매칭이 같은 카테고리 값을 쓰도록 정리한다.
4. 저장된 HTML과 모의 HTTP 응답으로 파싱, 전송 실패, 재수집, 목록 조회, 알림 매칭을 검증한다. 관련 변경을 반영할 때 `memory-bank`를 갱신한다.
