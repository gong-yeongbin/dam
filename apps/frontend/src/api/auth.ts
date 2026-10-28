import { api } from './client';

// 구글 ID 토큰 → 우리 JWT(7일). 첫 로그인이면 백엔드가 계정과 개인 조직을 만든다
export const loginWithGoogle = async (idToken: string) => (await api.post<{ access_token: string }>('/auth/google', { id_token: idToken })).data.access_token;
