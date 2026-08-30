
"""Deprecated: use the official XLSX importer in scripts/import-kbo-roster.mjs."""

raise SystemExit(
    "이 크롤러는 더 이상 사용하지 않습니다. "
    "npm run data:import 명령을 사용하세요."
)

import json
import re
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import time

def get_player_links(driver):
    """현재 페이지에 있는 모든 선수의 상세 페이지 링크를 수집합니다."""
    links = []
    try:
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        rows = soup.select('table.tEx tbody tr')
        for row in rows:
            link_tag = row.select_one('td a')
            if link_tag and link_tag.has_attr('href'):
                links.append(link_tag['href'])
    except Exception as e:
        print(f"- 링크 수집 중 오류: {e}")
    return links

def get_player_details(driver, url_path):
    """선수 상세 페이지로 이동하여 상세 정보를 수집하고 변환합니다."""
    base_url = "https://www.koreabaseball.com"
    full_url = f"{base_url}{url_path}"
    driver.get(full_url)
    
    try:
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "div.player_basic"))
        )
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        
        player_info_div = soup.find('div', class_='player_info')
        if not player_info_div: return None

        info_dict = {}
        player_basic_div = player_info_div.find('div', class_='player_basic')
        if player_basic_div:
            info_ul = player_basic_div.find('ul')
            if info_ul:
                for li in info_ul.find_all('li'):
                    strong = li.find('strong')
                    span = li.find('span')
                    if strong and span:
                        key = strong.text.replace(':', '').strip()
                        value = span.text.strip()
                        info_dict[key] = value

        name = info_dict.get('선수명', '')
        jersey_number_str = info_dict.get('등번호', '').replace('No.', '').strip()
        
        if not jersey_number_str or len(jersey_number_str) >= 3:
            return None

        position_map = {"투수": "P", "포수": "C", "내야수": "IF", "외야수": "OF"}
        position_raw = info_dict.get('포지션', '')
        position_group = next((v for k, v in position_map.items() if k in position_raw), "")

        handedness_raw = info_dict.get('포지션', '')
        throws, bats = '', ''
        match = re.search(r'\((.*?)\)', handedness_raw)
        if match:
            hand_info = match.group(1)
            throws_map = {"우": "R", "좌": "L", "언": "R"}
            bats_map = {"우": "R", '좌': "L", "양": "S"}
            throws = throws_map.get(hand_info[0], '')
            bats = bats_map.get(hand_info[-1], '')

        date_str = info_dict.get('생년월일', '')
        date_str = date_str.replace('년', '-').replace('월', '-').replace('일', '').replace('.', '-').replace(' ','').strip()
        parts = date_str.split('-')
        birth_date = '-'.join([p.zfill(2) for p in parts]) if len(parts) == 3 else ''

        player_id = int(re.search(r'playerId=(\d+)', url_path).group(1)) if re.search(r'playerId=(\d+)', url_path) else 0

        team_tag = soup.select_one('#h4Team')
        team_name = team_tag.text.strip() if team_tag else ''

        return {
            "id": player_id,
            "name": name,
            "nameNorm": name.lower().replace(' ', ''),
            "team": team_name,
            "positionGroup": position_group,
            "positionDetail": position_raw,
            "throws": throws,
            "bats": bats,
            "birthDate": birth_date,
            "nationality": "KR",
            "jerseyNumber": int(jersey_number_str)
        }

    except Exception as e:
        print(f"- 상세 정보 수집/변환 중 오류 ({full_url}): {e}")
        return None

def crawl_kbo_players():
    url = "https://www.koreabaseball.com/Player/Search.aspx"
    service = Service(ChromeDriverManager().install())
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    
    driver = webdriver.Chrome(service=service, options=options)
    all_player_links = []
    all_player_data = []

    try:
        # 먼저 전체 팀 목록을 한 번만 가져옴
        print("--- 전체 팀 목록을 가져옵니다. ---")
        driver.get(url)
        team_select_element = WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.ID, 'cphContents_cphContents_cphContents_ddlTeam')))
        team_select = Select(team_select_element)
        team_values = [opt.get_attribute('value') for opt in team_select.options if opt.get_attribute('value') != '0']

        print("--- 1단계: 모든 선수들의 상세 페이지 링크를 수집합니다. ---")
        for team_value in team_values:
            try:
                # 매 팀마다 페이지를 새로고침하여 상태 초기화
                driver.get(url)
                team_select_element = WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.ID, 'cphContents_cphContents_cphContents_ddlTeam')))
                team_select = Select(team_select_element)
                team_select.select_by_value(team_value)
                team_name = team_select.first_selected_option.text
                print(f"\n'{team_name}' 팀 링크 수집 시작...")

                WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "table.tEx tbody tr")))

                current_page = 1
                while True:
                    print(f"- {current_page} 페이지 링크 수집...")
                    all_player_links.extend(get_player_links(driver))
                    
                    try:
                        old_tbody = driver.find_element(By.CSS_SELECTOR, "table.tEx tbody")
                        pagination = driver.find_element(By.CLASS_NAME, "paging")
                        page_links = pagination.find_elements(By.TAG_NAME, "a")
                        
                        next_page_found = False
                        for link in page_links:
                            if link.text == str(current_page + 1):
                                link.click()
                                WebDriverWait(driver, 10).until(EC.staleness_of(old_tbody))
                                current_page += 1
                                next_page_found = True
                                break
                        
                        if not next_page_found:
                            break
                    except Exception:
                        break
            except Exception as e:
                print(f"'{team_name}' 팀 처리 중 오류 발생: {e}")
                continue
        
        unique_links = sorted(list(set(all_player_links)))
        print(f"\n--- 총 {len(unique_links)}개의 고유 선수 링크 수집 완료. ---")

        print("--- 2단계: 각 선수 상세 페이지를 방문하여 정보를 수집합니다. ---")
        for i, link in enumerate(unique_links):
            details = get_player_details(driver, link)
            if details:
                all_player_data.append(details)
            time.sleep(0.05)

        with open('public/players_2025.json', 'w', encoding='utf-8') as f:
            json.dump(all_player_data, f, ensure_ascii=False, indent=4)

        print(f"\n--- 최종 완료: 총 {len(all_player_data)}명의 선수 데이터를 필터링하여 저장했습니다. ---")

    except Exception as e:
        print(f"스크립트 실행 중 치명적인 오류가 발생했습니다: {e}")
    finally:
        driver.quit()

if __name__ == '__main__':
    crawl_kbo_players()
