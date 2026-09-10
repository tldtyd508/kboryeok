# KBO 선수 데이터 갱신

## 데이터 원칙

- 기준선은 KBO가 2026-02-10 공개한 `2026년 구단별 코칭스탭 및 소속선수 명단.xlsx`다.
- 원본 XLSX는 내부 검수용으로만 보관하며 Git 저장소와 서비스에서 재배포하지 않는다.
- 나무위키는 동명이인, 개명, 별칭, 과거 경력의 후보를 찾는 보조 인덱스로 사용한다. 은퇴 선수의 KBO 선수 시절 등번호 이력에 한해 단독 참고 자료로 허용한다.
- 나무위키 문장과 표를 복사하지 않는다. 등번호만 선수별 JSON에 옮기고 해당 문서 URL과 확인일을 남긴다. 기록 수치·수상·현역 현재 등번호는 KBO, 구단, 공식 발표로 다시 확인한다.
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
- `data/players/profiles/{playerId}.json`: 현역·은퇴 선수를 모두 포함한 선수별 원본 프로필
- `data/players/index.json`: 선수별 원본에서 만드는 게임용 경량 생성 파일(직접 편집 금지)
- `data/relations/teams.json`: 변하지 않는 구단 ID·표기명
- `data/relations/team-seasons/{season}.json`: 시즌별 구단·감독·선수 명단 관계
- `data/relations/awards/history.json`: KBO 공식 출처로 검수한 수상 이력
- `data/relations/index.json`: 빙고 판정을 위한 관계형 생성 인덱스(직접 편집 금지)
- `data/questions/{game}/{YYYY-MM-DD}-{slug}.json`: 출제 당일 검수한 문제별 정답·기록·출처 스냅샷
- `data/questions/kboten/index.json`: 날짜별 문제 파일에서 빌드 전에 자동 생성하는 런타임 인덱스
- `data/questions/kbo5001/{YYYY-MM-DD}-{slug}.json`: 후보 선수·기록값·목표값·검증된 정답 조합 스냅샷
- `data/questions/kbo5001/index.json`: 검증 완료된 크보 5001 문제의 런타임 인덱스
- `data/questions/kbo-bingo/{YYYY-MM-DD}-{slug}.json`: 4×4 조건판, 36장 선수 덱, 날짜별 선수 속성 스냅샷과 수상·이력 판정 집합
- `data/questions/kbo-bingo/index.json`: 검증 완료된 크보 빙고 문제의 런타임 인덱스
- `data/sources.json`: 출처별 허용 범위와 자동 수집 가능 여부

## 두 개의 데이터 층

### 1. 선수 인덱스 — 상시 보유

`data/players/profiles/{playerId}.json`을 선수 정보의 단일 원본으로 유지한다. 게임 검색과 동명이인 판정에 필요한 최소 정보는 여기서 `data/players/index.json`으로 생성한다.

- 내부 `playerId`
- KBO 선수 ID 등 공개 식별자
- 현재 표기명, 개명 전 이름, 외국인 선수 허용 표기
- 현역 상태: `active`, `retired`, `inactive`, `unknown`
- 데뷔·은퇴 연도와 팀 이력의 최소 요약
- 마지막 확인일과 근거 URL

현역 여부는 선수의 영구 속성이 아니라 기준일에 따른 상태다. 해외 진출, 군 복무, 임의해지처럼 은퇴가 아닌 이탈은 `inactive`로 분리한다. 월간 XLSX 갱신은 현재 상태만 병합하며 과거 선수나 이전 이름을 삭제하지 않는다.

검색 자동완성은 현역 명단과 은퇴 선수 이름 인덱스를 합쳐 만든다. 문제 정답 10명만 후보로 제공하면 자동완성이 정답을 누설하므로, 항상 전체 선수 후보군을 검색하되 문제 파일에는 실제 판정에 필요한 답만 둔다. 사용자는 자유 문자열을 제출하지 않고 자동완성 후보를 선택하므로 오타가 오답으로 기록되지 않는다.

모든 선수는 ID와 같은 이름의 개별 JSON을 가진다. 현역은 `current`에 해당 시즌 구단과 등번호를 두고, 은퇴 선수는 `current: null`로 둔다. 포지션·투타·출생연도·등번호가 모두 갖춰진 선수는 `game-ready`, 이름과 KBO ID만 확보한 선수는 `index-only`로 구분해 불완전한 정보가 게임 판정에 섞이지 않게 한다.

