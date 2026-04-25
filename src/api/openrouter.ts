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
