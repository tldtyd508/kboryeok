import { compareGuess, calcAge } from './utils.js';

const secretPlayer = {
  id: 1,
  name: '김현수',
  nameNorm: '김현수',
  team: 'LG',
  positionGroup: 'OF',
  positionDetail: '좌익수',
  throws: 'R',
  bats: 'L',
  birthDate: '1988-01-12',
  nationality: 'KR',
  jerseyNumber: 22
};

const testCases = [
  // 1. 완전 정답
  {
    id: 1,
    name: '김현수',
    nameNorm: '김현수',
    team: 'LG',
    positionGroup: 'OF',
    positionDetail: '좌익수',
    throws: 'R',
    bats: 'L',
    birthDate: '1988-01-12',
    nationality: 'KR',
    jerseyNumber: 22
  },
  // 2. 포지션 대분류만 정답
  {
    id: 6,
    name: '이정후',
    nameNorm: '이정후',
    team: '키움',
    positionGroup: 'OF',
    positionDetail: '중견수', // 상세 포지션 다름
    throws: 'R',
    bats: 'L',
    birthDate: '1998-08-20', // 나이 어림 (down)
    nationality: 'KR',
    jerseyNumber: 51 // 등번호 높음 (up)
  },
  // 3. 나이/등번호 비교
  {
    id: 8,
    name: '박병호',
    nameNorm: '박병호',
    team: 'KT',
    positionGroup: 'IF',
    positionDetail: '1루수',
    throws: 'R',
    bats: 'R',
    birthDate: '1986-07-10', // 나이 많음 (up)
    nationality: 'KR',
    jerseyNumber: 52 // 등번호 높음 (up)
  },
  // 4. 국적 다른 케이스
  {
    id: 13,
    name: '소크라테스 브리토',
    nameNorm: '소크라테스브리토',
    team: 'KIA',
    positionGroup: 'OF',
    positionDetail: '중견수',
    throws: 'L',
    bats: 'L',
    birthDate: '1992-09-06',
    nationality: 'DO', // 국적 다름
    jerseyNumber: 30
  },
  // 5. 투/타 다른 케이스
  {
    id: 12,
    name: '나성범',
    nameNorm: '나성범',
    team: 'KIA',
    positionGroup: 'OF',
    positionDetail: '우익수',
    throws: 'L', // 투구 다름
    bats: 'L',
    birthDate: '1989-10-03',
    nationality: 'KR',
    jerseyNumber: 47
  }
];

console.log(`비밀 선수: ${secretPlayer.name} (만 ${calcAge(secretPlayer.birthDate)}세, ${secretPlayer.jerseyNumber}번)`);
console.log('------------------------------------');

testCases.forEach((guess, i) => {
  const result = compareGuess(secretPlayer, guess);
  console.log(`[테스트 케이스 ${i + 1}] 추측: ${guess.name}`);
  console.log(result);
  console.log('------------------------------------');
});
