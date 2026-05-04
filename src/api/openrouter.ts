import axios, { AxiosError } from 'axios';
import { OPENROUTER_API_KEY } from '@env';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
// 'google/gemini-flash-1.5'는 OpenRouter에서 deprecated됨 → 현재 권장 빠른 모델로 교체.
// 다른 모델로 바꾸려면 https://openrouter.ai/models 에서 ID 확인.
const MODEL = 'google/gemini-2.5-flash';

const SYSTEM_PROMPT = [
  '너는 70대 어르신을 모시는 10대 다정하고 섬세한 손주야.',
  '말투는 경어체를 사용하며, 어르신의 하루를 응원하는 따뜻한 분위기여야 해.',
  '입력으로 받은 [기분, 시간, 장소] 정보와 사용자가 남긴 [한 줄 메모]를 조합해',
  '3~4문장의 감성적인 일기 초안을 작성해줘.',
  '메모가 없다면 사진 정보를 기반으로 따뜻한 상상을 더해줘.',
  '결과는 따로 머리말이나 인용부호 없이 일기 본문만 출력해.',
].join(' ');

export interface GenerateAIDraftInput {
  /** 사용자가 고른 기분의 라벨. 선택 안 함이면 null. */
  moodLabel: string | null;
  /** 사진 EXIF에서 뽑은 ISO 8601 시간. 없으면 null. */
  takenAt: string | null;
  /** "위도, 경도" 또는 "위치 정보 없음" 라벨. */
  locationLabel: string;
  /** 사용자가 2단계에서 남긴 한 줄 메모. 빈 문자열이면 메모 없음으로 처리. */
  shortMemo: string;
}

interface OpenRouterChoice {
  index: number;
  message: { role: string; content: string };
  finish_reason: string | null;
}

interface OpenRouterChatCompletionResponse {
  id: string;
  model: string;
  choices: OpenRouterChoice[];
}

interface OpenRouterErrorPayload {
  error?: { message?: string; code?: number };
}

const buildUserMessage = (input: GenerateAIDraftInput): string => {
  const lines: string[] = [];
  lines.push(`기분: ${input.moodLabel ?? '선택 안 함'}`);
  lines.push(`시간: ${input.takenAt ?? '알 수 없음'}`);
  lines.push(`장소: ${input.locationLabel}`);
  const memo = input.shortMemo.trim();
  lines.push(`한 줄 메모: ${memo.length > 0 ? memo : '(메모 없음)'}`);
  return lines.join('\n');
};

/**
 * OpenRouter Chat Completions로 일기 초안을 생성한다.
 *
 * Throws:
 *  - Error('OPENROUTER_API_KEY 미설정') — .env에 키 없음
 *  - Error(서버 에러 메시지) — API 호출 실패 / 빈 응답
 */
const FINAL_SYSTEM_PROMPT = [
  '너는 70대 어르신을 모시는 10대 다정하고 섬세한 손주야.',
  '말투는 경어체이고, 어르신의 하루 전체를 따뜻하게 마무리하는 분위기여야 해.',
  '입력으로 받는 것은 [오늘의 최종 기분]과 [오늘 동안 어르신이 작성한 일기 조각들]이야.',
  '이 조각들을 자연스럽게 엮어 하루를 마무리하는 5~7문장 분량의 종합 일기를 써줘.',
  '시간 흐름을 살짝 의식하되 너무 딱딱한 시간순 나열은 피하고, 감정의 흐름을 더 중요하게 다뤄.',
  '결과는 따로 머리말이나 인용부호 없이 일기 본문만 출력해.',
].join(' ');

export interface GenerateFinalDraftInput {
  /** 최종 기분의 라벨 (예: "평온해요"). null이면 기분 없이 작성. */
  moodLabel: string | null;
  /**
   * 오늘 작성된 일반 일기들의 본문 모음. 시간 순(이른→늦은)으로 정렬해 넣을 것.
   * 한 일기당 한 항목.
   */
  diarySnippets: string[];
}

const buildFinalUserMessage = (input: GenerateFinalDraftInput): string => {
  const lines: string[] = [];
  lines.push(`최종 기분: ${input.moodLabel ?? '선택 안 함'}`);
  if (input.diarySnippets.length === 0) {
    lines.push('오늘 작성한 일기 조각: (없음 — 자유롭게 따뜻한 마무리 멘트만 작성)');
  } else {
    lines.push('오늘 작성한 일기 조각:');
    input.diarySnippets.forEach((snippet, idx) => {
      lines.push(`[${idx + 1}] ${snippet}`);
    });
  }
  return lines.join('\n');
};

/**
 * 하루치 일반 일기들을 종합해서 최종 일기 초안을 만든다.
 * 일반 generateAIDraft와 시스템 프롬프트가 다름 (시간 흐름 + 종합 톤).
 */
export const generateFinalAIDraft = async (
  input: GenerateFinalDraftInput,
): Promise<string> => {
  if (!OPENROUTER_API_KEY) {
    throw new Error(
      'OPENROUTER_API_KEY가 .env에 설정되지 않았습니다. (Metro 재시작 필요)',
    );
  }

  console.log('[FinalAI] 입력:', input);

  try {
    const { data } = await axios.post<OpenRouterChatCompletionResponse>(
      ENDPOINT,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: FINAL_SYSTEM_PROMPT },
          { role: 'user', content: buildFinalUserMessage(input) },
        ],
        temperature: 0.8,
        max_tokens: 1500,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://memora.app',
          'X-Title': 'Memora',
        },
        timeout: 30000,
      },
    );

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('AI가 빈 응답을 반환했어요.');
    }
    return content;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const err = e as AxiosError<OpenRouterErrorPayload>;
      const apiMsg = err.response?.data?.error?.message;
      const status = err.response?.status;
      throw new Error(
        apiMsg ?? `OpenRouter 호출 실패 (status ${status ?? 'unknown'})`,
      );
    }
    throw e;
  }
};

export const generateAIDraft = async (
  input: GenerateAIDraftInput,
): Promise<string> => {
  if (!OPENROUTER_API_KEY) {
    throw new Error(
      'OPENROUTER_API_KEY가 .env에 설정되지 않았습니다. (Metro 재시작 필요)',
    );
  }

  console.log('AI에게 보낼 데이터:', input);

  try {
    const { data } = await axios.post<OpenRouterChatCompletionResponse>(
      ENDPOINT,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserMessage(input) },
        ],
        temperature: 0.8,
        // 3~4문장 일기면 충분. 명시 안 하면 모델 default(65535)가 적용돼서
        // OpenRouter 무료 티어 한도(16000)에 막힘.
        max_tokens: 1000,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          // OpenRouter는 다음 두 헤더가 있으면 어떤 앱이 호출했는지 통계로 잡아줌.
          'HTTP-Referer': 'https://memora.app',
          'X-Title': 'Memora',
        },
        timeout: 30000,
      },
    );

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('AI가 빈 응답을 반환했어요.');
    }
    return content;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const err = e as AxiosError<OpenRouterErrorPayload>;
      const apiMsg = err.response?.data?.error?.message;
      const status = err.response?.status;
      throw new Error(
        apiMsg ?? `OpenRouter 호출 실패 (status ${status ?? 'unknown'})`,
      );
    }
    throw e;
  }
};
