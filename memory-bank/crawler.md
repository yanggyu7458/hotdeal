# Hotdeal Project - Python Crawler Documentation

## 개요

Hotdeal 프로젝트에는 3 개의 Python 크롤러가 있습니다. 각 크롤러는 서로 다른 외부 사이트 (FMKorea, 뽐뿌, 퀘이사존) 의 핫딜 정보를 수집하여 백엔드 API 로 전송합니다.

---

## 1. FMKorea 크롤러 (`hotdeal-crawler/main.py`)

### 역할
FMKorea 핫딜 게시판에서 핫딜 정보를 수집하는 크롤러입니다.

### 주요 함수

| 함수명 | 설명 |
|--------|------|
| `create_session()` | 브라우저 프로필을 무작위로 선택해 `curl_cffi` 세션을 생성하고 저장된 쿠키가 있으면 불러옵니다. |
| `save_cookies(session)` | 세션에 쿠키가 있으면 `fm_cookies.json`에 저장합니다. |
| `extract_external_id(url)` | URL 에서 `document_srl` 또는 숫자 ID 를 추출합니다. |
| `parse_list_page(html)` | 공지와 중복 글을 제외하고 `title`, `sourceUrl`, `externalId`, `commentCount`를 추출합니다. |
| `fetch_detail_and_update(item)` | 상세 페이지에서 가격, 배송비, 쇼핑몰, 조회수, 추천수 등을 수집해 항목을 갱신합니다. |
| `fetch_hotdeal_list()` | 목록 페이지 요청 및 파싱을 수행하여 리스트를 반환합니다. |
| `ingest_to_backend(items)` | 수집된 데이터를 백엔드 API(`http://localhost:8080/api/deals/ingest`) 로 POST 합니다. |
| `main()` | 전체 크롤링 워크플로우를 실행합니다. |

### 데이터 수집 흐름

```
1. 모듈 로드 시 create_session() → 전역 세션 생성 및 쿠키 로드
   ↓
2. fetch_hotdeal_list()
   - https://www.fmkorea.com/hotdeal 에서 목록 요청
   - parse_list_page() 로 4 개까지의 항목 수집
   ↓
3. 상세 정보 수집 (반복)
   - 각 항목에 대해 fetch_detail_and_update() 호출
   - 상세 페이지 요청 (curl_cffi 사용)
   - 가격, 배송비, 쇼핑몰, 카테고리, 조회수, 추천수 등 추가 정보 수집
   - HTTP 200 이외 응답은 목록 데이터 그대로 유지하고, 상세 처리 중 예외가 발생한 항목은 전송 목록에서 제외
   - 2.0~4.0 초 간격으로 대기 (rate limiting)
   ↓
4. ingest_to_backend()
   - 백엔드 API 로 JSON 포맷으로 전송
   ↓
5. save_cookies(session)
   - 전송 단계가 예외 없이 반환되면 호출하며, 세션에 쿠키가 있으면 파일에 저장
```

### 파싱한 데이터 필드

- `source`: "FMKOREA"
- `externalId`: URL의 `document_srl` 값 또는 경로의 6자리 이상 숫자 ID
- `title`: 핫딜 제목 (댓글 수 제거)
- `price`: 가격 (숫자)
- `priceText`: 가격 문자열 ("₩10,000" 등)
- `shippingFee`: 상세 표의 배송비 문자열
- `mallName`: 쇼핑몰 이름
- `category`: 카테고리
- `commentCount`: 댓글 수
- `isExpired`: 종료 여부
- `postedAt`: 작성일 (KST timezone)
- `sourceUrl`: 원본 URL
- `shopUrl`: 쇼핑몰 링크
- `thumbnailUrl`: 썸네일 URL
- `views`: 조회수
- `upvotes`: 추천수
- `content`: 본문 내용
- `scrapedAt`: 크롤링 시각

---

## 2. 뽐뿌 크롤러 (`hotdeal-crawler/ppomppu_crawler.py`)

### 역할
뽐뿌 (`ppomppu.co.kr`) 핫딜 게시판에서 핫딜 정보를 수집하는 크롤러입니다.

### 주요 함수

