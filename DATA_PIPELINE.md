# KBO 선수 데이터 갱신

## 데이터 원칙

- 기준선은 KBO가 2026-02-10 공개한 `2026년 구단별 코칭스탭 및 소속선수 명단.xlsx`다.
- 원본 XLSX는 내부 검수용으로만 보관하며 Git 저장소와 서비스에서 재배포하지 않는다.
- 나무위키는 동명이인, 개명, 별칭, 과거 경력의 후보를 찾는 보조 인덱스로만 사용한다.
- 나무위키 문장과 표를 복사하지 않는다. 실제 값은 KBO, 구단, 공식 발표로 다시 확인한다.
- 사진과 구단 로고는 별도의 사용 허락을 받기 전까지 데이터셋에 포함하지 않는다.
- 서비스는 전체 기록 데이터베이스를 복제하지 않는다. 현역·은퇴 선수 인덱스만 상시 관리하고, 기록은 문제 출제에 필요한 범위만 수집·검수해 문제 파일에 고정한다.
- STATIZ는 2026-04-02 공지에서 모든 크롤링을 금지했다. 서면 허가나 공식 제공 방식이 생기기 전에는 자동·수동 스크레이핑 원본으로 사용하지 않는다.

## 파일

- `data/source/kbo-team-rosters-2026.xlsx`: 로컬 기준 XLSX, Git 제외
- `data/manual/roster-deltas.json`: 시즌 중 영입, 이적, 방출 변동분
- `data/manual/player-overrides.json`: KBO 공식 선수 프로필에서 동기화하거나 수동 검수한 생년월일, 투타, 등번호 등 보강값
- `data/generated/roster-2026.json`: 전체 621명과 보강 필요 상태
- `public/players.json`: 게임에 사용할 수 있는 검수 완료 선수
- `public/daily_puzzles.json`: 날짜별 고정 정답
- `data/roster-metadata.json`: 출처와 마지막 월간 검수일
- `data/player-index/historical.json`: KBO 통산 타자 기록실의 최소 기준 충족 선수 인덱스
- `data/player-index/historical-pitchers.json`: KBO 통산 투수 기록실의 최소 기준 충족 선수 인덱스
- `data/questions/{game}/{YYYY-MM-DD}-{slug}.json`: 출제 당일 검수한 문제별 정답·기록·출처 스냅샷
- `data/questions/kboten/index.json`: 날짜별 문제 파일에서 빌드 전에 자동 생성하는 런타임 인덱스
- `data/questions/kbo5001/{YYYY-MM-DD}-{slug}.json`: 후보 선수·기록값·목표값·검증된 정답 조합 스냅샷
- `data/questions/kbo5001/index.json`: 검증 완료된 크보 5001 문제의 런타임 인덱스
- `data/questions/kbo-bingo/{YYYY-MM-DD}-{slug}.json`: 4×4 조건판, 36장 선수 덱과 칸별 판정 집합
- `data/questions/kbo-bingo/index.json`: 검증 완료된 크보 빙고 문제의 런타임 인덱스
- `data/sources.json`: 출처별 허용 범위와 자동 수집 가능 여부

## 두 개의 데이터 층

### 1. 선수 인덱스 — 상시 보유

게임 검색과 동명이인 판정을 위한 최소 정보만 유지한다.

- 내부 `playerId`
- KBO 선수 ID 등 공개 식별자
- 현재 표기명, 개명 전 이름, 외국인 선수 허용 표기
- 현역 상태: `active`, `retired`, `inactive`, `unknown`
- 데뷔·은퇴 연도와 팀 이력의 최소 요약
- 마지막 확인일과 근거 URL

현역 여부는 선수의 영구 속성이 아니라 기준일에 따른 상태다. 해외 진출, 군 복무, 임의해지처럼 은퇴가 아닌 이탈은 `inactive`로 분리한다. 월간 XLSX 갱신은 현재 상태만 병합하며 과거 선수나 이전 이름을 삭제하지 않는다.

검색 자동완성은 현역 명단과 역대 선수 이름 인덱스를 합쳐 만든다. 문제 정답 10명만 후보로 제공하면 자동완성이 정답을 누설하므로, 항상 전체 선수 후보군을 검색하되 문제 파일에는 실제 판정에 필요한 답만 둔다. 사용자는 자유 문자열을 제출하지 않고 자동완성 후보를 선택하므로 오타가 오답으로 기록되지 않는다.