은퇴 선수의 등번호는 나무위키 선수 문서를 참고할 수 있으며 `career.jerseyNumberSources`에 문서 URL과 확인일을 저장한다. 현역 선수의 등번호 조건은 현재 등록 번호, 은퇴 선수는 KBO 선수 시절 사용한 번호 중 하나라도 범위에 들면 충족한다. 해외 구단·국가대표·코칭스태프 번호는 포함하지 않는다.

팀메이트를 각 선수 JSON에 서로 복제하지 않는다. `data/relations/team-seasons/{season}.json`의 같은 시즌·같은 구단 소속으로 계산한다. 감독도 같은 파일에 한 번만 저장한다. 수상 이력은 `data/relations/awards/`에 정규화하고 선수 ID로 연결한다. 빙고의 팀메이트·감독·수상 조건은 이 관계 원본에서 계산하되, 공개 문제에는 계산된 `validPlayerIds`를 함께 고정해 이후 이력 보강이 과거 문제의 정답을 바꾸지 못하게 한다.

### 2. 문제 스냅샷 — 출제할 때만 보유

크보텐과 크보 5001은 전체 시즌 기록 테이블을 미리 들여오지 않는다. 출제자가 `지표 + 시즌/통산 + 경기 범위 + 기준일`을 정한 뒤 그 문제에 필요한 선수와 값만 가져온다.

예: `통산 3,000타석 이상 타율 TOP 10, 2026-09-04 조회 기준`이면 10명의 이름·순위·타율과 판정용 별칭만 저장한다. 크보 5001이면 후보 N명의 해당 지표 값과 검증된 정답 조합만 저장한다.

문제는 공개 뒤 원문 기록이 정정돼도 당일 플레이가 바뀌지 않도록 스냅샷으로 고정한다. 정정이 확인되면 기존 파일을 조용히 덮지 않고 `revision`과 사유를 남긴다.

문제 파일은 하나의 거대한 배열로 합치지 않는다. 게임·공개일별 파일을 Git에서 리뷰하고, 추후 문제 수가 늘면 빌드 단계에서 날짜별 인덱스만 자동 생성한다. CMS를 도입하더라도 배포에 사용한 JSON 스냅샷은 재현과 감사를 위해 저장소에 남긴다.

`npm run build`는 먼저 크보텐, 크보 5001과 크보 빙고의 `index.json`을 다시 생성한다. 따라서 새 날짜의 JSON을 추가할 때 애플리케이션 import 코드를 수정할 필요가 없다. 이때 `review.status`가 `verified`인 문제만 런타임 인덱스에 포함하므로 검토 중인 초안이 실수로 공개되지 않는다.

크보 5001은 후보 M명 중 N명을 고르는 모든 조합을 검증 스크립트에서 전수 검사한다. 공개 문제는 정답 조합이 1~3개인 경우만 통과하며, JSON에 기록한 정답과 계산 결과가 다르면 빌드를 중단한다.

크보 빙고는 16개 조건과 36장 선수 덱을 저장한다. 구단·포지션·투타·출생연도·등번호처럼 선수 속성으로 결정되는 칸은 공통 선수 카탈로그의 `rule`에서 계산한다. 팀 시즌·팀메이트·감독·수상은 관계 인덱스의 `teamSeason`, `teammate`, `managedBy`, `award` 규칙으로 계산하고, 공개 당시 계산 결과를 `validPlayerIds`에 고정한다. 날짜를 시드로 삼은 균형 셔플은 현역과 은퇴 선수를 섞되 모든 사용자에게 같은 순서를 제공한다. 검증기는 전체 판의 이분 매칭, 임의 카드 4장 제거 전수 검사와 카드 8장 제거 10,000개 표본 검사를 실행한다.

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
3. KBO 공식 선수 검색·프로필에서 세부 정보를 동기화한다. 은퇴 선수의 과거 KBO 등번호는 나무위키 문서를 참고하고, 그 외 누락은 공식 자료로 교차 확인한다.
4. 크보텐의 통산 기록 후보 풀을 KBO 공식 기록실에서 갱신한다.
5. 아래 명령으로 전체 데이터를 다시 생성하고 검증한다.

```bash
npm run data:import -- --source data/source/kbo-team-rosters-2026.xlsx --season 2026 --reviewed-at YYYY-MM-DD
npm run data:sync-players
npm run data:sync-player-profiles
npm run data:validate-players
npm run data:build-players
npm run data:sync-relations
npm run data:build-relations
npm run data:validate-relations
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
