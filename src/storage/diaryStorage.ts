import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@memora/diaries/v1';

export interface StoredMood {
  key: string;
  label: string;
  emoji: string;
}

export interface DiaryEntry {
  /** 저장 시 자동 생성되는 고유 ID. */
  id: string;
  /** 저장된 시각(ISO 8601). 작성일/정렬 기준. */
  createdAt: string;
  mood: StoredMood | null;
  content: string;
  /** 사진 URI (없으면 null). content:// 또는 file:// 둘 다 가능. */
  photoUri: string | null;
  /** 사진 EXIF에서 추출한 촬영 시각. 없으면 null. */
  takenAt: string | null;
  /** 위도/경도. 사진 EXIF가 우선, 없으면 디바이스 GPS, 둘 다 실패 시 null. */
  latitude: number | null;
  longitude: number | null;
  locationLabel: string;
  /**
   * 위치 출처. 어르신 동선 분석에서 가중치를 다르게 주기 위해 항상 기록.
   * - 'photo'  : 사진 EXIF
   * - 'device' : 일기 작성 시점 디바이스 GPS
   * - 'none'   : 둘 다 없음
   */
  locationSource: 'photo' | 'device' | 'none';
  /**
   * 그날의 "최종 일기" 여부.
   * - false: 일반 일기 (그날 여러 개 가능)
   * - true: 그 날을 마무리하는 종합 일기. 하루 1개만 작성 가능.
   * 기존 데이터엔 이 필드가 없을 수 있어서 readAll에서 false로 normalize.
   */
  isFinal: boolean;
}

const generateId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const readAll = async (): Promise<DiaryEntry[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 기존 데이터에 isFinal 필드가 없을 수 있어서 normalize.
    return (parsed as Array<Partial<DiaryEntry>>).map(e => ({
      ...(e as DiaryEntry),
      isFinal: e.isFinal === true,
    }));
  } catch (e) {
    console.warn('[diaryStorage] JSON 파싱 실패, 빈 목록으로 복구:', e);
    return [];
  }
};

const writeAll = async (entries: DiaryEntry[]): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

/**
 * 저장. id/createdAt은 자동 생성. 최신순으로 앞에 prepend.
 * `isFinal`은 옵셔널로 받고 미지정 시 false로 저장 (= 일반 일기).
 */
export const saveDiary = async (
  draft: Omit<DiaryEntry, 'id' | 'createdAt' | 'isFinal'> & {
    isFinal?: boolean;
  },
): Promise<DiaryEntry> => {
  const entry: DiaryEntry = {
    ...draft,
    id: generateId(),
    createdAt: new Date().toISOString(),
    isFinal: draft.isFinal ?? false,
  };
  try {
    const list = await readAll();
    await writeAll([entry, ...list]);
    return entry;
  } catch (e) {
    console.warn('[diaryStorage] 저장 실패:', e);
    throw new Error('일기를 저장하지 못했어요.');
  }
};

/** 전체 조회. 최신순 정렬 보장. */
export const getAllDiaries = async (): Promise<DiaryEntry[]> => {
  try {
    const list = await readAll();
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (e) {
    console.warn('[diaryStorage] 조회 실패:', e);
    return [];
  }
};

/** 로컬 시간 기준으로 두 날짜가 같은 일자인지 비교. */
const isSameLocalDay = (iso: string, ref: Date): boolean => {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
};

/**
 * 오늘(로컬 자정~자정) 작성된 일기만 — 최신순.
 * 일반 일기 + 최종 일기 모두 포함.
 */
export const getTodayDiaries = async (): Promise<DiaryEntry[]> => {
  const all = await getAllDiaries();
  const today = new Date();
  return all.filter(e => isSameLocalDay(e.createdAt, today));
};

/**
 * 오늘의 최종 일기. 없으면 null.
 * 하루에 1개만 존재한다고 보장 (FinalDiaryScreen이 작성 시점에 중복 검사).
 */
export const getTodayFinalDiary = async (): Promise<DiaryEntry | null> => {
  const today = await getTodayDiaries();
  return today.find(e => e.isFinal) ?? null;
};

/** ID로 단건 조회. 없으면 null. */
export const getDiaryById = async (id: string): Promise<DiaryEntry | null> => {
  const list = await readAll();
  return list.find(e => e.id === id) ?? null;
};

/** ID로 부분 업데이트. 변경된 엔트리를 반환, 없으면 null. */
export const updateDiary = async (
  id: string,
  patch: Partial<Omit<DiaryEntry, 'id' | 'createdAt'>>,
): Promise<DiaryEntry | null> => {
  try {
    const list = await readAll();
    const idx = list.findIndex(e => e.id === id);
    if (idx === -1) return null;
    const updated: DiaryEntry = { ...list[idx], ...patch };
    list[idx] = updated;
    await writeAll(list);
    return updated;
  } catch (e) {
    console.warn('[diaryStorage] 업데이트 실패:', e);
    throw new Error('일기를 수정하지 못했어요.');
  }
};

/** ID로 삭제. */
export const deleteDiary = async (id: string): Promise<void> => {
  try {
    const list = await readAll();
    await writeAll(list.filter(e => e.id !== id));
  } catch (e) {
    console.warn('[diaryStorage] 삭제 실패:', e);
    throw new Error('일기를 삭제하지 못했어요.');
  }
};