### 2. 문제 스냅샷 — 출제할 때만 보유

크보텐과 크보 5001은 전체 시즌 기록 테이블을 미리 들여오지 않는다. 출제자가 `지표 + 시즌/통산 + 경기 범위 + 기준일`을 정한 뒤 그 문제에 필요한 선수와 값만 가져온다.

예: `통산 3,000타석 이상 타율 TOP 10, 2026-09-04 조회 기준`이면 10명의 이름·순위·타율과 판정용 별칭만 저장한다. 크보 5001이면 후보 N명의 해당 지표 값과 검증된 정답 조합만 저장한다.

문제는 공개 뒤 원문 기록이 정정돼도 당일 플레이가 바뀌지 않도록 스냅샷으로 고정한다. 정정이 확인되면 기존 파일을 조용히 덮지 않고 `revision`과 사유를 남긴다.

문제 파일은 하나의 거대한 배열로 합치지 않는다. 게임·공개일별 파일을 Git에서 리뷰하고, 추후 문제 수가 늘면 빌드 단계에서 날짜별 인덱스만 자동 생성한다. CMS를 도입하더라도 배포에 사용한 JSON 스냅샷은 재현과 감사를 위해 저장소에 남긴다.

`npm run build`는 먼저 크보텐, 크보 5001과 크보 빙고의 `index.json`을 다시 생성한다. 따라서 새 날짜의 JSON을 추가할 때 애플리케이션 import 코드를 수정할 필요가 없다. 이때 `review.status`가 `verified`인 문제만 런타임 인덱스에 포함하므로 검토 중인 초안이 실수로 공개되지 않는다.

크보 5001은 후보 M명 중 N명을 고르는 모든 조합을 검증 스크립트에서 전수 검사한다. 공개 문제는 정답 조합이 1~3개인 경우만 통과하며, JSON에 기록한 정답과 계산 결과가 다르면 빌드를 중단한다.

크보 빙고는 16개 조건과 36장 선수 덱을 저장한다. 검증기는 전체 판의 이분 매칭, 임의 카드 4장 제거 전수 검사와 카드 8장 제거 10,000개 표본 검사를 실행한다.

## 문제 출제 흐름

1. 문제의 지표, 기간, 정규시즌/포스트시즌 범위와 동률 규칙을 먼저 확정한다.
2. `data/sources.json`에서 사용 가능한 출처인지 확인한다.
3. KBO 공식 기록·연감 등 허용된 원문에서 필요한 행만 수집한다.
4. 선수 이름을 선수 인덱스의 `playerId`와 연결하고, 동명이인·개명·외국인 표기를 검수한다.
5. 정답, 수치, 출처 URL, 확인일, 검수자를 하나의 문제 스냅샷에 저장한다.
6. 조합·중복·동률 규칙을 자동 검사한 뒤 배포한다.

이 방식에서 “그날그날 수집”은 사용자가 게임을 열 때 실시간으로 외부 사이트를 호출한다는 뜻이 아니다. 출제·배포 전에 한 번 수집하고 검수한 정적 스냅샷을 모든 사용자에게 제공한다.

## 최초 또는 월간 반영

1. 새 공식 XLSX가 있으면 `data/source/`의 로컬 파일을 교체한다.
2. 시즌 중 변동을 `data/manual/roster-deltas.json`에 기록한다.
3. KBO 공식 선수 검색·프로필에서 세부 정보를 동기화한다. 남은 누락만 나무위키에서 단서를 찾고 공식 자료로 교차 확인한다.
4. 크보텐의 통산 기록 후보 풀을 KBO 공식 기록실에서 갱신한다.
5. 아래 명령으로 전체 데이터를 다시 생성하고 검증한다.

```bash
npm run data:import -- --source data/source/kbo-team-rosters-2026.xlsx --season 2026 --reviewed-at YYYY-MM-DD
npm run data:sync-players
npm run data:import -- --source data/source/kbo-team-rosters-2026.xlsx --season 2026 --reviewed-at YYYY-MM-DD
npm run data:sync-kboten-index
npm run data:validate-kboten
npm run data:validate-kbo5001
npm run data:validate-kbo-bingo
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
