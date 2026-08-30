
import json
import random

def generate_daily_sequence():
    json_path = 'public/players_2025.json'
    output_path = 'public/daily_sequence.json'

    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            players = json.load(f)

        # 선수 데이터에서 ID만 추출
        player_ids = [player['id'] for player in players]

        # ID 목록을 무작위로 섞음
        random.shuffle(player_ids)

        # 섞인 ID 목록을 새로운 JSON 파일로 저장
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(player_ids, f)
        
        print(f"성공: {len(player_ids)}명의 선수로 이루어진 정답 순서표를 생성하여 '{output_path}'에 저장했습니다.")

    except FileNotFoundError:
        print(f"오류: '{json_path}' 파일을 찾을 수 없습니다.")
    except Exception as e:
        print(f"오류가 발생했습니다: {e}")

if __name__ == '__main__':
    generate_daily_sequence()
