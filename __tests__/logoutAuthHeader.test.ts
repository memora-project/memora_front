/**
 * FE-P1-07: 로그아웃 요청을 보낸 직후 토큰을 지워도
 * POST /auth/logout 에는 Authorization 헤더가 붙어야 한다.
 * (AuthContext.logout: void apiLogout() → setAccessToken(null) 순서 재현)
 */
import type { InternalAxiosRequestConfig } from 'axios';
import { apiClient, setAccessToken } from '../src/api/client';
import { logout as apiLogout } from '../src/api/auth';

const sent: InternalAxiosRequestConfig[] = [];

beforeAll(() => {
  apiClient.defaults.adapter = async config => {
    sent.push(config);
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  };
});

beforeEach(() => {
  sent.length = 0;
});

afterAll(() => {
  setAccessToken(null);
});

test('요청 직후 토큰을 지워도 로그아웃 요청에는 토큰이 붙는다', async () => {
  setAccessToken('ACCESS');

  const pending = apiLogout();
  setAccessToken(null);
  await pending;

  expect(sent).toHaveLength(1);
  expect(sent[0].url).toBe('/auth/logout');
  expect(sent[0].headers.Authorization).toBe('Bearer ACCESS');
});

test('토큰을 지운 뒤 보내는 요청에는 헤더가 붙지 않는다', async () => {
  setAccessToken(null);

  await apiClient.get('/after-logout');

  expect(sent[0].headers.Authorization).toBeUndefined();
});