| 함수명 | 설명 |
|--------|------|
| `parse_list_page(html)` | 링크와 제목 조건을 충족하는 항목을 목록 순서대로 최대 5개 수집합니다. 글번호로 중복을 제외합니다. |
| `fetch_detail_and_update(item)` | 상세 페이지에서 제목을 보정하고 가격, 배송비, 쇼핑몰, 썸네일, 조회수, 추천수, 본문과 종료 여부를 수집합니다. |
| `fetch_hotdeal_list()` | 뽐뿌 목록 페이지 요청 (`euc-kr` 인코딩 처리) 및 파싱을 수행합니다. |
| `ingest_to_backend(items)` | 수집된 데이터를 백엔드 API로 POST합니다. 빈 목록은 전송을 건너뛰고, HTTP 오류나 연결 실패는 로깅한 뒤 예외를 다시 던집니다. |
| `main()` | 전체 크롤링 워크플로우를 실행합니다. |

### 데이터 수집 흐름

```
1. fetch_hotdeal_list()
   - https://www.ppomppu.co.kr/zboard/zboard.php?id=ppomppu 에서 목록 요청
   - 목록 응답 바이트를 euc-kr로 디코딩
   - parse_list_page() 로 5 개까지의 항목 수집 (중복 필터링)
   - 필터링 조건:
     * 'id=ppomppu' 와 'no=' 포함
     * 'cno=' (댓글) 와 '#v_reply' 제외
     * 제목이 5글자 이상이며 '[' 포함
   ↓
2. 상세 정보 수집 (반복)
   - 각 항목에 대해 fetch_detail_and_update() 호출
   - 상세 페이지 요청 (curl_cffi 사용, HTTP 200 응답은 euc-kr로 디코딩)
   - 추가 정보 수집 (가격, 배송비, 쇼핑몰, 썸네일, 조회수, 추천수 등)
   - HTTP 200 이외 응답은 목록 데이터 그대로 유지하고, 상세 처리 중 예외가 발생한 항목은 전송 목록에서 제외
   - 2.0~4.0 초 간격으로 대기
   ↓
3. ingest_to_backend()
   - 백엔드 API 로 JSON 포맷으로 전송
   - 전송할 항목이 0건이면 POST를 생략하고 건너뜀 로그를 남긴 뒤 종료 코드 0으로 완료
   - HTTP 오류나 연결 실패가 발생하면 실패 로그를 남기고 0이 아닌 종료 코드로 종료
   ↓
4. 쿠키 저장 없음 (글로벌 세션 사용)
```

### 파싱한 데이터 필드

- `source`: "PPOMPPU"
- `externalId`: 글번호 (no=xxxxx)
- `title`: 핫딜 제목
- `price`: 가격 (숫자)
- `priceText`: 가격 문자열
- `shippingFee`: 제목의 `(가격/배송비)` 부분에서 추출한 배송비 문자열
- `mallName`: 쇼핑몰 이름
- `category`: 카테고리 태그가 없으면 `국내핫딜`, 태그 값이 매핑에 없으면 `기타`
- `commentCount`: 댓글 수
- `isExpired`: 목록의 `end_icon` 이미지 또는 `end2` 링크 클래스, 상세의 `종료된 게시물입니다.` 문구로 판정
- `postedAt`: 등록일 (ISO 8601 포맷)
- `sourceUrl`: 원본 URL
- `shopUrl`: 쇼핑몰 링크
- `thumbnailUrl`: 썸네일 URL
- `views`: 조회수
- `upvotes`: 추천수
- `content`: 본문 내용
- `scrapedAt`: 크롤링 시각


---

## 3. 퀘이사존 크롤러 (`hotdeal-crawler/qz_crawler.py`)

### 역할
퀘이사존 (`quasarzone.com`) 쇼핑정보 게시판에서 핫딜 정보를 수집하는 크롤러입니다.

### 주요 함수

| 함수명 | 설명 |
|--------|------|
| `fetch_quasarzone_list()` | 목록에서 제목, 카테고리, 가격, 배송비 등을 추출하고 상세 정보를 병합해 최대 10개를 수집합니다. |
| `fetch_quasarzone_detail(detail_url)` | 작성 시각, 쇼핑몰 링크, 판매처, 본문과 댓글 수를 수집합니다. 예외가 발생하면 로그를 남기고 `None`을 반환합니다. |
| `send_to_backend(deals)` | 수집된 데이터를 백엔드 API로 POST합니다. 호출에 타임아웃을 명시하지 않습니다. |
| `main()` | 전체 크롤링 워크플로우를 실행합니다. |

### 데이터 수집 흐름

