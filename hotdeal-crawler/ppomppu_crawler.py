import re
import time
import random 
from datetime import datetime, timezone, timedelta
import json

from curl_cffi import requests as cf_requests
from bs4 import BeautifulSoup

BACKEND_INGEST_URL = "http://localhost:8080/api/deals/ingest"
PPOMPPU_GOTDEAL_URL = "https://www.ppomppu.co.kr/zboard/zboard.php?id=ppomppu"
SOURCE = "PPOMPPU"

KST = timezone(timedelta(hours=9))

# 뽐뿌 봇 차단 우회용 글로벌 세션 및 헤더 (에펨코리아와 동일한 최신 위장막)
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://www.ppomppu.co.kr/",
}
session = cf_requests.Session(impersonate="chrome120", headers=HEADERS)

def parse_list_page(html: str):
    """
    뽐뿌 목록 페이지 파싱
    - 공지사항 제외하고 최신 핫딜 5개의 기본정보 1차 수집
    """
    soup = BeautifulSoup(html, "lxml")
    results = []
    
    #  tr, td 다 무시하고 페이지 내의 "모든 링크(a 태그)"를 다 가져오기
    a_tags = soup.find_all('a')
    print(f"  -> [debug] 페이지에서 총 {len(a_tags)}개의 링크(a 태그)를 발견했습니다.")
    
    seen_ids = set() # 중복 수집 방지용
    
    for a in a_tags:
        href = a.get('href', '')
        
        # 핫딜 게시물 링크의 필수 조건 2가지 ('id=ppomppu' 와 'no=글번호')
        if 'id=ppomppu' not in href or 'no=' not in href:
            continue
            
        # 코멘트(댓글) 링크는 제외합니다.
        if 'cno=' in href or '#v_reply' in href:
            continue
            
        # 글 번호(no=12345) 추출
        match = re.search(r'no=(\d+)', href)
        if not match:
            continue
            
        external_id = match.group(1)
        
        # 뽐뿌는 썸네일과 제목에 링크가 각각 걸려있어서 같은 글이 두 번 잡힙니다. (중복 방지)
        if external_id in seen_ids:
            continue
            
        # 제목 추출 (태그 안의 텍스트 긁어오기)
        raw_title = a.get_text(strip=True)
        
        # 진짜 핫딜 필터링 
        # (핫딜 제목은 "[11번가] 상품명..." 처럼 무조건 대괄호 '[' 가 들어가는 규칙을 이용)
        if not raw_title or len(raw_title) < 5 or '[' not in raw_title:
            continue
            
        seen_ids.add(external_id)
        
        category = "국내핫딜"
        comment_count = 0
        
        # 종료 여부 기본값 설정
        is_expired = False
        
        parent_td = a.find_parent('td')
        
        if parent_td:
            # 댓글 수 추출
            cmt_span = parent_td.select_one('.list_comment2')
            if cmt_span:
                cmt_text = re.sub(r'[^0-9]', '', cmt_span.get_text())
                if cmt_text:
                    comment_count = int(cmt_text)
            
            # 카테고리 추출 (baseList-small 태그)
            cat_tag = parent_td.select_one('small.baseList-small')
            if not cat_tag:
                # 혹시나 클래스명이 없는 경우를 대비한 백업 플랜
                cat_tag = parent_td.select_one('small') 
                
            if cat_tag:
                cat_text = cat_tag.get_text(strip=True)
                # "[식품/건강]" 형식에서 보기 좋게 괄호만 싹 제거 -> "식품/건강"
                cleaned_category = cat_text.replace('[', '').replace(']', '').strip()
                
                # 뽐뿌 카테고리를 DB 통합 카테고리로 변경
                category_mapping = {
                    "컴퓨터": "PC/하드웨어",
                    "디지털": "PC/하드웨어",   # 스마트폰/주변기기 등도 이쪽으로 통합
                    "식품/건강": "먹거리",
                    "가전/가구": "가전/TV",
                    "의류/잡화": "의류/패션",
                    "기타": "기타"
                }
                
                # DB에 있는 카테고리면 번역해서 넣고, 모르는 거면 '기타'로 뺌
                if cleaned_category in category_mapping:
                    category = category_mapping[cleaned_category]
                else:
                    category = "기타"
                    
            if parent_td.select_one('img[src*="end_icon"]'):
                is_expired = True
        
        # 제목 a 태그의 클래스에 'end2'가 포함되어 있는지 확인    
        a_classes = a.get('class', [])
        if a_classes and 'end2' in a_classes:
            is_expired = True
            
        
        # URL 조립
        if href.startswith('http'):
            url = href
        elif href.startswith('/'):
            url = "https://www.ppomppu.co.kr" + href
        else:
            url = "https://www.ppomppu.co.kr/zboard/" + href
        
        results.append({
            "source": SOURCE,
            "externalId": external_id,
            "category": category, 
            "title": raw_title,
            "content": None,
            "sourceUrl": url,
            "shopUrl": None,
            "thumbnailUrl": None,
            "mallName": None,
            "price": None,
            "priceText": None,
            "shippingFee": None,
            "upvotes": None,
            "views": None,
            "commentCount": comment_count, 
            "isExpired": is_expired,
            "postedAt": None,
            "scrapedAt": datetime.now(KST).isoformat(timespec="seconds") 
        })
        
        # 우선 5개만 수집
        if len(results) >= 5:
            break
        
    return results

