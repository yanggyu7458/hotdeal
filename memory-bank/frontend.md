# React Native 프런트엔드

`hotdeal-frontend`는 React Native 0.81과 Expo 54를 사용한다. Expo Router가 `app/` 파일을 화면 경로로 연결한다. 루트 레이아웃은 스택과 테마를 구성하고, `(tabs)` 레이아웃은 Home과 Explore 탭을 정의한다. [패키지 설정](../hotdeal-frontend/package.json) · [루트 레이아웃](../hotdeal-frontend/app/_layout.tsx) · [탭 레이아웃](<../hotdeal-frontend/app/(tabs)/_layout.tsx>)

## 화면과 API

| 화면 | 동작 | API |
| --- | --- | --- |
| [홈](<../hotdeal-frontend/app/(tabs)/index.tsx>) | 30개 단위 딜 목록, 카테고리 선택, 당겨서 새로고침, 무한 스크롤을 제공한다. | `GET /api/deals?page=…&size=30`과 선택적 `category` |
| [검색](../hotdeal-frontend/app/search.tsx) | 검색 결과와 인기 검색어를 표시하고 최근 검색어를 기기의 AsyncStorage에 저장한다. | `GET /api/deals/search?keyword=…`, `GET /api/deals/popular-searches` |
| [상세](../hotdeal-frontend/app/detail.tsx) | 홈 또는 검색이 `/detail`에 넘긴 `dealData`를 파싱해 제목, 가격, 배송비, 본문과 링크를 표시한다. | 상세 데이터 API 호출 없이 전달받은 객체를 사용한다. 원본과 쇼핑몰 링크는 기기에서 연다. |
| [키워드](../hotdeal-frontend/app/keyword.tsx) | Expo 푸시 권한을 확인하고 선택적 가격 범위와 카테고리를 포함해 구독을 등록한다. | `POST /api/keywords` |

홈 화면은 `생활/식품`을 `먹거리`로, `패션/의류`를 `의류/패션`으로 변환해 조회한다. 키워드 화면은 선택한 카테고리를 그대로 보낸다. 두 흐름의 값 불일치는 [진행 현황](progress.md#확인된-문제)에 기록했다.

홈의 알림 목록은 앱 안에 정의한 예시 데이터를 사용한다. 상세 화면의 댓글 영역은 자리표시자다. API 서버 주소는 홈, 검색, 키워드 화면의 호출 코드에 각각 지정되어 있다.
