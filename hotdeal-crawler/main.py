import re
import time
import random
from datetime import datetime, timezone, timedelta
import json

import requests
from curl_cffi import requests as cf_requests ## 우회 전용 모듈
from bs4 import BeautifulSoup

BACKEND_INGEST_URL = "http://localhost:8080/api/deals/ingest"
FMKOREA_GOTDEAL_URL = "https://www.fmkorea.com/hotdeal"
SOURCE = "FMKOREA"

KST = timezone(timedelta(hours=9))

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://www.fmkorea.com/",
}

session = cf_requests.Session(impersonate="chrome", headers=HEADERS)

'''
def pick_headers():
    # 너무 공격적이지 않게 User-Agent를 넣어줌
    return {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/122.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    }
'''

def extract_external_id(url: str) -> str | None:
    # 1) document_srl=xxxx 형태 찾기
    m = re.search(r"document_srl=(\d+)", url)
    if m:
        return m.group(1)
    # 2) /1234567890 형태 찾기 (에펨코리아 기본 주소 형태)
    m = re.search(r"/(\d{6,})", url)
    if m:
        return m.group(1)
    return None

def parse_list_page(html: str):
    """
    FMKorea 핫딜 리스트 페이지에서
    - title
    - url
    - externalId(document_srl)
    - commentCount(있으면)
    정도를 최대한 뽑는다.
    """
    soup = BeautifulSoup(html, "lxml")
    results = []
    
    # 목록에서는 기본 정보만 먼저 잡는다.
    links = soup.select('.title a, .hotdeal_var8 a')
    seen = set()
    
    for a in links:
        
        #  공지사항 필터링: 부모 태그에 'notice' 클래스가 있거나, 제목에 '[공지]'가 있으면 건너뜀
        if a.find_parent(class_="notice") or "[공지]" in a.get_text(strip=True):
            continue
        
        href = a.get("href", "").strip()
        title = a.get_text(strip=True)
        
        if not href or not title:
            continue
        
        # 핫딜 겟글 링크만 추려보기 (mid=hotdeal 포함이 가장 안전)
        if "mid=hotdeal" not in href:
             # 일부는 상대 링크가 document_srl만 갖고 mid를 안 가질 수도 있음
            pass
        
        # 절대 URL 보정
        if href.startswith("/"):
            url = "https://www.fmkorea.com" + href
        elif href.startswith("http"):
            url = href
        else:
            url = "https://www.fmkorea.com/" + href
            
        external_id = extract_external_id(url)
        if not external_id:
            continue
        
        # 중복 제거
        if external_id in seen:
            continue
        seen.add(external_id)
        
        # 댓글 수(대부분 제목 옆에 [n] 형태거나 별도 span)
        # 주변 텍스트에서 [숫자] 찾기
        comment_count = None
        m = re.search(r"\[(\d+)\]$", title)
        if m:
            comment_count = int(m.group(1))
            title = re.sub(r"\s*\[\d+\]$", "", title).strip()
            
        results.append({
            "source": SOURCE,
            "externalId": external_id,
            "category": None,           
            "title": title,
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
            "isExpired": False,         
            "postedAt": None,
            "scrapedAt": datetime.now(KST).isoformat(timespec="seconds") 
        })
        
    #  수집 개수 제한: 5개가 꽉 차면 즉시 크롤링 중단
        if len(results) >= 3:
            break
            
    return results

