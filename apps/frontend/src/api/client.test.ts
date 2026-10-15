import { http, HttpResponse } from 'msw';
import { getToken, setToken } from '@/auth/token';
import { server } from '@/test/msw';
import { api, errorMessage } from './client';

describe('api client', () => {
	beforeEach(() => localStorage.clear());

	it('토큰을 Bearer로 붙인다', async () => {
		setToken('jwt');
		let seen = '';
		server.use(
			http.get('/api/ping', ({ request }) => {
				seen = request.headers.get('authorization') ?? '';
				return HttpResponse.json({ ok: true });
			})
		);
		await api.get('/ping');
		expect(seen).toBe('Bearer jwt');
	});

	it('401이면 토큰을 지우고 /login으로 보낸다', async () => {
		setToken('expired');
		// jsdom의 location.assign은 spy가 안 걸려 location 자체를 바꿔 끼운다
		const original = window.location;
		const assign = vi.fn();
		Object.defineProperty(window, 'location', { configurable: true, value: { ...original, assign } });
		server.use(http.get('/api/ping', () => HttpResponse.json({ code: 'unauthenticated', message: '인증이 필요합니다.' }, { status: 401 })));
		await expect(api.get('/ping')).rejects.toThrow();
		expect(getToken()).toBeNull();
		expect(assign).toHaveBeenCalledWith('/login');
		Object.defineProperty(window, 'location', { configurable: true, value: original });
	});

	it('errorMessage — 백엔드 message가 있으면 그것, 아니면 기본 문구', async () => {
		server.use(http.get('/api/ping', () => HttpResponse.json({ code: 'x', message: '안 됩니다.' }, { status: 409 })));
		await api.get('/ping').catch((error: unknown) => expect(errorMessage(error)).toBe('안 됩니다.'));
		expect(errorMessage(new Error('boom'))).toBe('요청에 실패했습니다.');
	});
});
