/**
 * FE-P1-06: createTodayDiary가 동시에 여러 번 호출돼도 POST /diaries는 한 번만 나가는지 확인.
 */
import { apiClient } from '../src/api/client';
import { createTodayDiary } from '../src/api/diaries';

jest.mock('../src/api/client', () => ({
  AI_REQUEST_TIMEOUT_MS: 120000,
  apiClient: { post: jest.fn() },
  extractApiErrorMessage: (_e: unknown, fallback: string) => fallback,
}));

const post = apiClient.post as jest.Mock;

const diary = {
  diaryId: 1,
  targetDate: '2026-11-04',
  finalMood: null,
  aiDraft: null,
  finalContent: null,
  isEdited: false,
  status: 'IN_PROGRESS',
  createdAt: '',
  updatedAt: '',
};

beforeEach(() => {
  post.mockReset();
});

test('동시에 호출하면 요청은 한 번만 보내고 같은 결과를 받는다', async () => {
  let resolve!: (v: unknown) => void;
  post.mockReturnValue(new Promise(r => (resolve = r)));

  const a = createTodayDiary();
  const b = createTodayDiary();
  expect(post).toHaveBeenCalledTimes(1);

  resolve({ data: diary });
  await expect(a).resolves.toEqual(diary);
  await expect(b).resolves.toEqual(diary);
});

test('요청이 끝난 뒤 다시 호출하면 새로 요청한다', async () => {
  post.mockResolvedValue({ data: diary });

  await createTodayDiary();
  await createTodayDiary();
  expect(post).toHaveBeenCalledTimes(2);
});

test('실패해도 기다리던 호출 모두 같은 에러를 받고, 다음 호출은 다시 시도한다', async () => {
  post.mockRejectedValueOnce(new Error('network'));

  const a = createTodayDiary();
  const b = createTodayDiary();
  await expect(a).rejects.toThrow('오늘 일기를 시작할 수 없어요.');
  await expect(b).rejects.toThrow('오늘 일기를 시작할 수 없어요.');
  expect(post).toHaveBeenCalledTimes(1);

  post.mockResolvedValueOnce({ data: diary });
  await expect(createTodayDiary()).resolves.toEqual(diary);
  expect(post).toHaveBeenCalledTimes(2);
});