def fetch_detail_and_update(item: dict):
    """
    에펨코리아 상세 페이지 파싱 (캡처된 HTML 구조 완벽 반영)
    """
    url = item["sourceUrl"]
    resp = session.get(url, timeout=15)
    
    if resp.status_code != 200:
        print(f"  -> 상세 페이지 접근 실패! (상태 코드: {resp.status_code}) - {url}")
        return item
        
    soup = BeautifulSoup(resp.text, "lxml")
    
    # 1. 핫딜 정보 '표(Table)' 파싱 (table.hotdeal_table 명시적 타겟팅)
    for tr in soup.select('table.hotdeal_table tr'):
        th = tr.select_one('th')
        td = tr.select_one('td')
        
        if th and td:
            header = th.get_text(strip=True)
            value = td.get_text(strip=True)
            
            if header == '쇼핑몰':
                item["mallName"] = value
            elif header == '가격':
                item["priceText"] = value
                # "무료" 처리 완벽 반영
                if "무료" in value:
                    item["price"] = 0
                else:
                    nums = re.sub(r'[^0-9]', '', value)
                    if nums:
                        item["price"] = int(nums)
            elif header == '배송':
                item["shippingFee"] = value
            elif header == '링크':
                a_tag = td.select_one('a')
                if a_tag and a_tag.get('href'):
                    item["shopUrl"] = a_tag.get('href')
                else:
                    item["shopUrl"] = value

    # 2. 본문 & 썸네일 (표 안의 xe_content와 겹치지 않게 article 안쪽만 검색!)
    content_div = soup.select_one('article .xe_content')
    if content_div:
        item["content"] = content_div.get_text(separator='\n', strip=True)[:2000]
        
        # 썸네일 이미지 추출
        for img in content_div.select('img'):
            src = img.get('src', '')
            if src and 'fmkorea.com/m/img' not in src and 'sticker' not in src:
                if src.startswith('//'):
                    item["thumbnailUrl"] = "https:" + src
                elif src.startswith('/'):
                    item["thumbnailUrl"] = "https://www.fmkorea.com" + src
                else:
                    item["thumbnailUrl"] = src
                break

    # 3. 작성일, 조회수, 추천수 (div.rd_hd 헤더 영역 통째로 텍스트 검색)
    rd_hd = soup.select_one('div.rd_hd')
    if rd_hd:
        info_text = rd_hd.get_text(separator=' ')
        
        if not item.get("views"):
            v_match = re.search(r'조회\s*수\s*([0-9,]+)', info_text)
            if v_match:
                item["views"] = int(v_match.group(1).replace(',', ''))
                
        if not item.get("upvotes"):
            u_match = re.search(r'추천\s*수\s*([0-9,]+)', info_text)
            if u_match:
                item["upvotes"] = int(u_match.group(1).replace(',', ''))
        
        #  댓글 수 파싱 추가
        if not item.get("commentCount"):
            c_match = re.search(r'댓글\s*([0-9,]+)', info_text)
            if c_match:
                item["commentCount"] = int(c_match.group(1).replace(',', ''))
                
        if not item.get("postedAt"):
            # 2026.03.03 23:55 패턴 정확히 매칭
            date_match = re.search(r'(20[2-9][0-9]\.[0-1][0-9]\.[0-3][0-9]\s+[0-2][0-9]:[0-5][0-9])', info_text)
            if date_match:
                try:
                    dt = datetime.strptime(date_match.group(1), "%Y.%m.%d %H:%M")
                    dt = dt.replace(tzinfo=KST)
                    item["postedAt"] = dt.isoformat(timespec="seconds")
                except ValueError:
                    pass

    # 4. 카테고리
    category_span = soup.select_one('.category')
    if category_span:
        item["category"] = category_span.get_text(strip=True).replace('[', '').replace(']', '')

    # 5. 종료된 핫딜(isExpired) 여부 체크
    # 태그(.hotdeal_var8Y_msg)가 존재하면 True로 변경
    expired_msg = soup.select_one('.hotdeal_var8Y_msg')
    if expired_msg:
        item["isExpired"] = True
        
    return item

def fetch_hotdeal_list():
    # requests 대신 scraper 사용 -> 여전히 430 으로 막힘. curl_cffi 사용
    resp = session.get(FMKOREA_GOTDEAL_URL, timeout=15)
    
    if resp.status_code != 200:
        print(f"Error: {resp.status_code}")
        
    resp.raise_for_status()
    return parse_list_page(resp.text)

def ingest_to_backend(items):
    if not items:
        print("불러 올 항목이 없습니다.")
        return
    
    resp = requests.post(BACKEND_INGEST_URL, json=items, timeout=20)
    resp.raise_for_status()
    print("Ingest response: ", resp.status_code, resp.json())
    
def main():
    print("Fetching hotdeal list...")
    items = fetch_hotdeal_list()
    print(f"총 {len(items)}개의 핫딜 목록을 찾았습니다.")
    
    enriched_items = []
    
    print("상세 페이지로 접속하여 추가 정보를 긁어옵니다...")
    
    for idx, item in enumerate(items, 1):
        print(f"[{idx}/{len(items)}] 상세 정보 수집 중: {item['title'][:20]}...")
        try:
            enriched = fetch_detail_and_update(item)
            enriched_items.append(enriched)
        except Exception as e:
            print(f"  -> 수집 에러 발생: {e}")
            
        # 봇 탐지 및 IP 차단 방지를 위해 반드시 상세 페이지마다 1~2초 쉬어줍니다!
        time.sleep(random.uniform(2.0, 4.0))
        
    #print("\n=== 긁어온 데이터 확인 (여섯 번째 데이터) ===")
    #if enriched_items:
    #    print(json.dumps(enriched_items[0], ensure_ascii=False, indent=2))
    print("=======================================\n")
    
    print("백엔드로 데이터를 전송합니다...")
    ingest_to_backend(enriched_items)
    print("모든 작업이 완료되었습니다!")

if __name__ == "__main__":
    main()