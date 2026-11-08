/** 문장별 줄바꿈을 적용해 긴 AI 본문의 가독성을 높인다. */
export const formatFinalDiaryText = (text: string): string => {
  if (!text) return text;
  if (text.includes('\n')) {
    return text.replace(/\n{2,}/g, '\n');
  }
  return text.replace(/([.!?])\s+/g, '$1\n').trim();
};

/** AI의 임시/오답 날짜를 제거하고 API targetDate를 첫 줄에 강제로 사용한다. */
export const withExactDiaryDate = (text: string, targetDate: string): string => {
  const parsed = /^(\d{4})-(\d{2})-(\d{2})$/.exec(targetDate);
  if (!parsed) return formatFinalDiaryText(text);

  const [, year, month, day] = parsed;
  const dateHeader = `${Number(year)}년 ${Number(month)}월 ${Number(day)}일`;
  const body = text
    .trim()
    .replace(
      /^\s*(?:#{1,6}\s*)?(?:(?:\d{4}|202X|YYYY|XXXX)년\s*(?:\d{1,2}|X{1,2}|MM)월\s*(?:\d{1,2}|X{1,2}|DD)일)(?:\s*\([^\r\n]*\))?\s*(?:\r?\n|$)/i,
      '',
    )
    .trim();

  return formatFinalDiaryText(body ? `${dateHeader}\n${body}` : dateHeader);
};