```
1. fetch_quasarzone_list()
   - QUASARZONE_URL로 목록 요청 (기본값 https://quasarzone.com/bbs/qb_saleinfo?page=1, 타임아웃 15초)
   - 목록 정보 수집 (제목, 카테고리, 가격, 배송비)
   - 각 상세 요청 전 1.5초, 상세 함수 반환 후 0.5초 대기 (상세 요청에 명시적 타임아웃 없음)
   - 상세 정보 병합 (작성 시각, 쇼핑몰 링크, 판매처, 본문, 댓글 수)
   - 상세 함수가 None을 반환하면 목록 정보와 기본값으로 해당 항목을 포함
   ↓
2. send_to_backend()
   - 백엔드 API 로 JSON 포맷으로 전송
```

### 파싱한 데이터 필드

- `source`: "QUASARZONE"
- `externalId`: URL 의 `views/(숫자)` 패턴으로 추출한 글번호
- `title`: 목록의 게시글 제목
- `price`: 가격 문자열에서 숫자를 추출한 값. 가격 문자열이 비어 있으면 `0`, 문자열에 숫자가 없으면 해당 행의 파싱 오류를 로깅하고 건너뜁니다.
- `priceText`: 가격 문자열
- `shippingFee`: 배송비
- `mallName`: 쇼핑몰 이름 (판매처)
- `category`: 카테고리
- `commentCount`: 댓글 수
- `isExpired`: 종료 여부 (span.label 이 '종료' 인 경우 체크)
- `postedAt`: 상세 작성 시각에 `+09:00`을 지정합니다. 작성 시각을 얻지 못하면 실행 환경의 현지 시각에 `+09:00`을 붙입니다.
- `sourceUrl`: 목록 링크에서 얻은 원본 게시글 URL
- `shopUrl`: 쇼핑몰 링크
- `thumbnailUrl`: 썸네일 URL (`a.thumb img` 에서 추출)
- `content`: 본문 내용
- `scrapedAt`: 실행 환경의 현지 시각에 `+09:00`을 붙인 수집 시각. 환경이 KST가 아니면 `postedAt` 대체값과 함께 실제 시각과 어긋날 수 있습니다.
- `upvotes`: 0 (퀘이사존은 명확한 추천수 표시 없음)
- `views`: 0 (목록에 조회수 없음)

---

## 공통 로깅 구조 (`hotdeal-crawler/common/logger.py`)

### 로깅 설정

```python
def get_logger(name: str) -> logging.Logger:
    # 기본 설정
    logger.setLevel(logging.INFO)  # 기본 레벨: INFO 이상만 출력
    logger.propagate = False  # 상위 로거로 전파 방지
    
    # 로그 파일 경로: /home/jwon/server/logs/crawler/{name}_{YYYY-MM-DD}.log
    # 핸들러: FileHandler (로그 파일) + StreamHandler (콘솔)
    # 포맷: %(asctime)s - %(levelname)s - %(message)s
```

### 로그 레벨

- `INFO`: 일반적인 작업 진행 상황
- `DEBUG`: 디버깅을 위한 상세 정보. 기본 `INFO` 설정에서는 출력되지 않습니다.
- `WARNING`: 경고 메시지
- `ERROR`: 오류 메시지

### 로깅 패턴 (FMKorea 예시)

```python
# 목록 요청
logger.info("FMKorea 목록 요청 시작. url=%s", FMKOREA_GOTDEAL_URL)
logger.info("목록 수집 완료. item_count=%d", len(items))
logger.error("FMKorea 목록 요청 실패. status_code=%s", resp.status_code)

# 상세 정보 수집
logger.info("[%d/%d] 상세 정보 수집 중. title=%s", idx, len(items), item["title"][:40])

# 백엔드 전송
logger.info("백엔드 전송 시작. url=%s, item_count=%d", BACKEND_INGEST_URL, len(items))
logger.info("백엔드 전송 성공. status_code=%s, response=%s", resp.status_code, body)
logger.error("백엔드 전송 실패. item_count=%d", len(items), exc_info=True)

# 완료
logger.info("=== FMKorea 핫딜 크롤링 완료. sent_count=%d ===", len(enriched_items))
```

뽐뿌는 상세 수집 진행 상황과 백엔드 전송 성공을 `print`로 출력합니다. 전송 건너뜀과 전송 실패는 공통 로거에 각각 경고와 오류로 기록합니다.

