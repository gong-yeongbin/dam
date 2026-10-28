import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setToken } from '@/auth/token';
import { server } from '@/test/msw';
import { renderApp } from '@/test/render';

const user = () => userEvent.setup();
const bodyRows = () => screen.getAllByRole('row').slice(1);

describe('ConnectionsPage', () => {
	beforeEach(() => {
		localStorage.clear();
		setToken('jwt');
	});

	it('연결을 소스·목적지 이름, 재시도 설정, 상태로 보여준다', async () => {
		renderApp('/app/connections');
		expect(await screen.findByText('고객 서버')).toBeDefined();
		const rows = bodyRows();
		expect(rows).toHaveLength(2);
		expect(within(rows[0]!).getByText('토스 결제')).toBeDefined();
		expect(within(rows[0]!).getByText('2배씩 · 300초 · 9회')).toBeDefined();
		expect(within(rows[0]!).getByText('보내는 중')).toBeDefined();
		expect(within(rows[1]!).getByText('#99')).toBeDefined();
		expect(within(rows[1]!).getByText('같은 간격 · 60초 · 3회')).toBeDefined();
		expect(within(rows[1]!).getByText('일시 정지')).toBeDefined();
	});

	it('새 연결: 소스·목적지를 고르고 연결하면 목록이 갱신된다. 같은 짝이면 409 메시지', async () => {
		let created = 0;
		server.use(
			http.post('/api/orgs/1/projects/10/connections', async ({ request }) => {
				const body = (await request.json()) as { source_id: number; destination_id: number; retry_count: number };
				if (created++ === 0) return HttpResponse.json({ code: 'connection_conflict', message: '이미 이어진 소스와 목적지입니다.' }, { status: 409 });
				return HttpResponse.json({ id: 3, ...body, retry_strategy: 'exponential', retry_interval_ms: 300000, paused_at: null, created_at: '2026-10-16T00:00:00.000Z', updated_at: '2026-10-16T00:00:00.000Z' }, { status: 201 });
			})
		);
		renderApp('/app/connections');
		await screen.findByText('고객 서버');
		const u = user();
		await u.click(screen.getByRole('button', { name: '새 연결' }));
		const dialog = await screen.findByRole('dialog');
		const submit = within(dialog).getByRole('button', { name: '연결하기' });
		expect(submit.hasAttribute('disabled')).toBe(true);
		await u.click(within(dialog).getByRole('combobox', { name: '소스' }));
		await u.click(await screen.findByRole('option', { name: '토스 결제' }));
		await u.click(within(dialog).getByRole('combobox', { name: '목적지' }));
		await u.click(await screen.findByRole('option', { name: '고객 서버' }));
		await u.clear(within(dialog).getByLabelText('횟수'));
		await u.type(within(dialog).getByLabelText('횟수'), '5');
		await u.click(submit);
		expect(await screen.findByText('이미 이어진 소스와 목적지입니다.')).toBeDefined();
		await u.click(submit);
		expect(await screen.findByText(/연결했습니다/)).toBeDefined();
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	});

	it('행을 누르면 재시도를 고쳐 저장하고, 일시 정지·재개한다', async () => {
		const patched: unknown[] = [];
		server.use(
			http.patch('/api/orgs/1/projects/10/connections/1', async ({ request }) => {
				patched.push(await request.json());
				return HttpResponse.json({});
			})
		);
		renderApp('/app/connections');
		const u = user();
		await u.click(await screen.findByText('고객 서버'));
		const sheet = await screen.findByRole('dialog');
		expect(await within(sheet).findByText('토스 결제 → 고객 서버')).toBeDefined();
		await u.click(within(sheet).getByRole('combobox', { name: '방식' }));
		await u.click(await screen.findByRole('option', { name: '같은 간격' }));
		await u.clear(within(sheet).getByLabelText('간격(초)'));
		await u.type(within(sheet).getByLabelText('간격(초)'), '60');
		await u.click(within(sheet).getByRole('button', { name: '저장' }));
		expect(await screen.findByText(/재시도 설정을 저장했습니다/)).toBeDefined();
		expect(patched[0]).toEqual({ retry_strategy: 'linear', retry_interval_ms: 60000, retry_count: 9 });

		await u.click(within(sheet).getByRole('button', { name: '일시 정지' }));
		expect(await screen.findByText(/일시 정지했습니다/)).toBeDefined();
	});

	it('일시 정지된 연결은 재개 버튼, 삭제는 확인 뒤 목록에서 빠진다', async () => {
		renderApp('/app/connections?id=2');
		const u = user();
		const sheet = await screen.findByRole('dialog');
		expect(await within(sheet).findByText('일시 정지 중')).toBeDefined();
		await u.click(within(sheet).getByRole('button', { name: '재개' }));
		expect(await screen.findByText(/재개했습니다/)).toBeDefined();
		await u.click(within(sheet).getByRole('button', { name: '연결 삭제' }));
		await u.click(await screen.findByRole('button', { name: '지우기' }));
		expect(await screen.findByText(/연결을 지웠습니다/)).toBeDefined();
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	});

	it('연결이 없으면 소스·목적지로 가는 안내를 보여준다', async () => {
		server.use(http.get('/api/orgs/1/projects/10/connections', () => HttpResponse.json({ data: [], next_cursor: null })));
		renderApp('/app/connections');
		expect(await screen.findByText(/연결이 없습니다/)).toBeDefined();
		// 레일에도 '소스' 링크가 있어 표 안의 것만 본다
		expect(within(screen.getByRole('table')).getByRole('link', { name: '소스' }).getAttribute('href')).toBe('/app/sources');
	});

	it('저장·일시 정지·삭제가 실패하면 백엔드 메시지를 보여준다', async () => {
		server.use(
			http.patch('/api/orgs/1/projects/10/connections/1', () => HttpResponse.json({ code: 'validation_failed', message: '간격이 너무 짧습니다.' }, { status: 400 })),
			http.post('/api/orgs/1/projects/10/connections/1/pause', () => HttpResponse.json({ code: 'connection_not_found', message: '연결이 없습니다.' }, { status: 404 })),
			http.delete('/api/orgs/1/projects/10/connections/1', () => HttpResponse.json({ code: 'connection_not_found', message: '지울 연결이 없습니다.' }, { status: 404 }))
		);
		renderApp('/app/connections?id=1');
		const u = user();
		const sheet = await screen.findByRole('dialog');
		await u.click(within(sheet).getByRole('button', { name: '저장' }));
		expect(await screen.findByText('간격이 너무 짧습니다.')).toBeDefined();
		await u.click(within(sheet).getByRole('button', { name: '일시 정지' }));
		expect(await screen.findByText('연결이 없습니다.')).toBeDefined();
		await u.click(within(sheet).getByRole('button', { name: '연결 삭제' }));
		await u.click(await screen.findByRole('button', { name: '지우기' }));
		expect(await screen.findByText('지울 연결이 없습니다.')).toBeDefined();
	});

	it('소스·목적지가 없으면 새 연결 창이 안내만 보여준다', async () => {
		server.use(
			http.get('/api/orgs/1/projects/10/sources', () => HttpResponse.json({ data: [], next_cursor: null })),
			http.get('/api/orgs/1/projects/10/destinations', () => HttpResponse.json({ data: [], next_cursor: null }))
		);
		renderApp('/app/connections');
		expect((await screen.findAllByText('#7')).length).toBe(2);
		await user().click(screen.getByRole('button', { name: '새 연결' }));
		const dialog = await screen.findByRole('dialog');
		expect(within(dialog).getByText(/소스가 없습니다/)).toBeDefined();
		expect(within(dialog).getByText(/목적지가 없습니다/)).toBeDefined();
	});

});
