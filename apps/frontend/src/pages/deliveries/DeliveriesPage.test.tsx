import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setToken } from '@/auth/token';
import { DELIVERY_DETAIL, server } from '@/test/msw';
import { renderApp } from '@/test/render';

const user = () => userEvent.setup();
const bodyRows = () => screen.getAllByRole('row').slice(1);

describe('DeliveriesPage', () => {
	beforeEach(() => {
		localStorage.clear();
		setToken('jwt');
	});

	it('전달을 최근 것부터 표로 보여준다. 목적지 이름·이벤트·상태·시도', async () => {
		renderApp('/app/deliveries');
		expect(await screen.findByText('고객 서버')).toBeDefined();
		const rows = bodyRows();
		expect(rows).toHaveLength(2);
		expect(within(rows[0]!).getByText('#121')).toBeDefined();
		expect(within(rows[0]!).getByText('재시도 대기')).toBeDefined();
		expect(within(rows[0]!).getByText('503')).toBeDefined();
		expect(within(rows[1]!).getByText('삭제된 목적지')).toBeDefined();
		expect(within(rows[1]!).getByText('취소')).toBeDefined();
		expect(screen.getByRole('button', { name: '더 보기' })).toBeDefined();
	});

	it('상태와 목적지로 거른다', async () => {
		renderApp('/app/deliveries');
		await screen.findByText('고객 서버');
		const u = user();
		await u.click(screen.getByRole('combobox', { name: '상태' }));
		await u.click(await screen.findByRole('option', { name: '재시도 대기' }));
		await waitFor(() => expect(bodyRows()).toHaveLength(1));
		await u.click(screen.getByRole('combobox', { name: '상태' }));
		await u.click(await screen.findByRole('option', { name: '모든 상태' }));
		await waitFor(() => expect(bodyRows()).toHaveLength(2));
		await u.click(screen.getByRole('combobox', { name: '목적지' }));
		await u.click(await screen.findByRole('option', { name: '고객 서버' }));
		await waitFor(() => expect(bodyRows()).toHaveLength(1));
		expect(screen.queryByRole('cell', { name: '삭제된 목적지' })).toBeNull();
	});

	it('?event_id=가 있으면 그 이벤트의 전달만 요청하고, 칩을 누르면 푼다', async () => {
		const seen: (string | null)[] = [];
		server.use(
			http.get('/api/orgs/1/projects/10/deliveries', ({ request }) => {
				seen.push(new URL(request.url).searchParams.get('event_id'));
				return HttpResponse.json({ data: [], next_cursor: null });
			})
		);
		renderApp('/app/deliveries?event_id=121');
		const chip = await screen.findByRole('button', { name: /이벤트 #121의 전달만/ });
		await waitFor(() => expect(seen).toContain('121'));
		await user().click(chip);
		await waitFor(() => expect(seen.at(-1)).toBeNull());
	});

	it('행을 누르면 시도 기록이 열린다. 계기는 한국어, 응답 본문은 펼쳐 본다. 이벤트 링크', async () => {
		renderApp('/app/deliveries');
		const u = user();
		await u.click(await screen.findByText('고객 서버'));
		const sheet = await screen.findByRole('dialog');
		expect(await within(sheet).findByText('전달 #900')).toBeDefined();
		expect(within(sheet).getByText('첫 전달')).toBeDefined();
		expect(within(sheet).getByText('자동 재시도')).toBeDefined();
		expect(within(sheet).getByText('ECONNREFUSED')).toBeDefined();
		expect(within(sheet).getByRole('link', { name: '#121' }).getAttribute('href')).toBe('/app/events?id=121');
		await u.click(within(sheet).getByRole('button', { name: '본문' }));
		expect(await within(sheet).findByText('upstream down')).toBeDefined();
	});

	it('다시 보내기와 취소(확인 뒤)는 결과를 알려준다', async () => {
		renderApp('/app/deliveries?id=900');
		const u = user();
		const sheet = await screen.findByRole('dialog');
		await within(sheet).findByText('전달 #900');
		await u.click(within(sheet).getByRole('button', { name: '다시 보내기' }));
		expect(await screen.findByText('다시 보냅니다. 시도 기록에 이어집니다.')).toBeDefined();
		await u.click(within(sheet).getByRole('button', { name: '취소' }));
		await u.click(await screen.findByRole('button', { name: '취소하기' }));
		expect(await screen.findByText('취소했습니다. 더 보내지 않습니다.')).toBeDefined();
	});

	it('끝난 것은 취소가 막힌다. 409는 메시지로', async () => {
		server.use(
			http.get('/api/orgs/1/projects/10/deliveries/900', () => HttpResponse.json({ ...DELIVERY_DETAIL, status: 'succeeded' })),
			http.post('/api/orgs/1/projects/10/deliveries/900/retry', () => HttpResponse.json({ code: 'delivery_pending', message: '처리 중입니다.' }, { status: 409 }))
		);
		renderApp('/app/deliveries?id=900');
		const sheet = await screen.findByRole('dialog');
		await within(sheet).findByText('전달 #900');
		expect(within(sheet).getByRole('button', { name: '취소' }).hasAttribute('disabled')).toBe(true);
		await user().click(within(sheet).getByRole('button', { name: '다시 보내기' }));
		expect(await screen.findByText('처리 중입니다.')).toBeDefined();
	});

	it('처리 중(pending)이면 다시 보내기가 막히고, 시도가 없으면 안내 행', async () => {
		server.use(http.get('/api/orgs/1/projects/10/deliveries/900', () => HttpResponse.json({ ...DELIVERY_DETAIL, status: 'pending', attempts: [] })));
		renderApp('/app/deliveries?id=900');
		const sheet = await screen.findByRole('dialog');
		expect(await within(sheet).findByText('아직 보내지 않았습니다')).toBeDefined();
		expect(within(sheet).getByRole('button', { name: '다시 보내기' }).hasAttribute('disabled')).toBe(true);
	});

	it('상세 조회가 실패하면 오류를 보여준다', async () => {
		server.use(http.get('/api/orgs/1/projects/10/deliveries/900', () => HttpResponse.json({ code: 'delivery_not_found', message: '전달이 없습니다.' }, { status: 404 })));
		renderApp('/app/deliveries?id=900');
		expect(await screen.findByText('전달이 없습니다.')).toBeDefined();
	});

	it('일괄 재시도: 상태를 고르고 보내면 돌린 수를 알려준다', async () => {
		renderApp('/app/deliveries');
		await screen.findByText('고객 서버');
		const u = user();
		await u.click(screen.getByRole('button', { name: '일괄 재시도' }));
		const dialog = await screen.findByRole('dialog');
		await u.click(within(dialog).getByRole('combobox', { name: '되돌릴 상태' }));
		await u.click(await screen.findByRole('option', { name: '취소' }));
		await u.click(within(dialog).getByRole('button', { name: '다시 보내기' }));
		expect(await screen.findByText('10건을 다시 보냅니다.')).toBeDefined();
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	});

	it('프로젝트가 없으면 안내만 보여준다', async () => {
		server.use(http.get('/api/orgs/1/projects', () => HttpResponse.json({ data: [], next_cursor: null })));
		renderApp('/app/deliveries');
		expect(await screen.findByText('프로젝트를 먼저 만드세요.')).toBeDefined();
	});

	it('취소가 실패하면 메시지, 일괄 재시도는 목적지·기간을 같이 보내고 실패도 메시지', async () => {
		const bodies: unknown[] = [];
		server.use(
			http.post('/api/orgs/1/projects/10/deliveries/900/cancel', () => HttpResponse.json({ code: 'delivery_closed', message: '이미 끝났습니다.' }, { status: 409 })),
			http.post('/api/orgs/1/projects/10/deliveries/retry', async ({ request }) => {
				bodies.push(await request.json());
				return HttpResponse.json({ code: 'validation_failed', message: '기간이 올바르지 않습니다.' }, { status: 400 });
			})
		);
		renderApp('/app/deliveries?id=900');
		const u = user();
		const sheet = await screen.findByRole('dialog');
		await within(sheet).findByText('전달 #900');
		await u.click(within(sheet).getByRole('button', { name: '취소' }));
		await u.click(await screen.findByRole('button', { name: '취소하기' }));
		expect(await screen.findByText('이미 끝났습니다.')).toBeDefined();
		await u.click(within(sheet).getByRole('button', { name: 'Close' }));
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

		await u.click(screen.getByRole('button', { name: '일괄 재시도' }));
		const dialog = await screen.findByRole('dialog');
		await u.click(within(dialog).getByRole('combobox', { name: '목적지' }));
		await u.click(await screen.findByRole('option', { name: '고객 서버' }));
		await u.type(within(dialog).getByLabelText('만든 시각 부터'), '2026-10-01T00:00');
		await u.type(within(dialog).getByLabelText('만든 시각 까지'), '2026-10-31T00:00');
		await u.click(within(dialog).getByRole('button', { name: '다시 보내기' }));
		expect(await screen.findByText('기간이 올바르지 않습니다.')).toBeDefined();
		expect(bodies[0]).toEqual({ status: 'dead', destination_id: 3, created_after: new Date('2026-10-01T00:00').toISOString(), created_before: new Date('2026-10-31T00:00').toISOString() });
	});

});
