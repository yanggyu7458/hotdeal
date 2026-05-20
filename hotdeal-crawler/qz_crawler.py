from curl_cffi import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime

BACKEND_URL = "http://localhost:8080/api/deals/ingest"
#BACKEND_URL = "http://43.201.101.111:8080/api/deals/ingest"

# 1. 상세 페이지 정보 추출 함수 추가!
def fetch_quasarzone_detail(detail_url):
    try:
        resp = requests.get(detail_url, impersonate="chrome110")
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # [작성시간] span.date 추출 후 ISO 포맷으로 변환 (예: 2026.05.07 21:28)
        date_tag = soup.select_one('span.date')
        posted_at_iso = datetime.now().isoformat() + "+09:00" # 기본값(현재시간)
        if date_tag:
            date_str = date_tag.text.strip()
            try:
                # 2026.05.07 21:28 -> 2026-05-07T21:28:00+09:00
                dt_obj = datetime.strptime(date_str, "%Y.%m.%d %H:%M")
                posted_at_iso = dt_obj.strftime("%Y-%m-%dT%H:%M:00+09:00")
            except:
                pass
                
        # [쇼핑몰 링크] 테이블 내 a 태그의 텍스트가 실제 링크
        shop_url_tag = soup.select_one('table.market-info-view-table tr td a')
        shop_url = shop_url_tag.text.strip() if shop_url_tag else ""
        
        # 상세페이지의 테이블에서 '판매처'라는 글자가 있는 <th>를 찾고, 그 옆의 <td> 값을 가져옵니다.
        mall_name = ""
        th_tags = soup.select('table.market-info-view-table th')
        for th in th_tags:
            if "판매처" in th.text:
                td = th.find_next_sibling('td')
                if td:
                    mall_name = td.text.strip()
                break
            
        
        
        # [본문 내용] div#new_contents 안의 텍스트 추출 (엔터 유지)
        content_tag = soup.select_one('div#new_contents') or soup.select_one('div.view-content')
        content = content_tag.get_text(separator='\n', strip=True) if content_tag else ""
        
        # [댓글 수] span#comm_cnt
        comm_tag = soup.select_one('span#comm_cnt')
        comment_count = int(comm_tag.text.strip()) if comm_tag and comm_tag.text.strip().isdigit() else 0
        
        return {
            "shopUrl": shop_url,
            "mallName": mall_name,
            "content": content,
            "postedAt": posted_at_iso,
            "commentCount": comment_count
        }
    except Exception as e:
        print(f"상세 페이지 파싱 실패 ({detail_url}): {e}")
        return None


# 2. 목록 파싱 함수 (기존 로직 + 상세 정보 병합)
def fetch_quasarzone_list():
    url = "https://quasarzone.com/bbs/qb_saleinfo?page=1"
    print(f"🚀 퀘이사존 핫딜 크롤링 시작... ({url})")
    
    response = requests.get(url, impersonate="chrome110")
    response.raise_for_status()
    soup = BeautifulSoup(response.text, 'html.parser')
    
    deal_rows = soup.select('div.market-info-list')
    parsed_deals = []
    
    for row in deal_rows:
        try:
            status_tag = row.select_one('span.label')
            status_text = status_tag.text.strip() if status_tag else ""
            is_expired = True if status_text == "종료" else False
            
            title_tag = row.select_one('a.subject-link')
            if not title_tag: continue
                
            title = title_tag.text.strip()
            source_url = title_tag.get('href', '')
            if source_url.startswith('/'):
                source_url = "https://quasarzone.com" + source_url
                
            match = re.search(r'views/(\d+)', source_url)
            external_id = match.group(1) if match else None
            if not external_id: continue

            thumb_tag = row.select_one('a.thumb img')
            thumbnail_url = thumb_tag.get('src', '') if thumb_tag else ""

            category_tag = row.select_one('span.category')
            category = category_tag.text.strip() if category_tag else "기타"
            
            price_tag = row.select_one('span.text-orange')
            price_text = price_tag.text.strip() if price_tag else ""
            price_number = int(re.sub(r'[^0-9]', '', price_text)) if price_text else 0
            
            sub_spans = row.select('.market-info-sub p span')
            shipping_fee = ""
            for span in sub_spans:
                text = span.text.strip()
                if not text or text == "가격" or text == category or text == price_text: continue
                if "배송비" in text or "무배" in text:
                    shipping_fee = text


            # 여기서 상세 페이지(detail_url)로 한 번 더 접속해서 깊은 정보 가져오기
            print(f"  상세 정보 긁는 중: {title}")
            detail_info = fetch_quasarzone_detail(source_url)
            
            # 차단하지 않도록 상세페이지 요청 사이에 0.5초 정도 쉬어주기
            import time; time.sleep(0.5) 
            
            deal_data = {
                "source": "QUASARZONE",
                "externalId": external_id,
                "category": category,
                "title": title,
                "sourceUrl": source_url,
                "shopUrl": detail_info["shopUrl"] if detail_info else "",
                "thumbnailUrl": thumbnail_url,
                "price": price_number,
                "priceText": price_text,
                "shippingFee": shipping_fee,
                "upvotes": 0, # 퀘이사존 핫딜게시판엔 추천수 표시가 명확하지 않으므로 0
                "views": 0,   # 목록에 조회수가 없으므로 0 (또는 생략)
                "commentCount": detail_info["commentCount"] if detail_info else 0,
                "content": detail_info["content"] if detail_info else title,
                "isExpired": is_expired,
                "postedAt": detail_info["postedAt"] if detail_info else (datetime.now().isoformat() + "+09:00"),
                "scrapedAt": datetime.now().isoformat() + "+09:00"
            }
            
            parsed_deals.append(deal_data)
            
            if len(parsed_deals) >= 10:
                print("\n 10개 수집 제한에 도달하여 목록 탐색을 멈춥니다!")
                break

        except Exception as e:
            print(f"파싱 에러: {e}")
            
    return parsed_deals

def send_to_backend(deals):
    print(f"\n 백엔드({BACKEND_URL})로 {len(deals)}개 데이터 전송 시작...")
    import json
    headers = {'Content-Type': 'application/json'}
    
    try:
        # 실제 HTTP 전송
        response = requests.post(BACKEND_URL, data=json.dumps(deals).encode('utf-8'), headers=headers)
        response.raise_for_status()
        print(f" 백엔드 전송 완료! (상태 코드: {response.status_code})")
    except Exception as e:
        print(f" 전송 실패: {e}")

if __name__ == "__main__":
    deals = fetch_quasarzone_list()
    if deals:
        send_to_backend(deals)
        print("\n 모든 작업이 완료되었습니다!")