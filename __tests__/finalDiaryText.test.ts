import { withExactDiaryDate } from '../src/utils/finalDiaryText';

describe('withExactDiaryDate', () => {
  it('AI 자리표시자 날짜를 실제 날짜로 교체한다', () => {
    expect(
      withExactDiaryDate('202X년 X월 XX일\n오늘은 즐거웠다.', '2026-11-09'),
    ).toBe('2026년 11월 9일\n오늘은 즐거웠다.');
  });

  it('AI가 만든 잘못된 날짜를 실제 날짜로 교체한다', () => {
    expect(
      withExactDiaryDate('2025년 1월 2일 (목요일)\n오늘은 산책했다.', '2026-11-09'),
    ).toBe('2026년 11월 9일\n오늘은 산책했다.');
  });
});