---

## 백엔드 API 전송

### 공통 엔드포인트

```
http://localhost:8080/api/deals/ingest
```

### 전송 방법

- **HTTP Method**: POST
- **Content-Type**: 세 크롤러 모두 `application/json`
- **Body**: JSON 배열. FMKorea·뽐뿌는 `json=` 인자로 전달하고, 퀘이사존은 직접 직렬화한 UTF-8 바이트를 `data=` 인자로 전달합니다.
- **타임아웃**: FMKorea·뽐뿌는 20초. 퀘이사존은 전송 호출에 타임아웃을 명시하지 않습니다.

### 전송 결과 처리

- 전송할 항목이 없으면 세 크롤러 모두 경고를 남기고 POST를 생략합니다.
- POST 후 `raise_for_status()`가 예외 없이 반환되면 성공 로그 또는 메시지를 남깁니다.
- FMKorea와 퀘이사존은 전송 예외를 로깅한 뒤 다시 던집니다. 뽐뿌도 HTTP·연결 오류를 로깅한 뒤 다시 던지므로 전송 실패 시 완료 메시지 없이 비정상 종료합니다.

---

## 의존성 및 설정

### 주요 라이브러리

- `requests`: FMKorea와 뽐뿌의 백엔드 전송
- `curl_cffi`: 세 사이트의 목록·상세 HTTP 요청과 퀘이사존의 백엔드 전송
- `bs4` (BeautifulSoup): HTML 파싱
- `lxml`: FMKorea·뽐뿌의 BeautifulSoup 파서. 퀘이사존은 `html.parser`를 사용합니다.

### 환경 설정

- **BACKEND_INGEST_URL / BACKEND_URL**: FMKorea·뽐뿌는 `BACKEND_INGEST_URL`, 퀘이사존은 `BACKEND_URL` 상수를 사용합니다. 세 스크립트 모두 백엔드 주소를 코드에 `http://localhost:8080/api/deals/ingest`로 지정합니다.
- **FMKOREA_GOTDEAL_URL**: FMKorea 핫딜 URL
- **PPOMPPU_GOTDEAL_URL**: 뽐뿌 핫딜 URL
- **QUASARZONE_URL**: URL 설정 중 환경 변수에서 읽는 항목입니다. 미설정 시 코드의 퀘이사존 목록 URL을 사용합니다.
- **COOKIE_FILE**: FMKorea 실행 작업 디렉터리 기준의 상대 경로 (`fm_cookies.json`)
- **SOURCE**: FMKorea·뽐뿌는 `SOURCE` 상수를 사용하고 퀘이사존은 `source` 필드에 `QUASARZONE`을 직접 지정합니다.

### HTTP 요청과 대기

- FMKorea와 뽐뿌는 고정된 User-Agent 헤더를 지정합니다. 크롤러 세 곳 모두 `curl_cffi` 요청에 브라우저 프로필을 지정합니다.
- FMKorea와 뽐뿌는 상세 처리 후 2.0~4.0초를 무작위로 대기합니다. 퀘이사존은 상세 요청 전 1.5초, 상세 함수 반환 후 0.5초를 고정 대기합니다.
- 파일에 세션 쿠키를 저장하고 재사용하는 스크립트는 FMKorea입니다.

---

## 실행 방법

`hotdeal-crawler` 디렉터리에서 각 스크립트를 독립적으로 실행할 수 있습니다.

```bash
# FMKorea 크롤러
python main.py

# 뽐뿌 크롤러
python ppomppu_crawler.py

# 퀘이사존 크롤러
python qz_crawler.py
```

---

## 요약

| 크롤러 | 파일 | 사이트 | 수집 항목 수 | 제한 | 주요 특징 |
|--------|------|--------|-------------|------|----------|
| FMKorea | `main.py` | fmkorea.com | 4 개 | 쿠키 저장, 임포스테이션 | 에펨코리아 기반 |
| 뽐뿌 | `ppomppu_crawler.py` | ppomppu.co.kr | 5 개 | euc-kr 디코딩, 추천수 수집 | 제목에 `[`가 포함되어야 함 |
| 퀘이사존 | `qz_crawler.py` | quasarzone.com | 10 개 | 상세 요청 실패 시 기본값 사용 | 목록에서 배송비 수집, 상세에서 원본 텍스트 영역 우선 추출 |
