
import json

def find_filtered_players():
    backup_path = 'public/players_2025.json.bak'
    current_path = 'public/players_2025.json'

    try:
        with open(backup_path, 'r', encoding='utf-8') as f:
            backup_players = json.load(f)
        
        with open(current_path, 'r', encoding='utf-8') as f:
            current_players = json.load(f)

        # 현재 선수 목록에 있는 선수들의 이름을 세트로 만듭니다.
        current_player_names = {player['name'] for player in current_players}

        print("--- 필터링으로 인해 제외된 선수 목록 ---")
        filtered_out_count = 0
        for player in backup_players:
            # 백업 파일의 선수 이름이 현재 선수 목록에 없는 경우
            if player.get('선수명') not in current_player_names:
                name = player.get('선수명', '이름 없음')
                number = player.get('등번호', '없음')
                team = player.get('팀명', '팀 없음')
                print(f"- 이름: {name}, 등번호: {number}, 팀: {team}")
                filtered_out_count += 1
        
        if filtered_out_count == 0:
            print("필터링으로 제외된 선수는 없습니다.")
        else:
            print(f"\n총 {filtered_out_count}명의 선수가 등번호 규칙에 의해 제외되었습니다.")

    except FileNotFoundError as e:
        print(f"오류: 파일을 찾을 수 없습니다. ({e.filename})")
    except Exception as e:
        print(f"오류가 발생했습니다: {e}")

if __name__ == '__main__':
    find_filtered_players()
