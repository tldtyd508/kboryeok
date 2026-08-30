# KBO 선수 데이터 갱신

## 데이터 원칙

- 기준선은 KBO가 2026-02-10 공개한 `2026년 구단별 코칭스탭 및 소속선수 명단.xlsx`다.
- 원본 XLSX는 내부 검수용으로만 보관하며 Git 저장소와 서비스에서 재배포하지 않는다.
- 나무위키는 동명이인, 개명, 별칭, 과거 경력의 후보를 찾는 보조 인덱스로만 사용한다.
- 나무위키 문장과 표를 복사하지 않는다. 실제 값은 KBO, 구단, 공식 발표로 다시 확인한다.
- 사진과 구단 로고는 별도의 사용 허락을 받기 전까지 데이터셋에 포함하지 않는다.

## 파일

- `data/source/kbo-team-rosters-2026.xlsx`: 로컬 기준 XLSX, Git 제외
- `data/manual/roster-deltas.json`: 시즌 중 영입, 이적, 방출 변동분
- `data/manual/player-overrides.json`: 별칭, 생년월일, 투타, 등번호 등 검수한 보강값
- `data/generated/roster-2026.json`: 전체 621명과 보강 필요 상태
- `public/players.json`: 게임에 사용할 수 있는 검수 완료 선수
- `public/daily_puzzles.json`: 날짜별 고정 정답
- `data/roster-metadata.json`: 출처와 마지막 월간 검수일

## 최초 또는 월간 반영

1. 새 공식 XLSX가 있으면 `data/source/`의 로컬 파일을 교체한다.
2. 시즌 중 변동을 `data/manual/roster-deltas.json`에 기록한다.
3. 나무위키에서 찾은 단서는 공식 자료로 교차 확인한 뒤 `player-overrides.json`에 기록한다.
4. 아래 명령으로 전체 데이터를 다시 생성한다.

```bash
npm run data:import -- --source data/source/kbo-team-rosters-2026.xlsx --season 2026 --reviewed-at YYYY-MM-DD
npm run data:check
npm run build
```

매월 1일 GitHub Actions가 `lastReviewedAt`의 연월을 확인한다. 해당 월에 아직 검수하지 않았다면 작업이 실패해 갱신 필요 상태를 알린다. 외부 사이트를 자동 크롤링하거나 배포 중인 Vercel 함수가 정적 JSON을 수정하지는 않는다.

## 변동분 예시

```json
{
  "changes": [
    {
      "op": "remove",
      "effectiveDate": "2026-09-01",
      "team": "LG 트윈스",
      "name": "홍길동",
      "positionGroup": "P",
      "sourceUrl": "https://공식-출처"
    },
    {
      "op": "upsert",
      "effectiveDate": "2026-09-01",
      "team": "한화 이글스",
      "name": "홍길동",
      "positionGroup": "P",
      "positionDetail": "투수",
      "sourceUrl": "https://공식-출처"
    }
  ]
}
```
