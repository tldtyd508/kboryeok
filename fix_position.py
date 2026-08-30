import json
import re

def fix_position_parsing():
    filepath = 'public/players_2025.json'

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            players = json.load(f)

        position_map = {"투수": "P", "포수": "C", "내야수": "IF", "외야수": "OF"}
        throws_map = {"우": "R", "좌": "L", "언": "R"} 
        bats_map = {"우": "R", "좌": "L", "양": "S"}

        for player in players:
            position_raw = player.get('positionDetail', '')
            if not position_raw:
                continue

            # 1. 포지션 그룹 및 상세 포지션 정리
            position_clean = position_raw.split('(')[0].strip()
            player['positionGroup'] = position_map.get(position_clean, '')
            player['positionDetail'] = position_clean # 상세 포지션도 정리된 값으로 덮어쓰기

            # 2. 투/타 정보 분리
            match = re.search(r'\(([^)]+)\)', position_raw)
            if match:
                hand_info = match.group(1)
                if '투' in hand_info and '타' in hand_info:
                    throws_char = hand_info[hand_info.find('투') - 1]
                    bats_char = hand_info[hand_info.find('타') - 1]
                    
                    player['throws'] = throws_map.get(throws_char, '')
                    player['bats'] = bats_map.get(bats_char, '')

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(players, f, ensure_ascii=False, indent=4)
        
        print(f"JSON 파일의 positionDetail 필드를 정리했습니다. 총 {len(players)}명의 데이터가 업데이트되었습니다.")

    except FileNotFoundError:
        print(f"오류: '{filepath}' 파일을 찾을 수 없습니다.")
    except Exception as e:
        print(f"데이터 변환 중 오류가 발생했습니다: {e}")

if __name__ == '__main__':
    fix_position_parsing()