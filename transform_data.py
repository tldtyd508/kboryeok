import json
import re

def transform_data():
    # 백업 파일을 원본으로 사용
    input_path = 'public/players_2025.json.bak' 
    output_path = 'public/players_2025.json'

    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            original_players = json.load(f)
        
        transformed_players = []
        player_id_counter = 1

        for player in original_players:
            # 등번호 필터링
            jersey_number_str = player.get('등번호', '').strip()
            if not jersey_number_str or len(jersey_number_str) >= 3:
                continue

            name = player.get('선수명', '')

            # 포지션 변환
            position_map = {"투수": "P", "포수": "C", "내야수": "IF", "외야수": "OF"}
            position_raw = player.get('포지션', '')
            position_group = ""
            for key, value in position_map.items():
                if key in position_raw:
                    position_group = value
                    break

            # 투/타 정보 변환
            handedness_raw = player.get('투타', '')
            throws, bats = '', ''
            throws_map = {"우": "R", "좌": "L", "언": "R"}
            bats_map = {"우": "R", '좌': "L", "양": "S"}
            if handedness_raw:
                throws_hand = handedness_raw[0]
                bats_hand = handedness_raw[-2]
                throws = throws_map.get(throws_hand, '')
                bats = bats_map.get(bats_hand, '')

            # 생년월일 형식 변환
            date_str = player.get('생년월일', '')
            date_str = date_str.replace('년', '-').replace('월', '-').replace('일', '')
            date_str = date_str.replace('.', '-').replace(' ','').strip()
            parts = date_str.split('-')
            if len(parts) == 3:
                parts[1] = parts[1].zfill(2)
                parts[2] = parts[2].zfill(2)
                birth_date = '-'.join(parts)
            else:
                birth_date = '' # 잘못된 형식은 빈 값으로 처리

            transformed_player = {
                "id": player_id_counter,
                "name": name,
                "nameNorm": name.lower().replace(' ', ''),
                "team": player.get('팀명', ''),
                "positionGroup": position_group,
                "positionDetail": position_raw,
                "throws": throws,
                "bats": bats,
                "birthDate": birth_date,
                "nationality": "KR",
                "jerseyNumber": int(jersey_number_str)
            }
            transformed_players.append(transformed_player)
            player_id_counter += 1

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(transformed_players, f, ensure_ascii=False, indent=4)
        
        print(f"JSON 데이터 변환 완료. 총 {len(transformed_players)}명의 선수가 '{output_path}'에 저장되었습니다.")

    except FileNotFoundError:
        print(f"오류: 원본 파일 '{input_path}'을 찾을 수 없습니다. 백업 파일이 있는지 확인해주세요.")
    except Exception as e:
        print(f"데이터 변환 중 오류가 발생했습니다: {e}")

if __name__ == '__main__':
    transform_data()