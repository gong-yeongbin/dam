import axios from 'axios';
import { clearToken, getToken } from '@/auth/token';

// 백엔드 호출. 개발은 Vite 프록시(/api → 3001), 운영은 같은 도메인의 /api
export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
	const token = getToken();
	if (token) config.headers.Authorization = `Bearer ${token}`;
	return config;
});

// 토큰이 없거나 만료됐다. 지우고 로그인으로
api.interceptors.response.use(undefined, (error: unknown) => {
	if (axios.isAxiosError(error) && error.response?.status === 401) {
		clearToken();
		window.location.assign('/login');
	}
	return Promise.reject(error instanceof Error ? error : new Error(String(error)));
});

export type Page<T> = { data: T[]; next_cursor: string | null };
// 백엔드 오류 본문 { code, message }
export type ErrorBody = { code: string; message: string };

export function errorMessage(error: unknown): string {
	if (axios.isAxiosError<ErrorBody>(error) && error.response?.data?.message) return error.response.data.message;
	return '요청에 실패했습니다.';
}