def fetch_detail_and_update(item: dict):
    """
        상세 페이지 파싱 (EUC-KR 디코딩 및 정규식 활용)
    """
    url = item["sourceUrl"]
    resp = session.get(url, timeout=15)
    
    if resp.status_code != 200:
        print(f" -> 상세 페이지 접근 실패. (상세코드 : {resp.status_code})")
        return item

    # 뽐뿌는 ECU-KR 인코딩을 사용, 한글 깨짐 방지를 위해 강제 변환!
    html = resp.content.decode('euc-kr', 'replace')
    soup = BeautifulSoup(html, "lxml")
    
    
    # 제목에서 정규식으로 [쇼핑몰], 제목, (가격/배송비) 분리하기
    # ex: [11번가] 제목..(가격/배송비)
    full_title = item["title"]
    title_div = soup.select_one('.topTitle h1')
    if title_div:
        # 쌍따옴표 등 제거
        full_title = title_div.get_text(strip=True).replace('"', '').replace("'", "")
        
    match = re.search(r'\[(.*?)\]\s*(.*?)\s*\((.*?)/(.*?)\)', full_title)
    
    if match:
        item["mallName"] = match.group(1).strip()
        item["title"] = match.group(2).strip()
        item["priceText"] = match.group(3).strip()
        item["shippingFee"] = match.group(4).strip()
        
        # 가격 텍스트에서 숫자만 추출하여 int 형으로 저장
        price_blocks = re.findall(r'[\d,]+', item["priceText"])
        
        if price_blocks:
            # 2. 리스트의 맨 마지막 덩어리([-1])가 진짜 가격입니다! (쉼표는 제거)
            real_price_str = price_blocks[-1].replace(',', '')
            if real_price_str.isdigit():
                item["price"] = int(real_price_str)
        elif "무료" in item["priceText"] or "0원" in item["priceText"] or "공짜" in item["priceText"]:
            item["price"] = 0
    else:
        # 괄호(가격)가 없는 핫딜일 경우, 최소한 쇼핑몰 이름이라도 뽑아냄
        match_mall = re.search(r'\[(.*?)\]\s*(.*)', full_title)
        if match_mall:
            item["mallName"] = match_mall.group(1).strip()
            item["title"] = match_mall.group(2).strip()
                
    # [원본 쇼핑몰 링크 (shopUrl)]
    # li.topTitle-link 안에 있는 a 태그
    link_tag = soup.select_one('li.topTitle-link a')
    
    # 혹시나 예전 뽐뿌 글 구조로 되어있을 경우를 대비한 백업
    if not link_tag:
        link_tag = soup.select_one('div.word_break a')
        
    if link_tag and link_tag.get('href'):
        item["shopUrl"] = link_tag.get('href')
        
    # [조회수 & 등록일]
    info_text = soup.get_text()
    posted_match = re.search(r'등록일\s*(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2})', info_text)
    if posted_match:
        # DB 포맷(ISO 8601)에 맞게 변환
        item["postedAt"] = posted_match.group(1).replace(' ', 'T') + ":00+09:00"
        
    view_match = re.search(r'조회수\s*([0-9,]+)', info_text)
    if view_match:
        item["views"] = int(view_match.group(1).replace(',', ''))
    
    # 본문 내용
    board_contents = soup.select_one('td.board-contents')
    if board_contents:
        item["content"] = board_contents.get_text(separator='\n', strip=True)
        
        # 썸네일 이미지
        img_tag = board_contents.select_one('img')
        if img_tag and img_tag.get('src'):
            src = img_tag.get('src')
            item["thumbnailUrl"] = src if src.startswith('http') else "https:" + src
            
    # 추천수
    upvote_span = soup.select_one('#vote_list_btn_txt')
    if upvote_span:
        item["upvotes"] = int(upvote_span.get_text(strip=True))
        
    # 종료된 핫딜 체크
    if soup.find(string=re.compile("종료된 게시물입니다.")):
        item["isExpired"] = True
        
    return item

def fetch_hotdeal_list():
    resp = session.get(PPOMPPU_GOTDEAL_URL, timeout=15)
    resp.raise_for_status()
    
    html = resp.content.decode('euc-kr', 'replace')
    
    # 페이지가 정상적으로 불러와졌는지 HTML 길이로 먼저 확인
    print(f"  -> [debug] 가져온 HTML 전체 길이: {len(html)} 글자")
    
    return parse_list_page(html)

def ingest_to_backend(items):
    if not items:
        return
    
    import requests
    try:
        resp = requests.post(BACKEND_INGEST_URL, json=items, timeout=20)
        resp.raise_for_status()
        print("[백엔드 전송 성공]", resp.status_code)
        
    except Exception as e:
        print("[백엔드 전송 실패] : ", e)
        
def main():
    print("=== 뽐뿌 핫딜 크롤링 시작 ===")
    items = fetch_hotdeal_list()
    print(f"목록에서 {len(items)}개의 최신 핫딜을 찾았습니다.")
    
    enriched_items = []
    
    for idx, item in enumerate(items, 1):
        print(f"[{idx}/{len(items)}] 상세 정보 수집 중: {item['title'][:20]}...")
        try:
            enriched = fetch_detail_and_update(item)
            enriched_items.append(enriched)
        except Exception as e:
            print(f"  -> 수집 에러 발생: {e}")
            
        # 봇 탐지 방지를 위한 필수 휴식 시간
        time.sleep(random.uniform(2.0, 4.0))
    
    if enriched_items:
        print("\n=== 데이터 수집 결과 샘플 ===")
        print(json.dumps(enriched_items[0], ensure_ascii=False, indent=2))
        
    print("백엔드로 데이터를 전송합니다...")
    ingest_to_backend(enriched_items)
    print("모든 작업이 완료되었습니다!")

if __name__ == "__main__":
    main()