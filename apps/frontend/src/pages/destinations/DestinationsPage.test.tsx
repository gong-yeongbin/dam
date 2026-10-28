import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setToken } from '@/auth/token';
import { DESTINATIONS, server } from '@/test/msw';
import { renderApp } from '@/test/render';

const user = () => userEvent.setup();

describe('DestinationsPage', () => {
	beforeEach(() => {
		localStorage.clear();
		setToken('jwt');
	});

	it('목적지를 이름·주소·동시 요청·타임아웃으로 보여준다', async () => {
		renderApp('/app/destinations');
		expect(await screen.findByText('고객 서버')).toBeDefined();
		expect(screen.getByText('https://api.shop.example/hooks')).toBeDefined();
		expect(screen.getByRole('cell', { name: '2' })).toBeDefined();
		expect(screen.getByRole('cell', { name: '10초' })).toBeDefined();
	});

	it('새 목적지: 주소 형식이 맞아야 만들 수 있고, 헤더는 이름이 있는 줄만 보낸다', async () => {
		const posted: unknown[] = [];
		server.use(
			http.post('/api/orgs/1/projects/10/destinations', async ({ request }) => {
				posted.push(await request.json());
				return HttpResponse.json({ ...DESTINATIONS[0], id: 4, name: '주문 서버' }, { status: 201 });
			})
		);
		renderApp('/app/destinations');
		await screen.findByText('고객 서버');
		const u = user();
		await u.click(screen.getByRole('button', { name: '새 목적지' }));
		const dialog = await screen.findByRole('dialog');
		const submit = within(dialog).getByRole('button', { name: '만들기' });
		await u.type(within(dialog).getByLabelText('이름'), '주문 서버');
		await u.type(within(dialog).getByLabelText('주소'), 'api.example.com');
		expect(submit.hasAttribute('disabled')).toBe(true);
		await u.clear(within(dialog).getByLabelText('주소'));
		await u.type(within(dialog).getByLabelText('주소'), 'https://api.example.com/hooks');
		await u.click(within(dialog).getByRole('button', { name: '헤더 추가' }));
		await u.type(within(dialog).getByLabelText('헤더 이름 1'), 'Authorization');
		await u.type(within(dialog).getByLabelText('헤더 값 1'), 'Bearer t');
		await u.click(within(dialog).getByRole('button', { name: '헤더 추가' }));
		await u.clear(within(dialog).getByLabelText('동시 요청 수'));
		await u.type(within(dialog).getByLabelText('동시 요청 수'), '3');
		await u.click(submit);
		expect(await screen.findByText(/목적지를 만들었습니다/)).toBeDefined();
		expect(posted[0]).toEqual({ name: '주문 서버', url: 'https://api.example.com/hooks', headers: { Authorization: 'Bearer t' }, timeout_ms: 10000, concurrency: 3 });
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	});

	it('상세: 고쳐서 저장하고, 헤더 줄을 지우고, 삭제는 확인 뒤', async () => {
		const patched: unknown[] = [];
		server.use(
			http.get('/api/orgs/1/projects/10/destinations', () => HttpResponse.json({ data: [{ ...DESTINATIONS[0], headers: { Authorization: '***' } }], next_cursor: null })),
			http.patch('/api/orgs/1/projects/10/destinations/3', async ({ request }) => {
				patched.push(await request.json());
				return HttpResponse.json(DESTINATIONS[0]);
			}),
			http.delete('/api/orgs/1/projects/10/destinations/3', () => new HttpResponse(null, { status: 204 }))
		);
		renderApp('/app/destinations?id=3');
		const u = user();
		const sheet = await screen.findByRole('dialog');
		expect(within(sheet).getByLabelText('헤더 값 1').getAttribute('value')).toBe('***');
		await u.click(within(sheet).getByRole('button', { name: '헤더 1 지우기' }));
		await u.clear(within(sheet).getByLabelText('타임아웃(초)'));
		await u.type(within(sheet).getByLabelText('타임아웃(초)'), '20');
		await u.click(within(sheet).getByRole('button', { name: '저장' }));
		expect(await screen.findByText(/저장했습니다/)).toBeDefined();
		expect(patched[0]).toEqual({ name: '고객 서버', url: 'https://api.shop.example/hooks', headers: null, timeout_ms: 20000, concurrency: 2 });

		await u.click(within(sheet).getByRole('button', { name: '목적지 삭제' }));
		await u.click(await screen.findByRole('button', { name: '지우기' }));
		expect(await screen.findByText(/목적지를 지웠습니다/)).toBeDefined();
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	});

	it('목적지가 없으면 안내를 보여준다', async () => {
		server.use(http.get('/api/orgs/1/projects/10/destinations', () => HttpResponse.json({ data: [], next_cursor: null })));
		renderApp('/app/destinations');
		expect(await screen.findByText(/목적지가 없습니다/)).toBeDefined();
	});
});
