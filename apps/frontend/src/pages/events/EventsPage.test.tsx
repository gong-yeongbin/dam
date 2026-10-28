import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setToken } from '@/auth/token';
import { DETAIL, EVENTS, server } from '@/test/msw';
import { renderApp } from '@/test/render';

const user = () => userEvent.setup();
// 표의 본문 행만 (헤더 행 제외)
const bodyRows = () => screen.getAllByRole('row').slice(1);

describe('EventsPage', () => {
	beforeEach(() => {
		localStorage.clear();
		setToken('jwt');
	});

	it('받은 이벤트를 최근 것부터 표로 보여준다. 소스 이름·요청·크기·서명', async () => {
		renderApp('/app/events');
		expect(await screen.findByText('토스 결제')).toBeDefined();
		const rows = bodyRows();
		expect(rows).toHaveLength(2);
		expect(within(rows[0]!).getByText('/orders/42?v=2')).toBeDefined();
		expect(within(rows[0]!).getByText('18 B')).toBeDefined();
		expect(within(rows[0]!).getByText('확인')).toBeDefined();
		expect(within(rows[1]!).getByText('삭제된 소스')).toBeDefined();
		// 상단 바의 프로젝트 선택에 실제 프로젝트가 들어온다
		expect(screen.getByText('shop')).toBeDefined();
	});

	it('더 보기를 누르면 다음 페이지를 이어 붙인다', async () => {
		renderApp('/app/events');
		const more = await screen.findByRole('button', { name: '더 보기' });
		await user().click(more);
		await waitFor(() => expect(screen.queryByRole('button', { name: '더 보기' })).toBeNull());
		expect(bodyRows()).toHaveLength(2);
	});

	it('소스와 받은 시각으로 거른다', async () => {
		renderApp('/app/events');
		await screen.findByText('토스 결제');
		const u = user();
		await u.click(screen.getByRole('combobox', { name: '소스' }));
		await u.click(await screen.findByRole('option', { name: '토스 결제' }));
		await waitFor(() => expect(bodyRows()).toHaveLength(1));
		expect(screen.queryByText('삭제된 소스')).toBeNull();
		// 시각 필터는 ISO로 바뀌어 요청에 실린다
		const seen: string[] = [];
		server.use(
			http.get('/api/orgs/1/projects/10/events', ({ request }) => {
				seen.push(new URL(request.url).searchParams.get('received_after') ?? '');
				return HttpResponse.json({ data: [], next_cursor: null });
			})
		);
		await u.type(screen.getByLabelText('받은 시각 부터'), '2026-10-15T12:00');
		await waitFor(() => expect(seen.at(-1)).toBe(new Date('2026-10-15T12:00').toISOString()));
	});

	it('행을 누르면 상세(전달·헤더·본문)가 열리고 URL에 id가 남는다. 리플레이는 확인 뒤 보낸다', async () => {
		renderApp('/app/events');
		const u = user();
		await u.click(await screen.findByText('/orders/42?v=2'));
		const sheet = await screen.findByRole('dialog');
		expect(await within(sheet).findByText('이벤트 #121')).toBeDefined();
		expect(within(sheet).getByText('재시도 대기')).toBeDefined();
		expect(within(sheet).getByText('취소')).toBeDefined();
		expect(within(sheet).getByText('삭제된 목적지')).toBeDefined();
		expect(within(sheet).getByRole('link', { name: '전달 화면에서 보기' }).getAttribute('href')).toBe('/app/deliveries?event_id=121');

		await u.click(within(sheet).getByRole('tab', { name: '헤더' }));
		expect(await within(sheet).findByText(/x-toss-event: PAYMENT/)).toBeDefined();
		await u.click(within(sheet).getByRole('tab', { name: '본문' }));
		expect(await within(sheet).findByText('{"order":42}')).toBeDefined();

		await u.click(within(sheet).getByRole('button', { name: '리플레이' }));
		await u.click(await screen.findByRole('button', { name: '다시 보내기' }));
		expect(await screen.findByText('새 이벤트 #122로 다시 보냈습니다.')).toBeDefined();
	});

	it('URL에 id가 있으면 바로 상세가 열린다. 상세 조회가 실패하면 오류를 보여준다', async () => {
		server.use(http.get('/api/orgs/1/projects/10/events/121', () => HttpResponse.json({ code: 'event_not_found', message: '이벤트가 없습니다.' }, { status: 404 })));
		renderApp('/app/events?id=121');
		expect(await screen.findByText('이벤트가 없습니다.')).toBeDefined();
	});

	it('프로젝트가 없으면 안내만 보여준다', async () => {
		server.use(http.get('/api/orgs/1/projects', () => HttpResponse.json({ data: [], next_cursor: null })));
		renderApp('/app/events');
		expect(await screen.findByText('프로젝트를 먼저 만드세요.')).toBeDefined();
	});

	it('리플레이가 실패하면 백엔드 메시지를 보여준다. 본문이 비면 (비어 있음)', async () => {
		server.use(
			http.post('/api/orgs/1/projects/10/events/121/replay', () => HttpResponse.json({ code: 'no_connection', message: '연결된 목적지가 없습니다.' }, { status: 409 })),
			http.get('/api/orgs/1/projects/10/events/121/body', () => new HttpResponse(''))
		);
		renderApp('/app/events?id=121');
		const u = user();
		const sheet = await screen.findByRole('dialog');
		await within(sheet).findByText('이벤트 #121');
		await u.click(within(sheet).getByRole('tab', { name: '본문' }));
		expect(await within(sheet).findByText('(비어 있음)')).toBeDefined();
		await u.click(within(sheet).getByRole('button', { name: '리플레이' }));
		await u.click(await screen.findByRole('button', { name: '다시 보내기' }));
		expect(await screen.findByText('연결된 목적지가 없습니다.')).toBeDefined();
	});

	it('소스 목록에 없는 소스 id는 #id로, 닫기를 누르면 상세가 닫힌다', async () => {
		server.use(http.get('/api/orgs/1/projects/10/events', () => HttpResponse.json({ data: [{ ...EVENTS[0], source_id: 99 }], next_cursor: null })));
		renderApp('/app/events?id=121');
		expect(await screen.findByText('#99')).toBeDefined();
		const sheet = await screen.findByRole('dialog');
		await user().click(within(sheet).getByRole('button', { name: 'Close' }));
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	});

	it('거부된 요청 탭: 사유를 한국어로, 헤더를 누르면 펼친다. 사유로 거른다. URL에 view가 남는다', async () => {
		renderApp('/app/events');
		await screen.findByText('토스 결제');
		const u = user();
		await u.click(screen.getByRole('tab', { name: '거부된 요청' }));
		expect(await screen.findByText('서명 불일치')).toBeDefined();
		expect(screen.getByText('연결 없음')).toBeDefined();
		await u.click(screen.getAllByRole('button', { name: '헤더' })[0]!);
		expect(await screen.findByText(/x-signature: bad/)).toBeDefined();

		await u.click(screen.getByRole('combobox', { name: '사유' }));
		await u.click(await screen.findByRole('option', { name: '연결 없음' }));
		// 드롭다운 항목에도 같은 글자가 남아 있어 표의 칸만 본다
		await waitFor(() => expect(screen.queryByRole('cell', { name: '서명 불일치' })).toBeNull());

		await u.click(screen.getByRole('tab', { name: '받은 요청' }));
		expect(await screen.findByText('/orders/42?v=2')).toBeDefined();
	});

	it('전달이 없으면 안내 행, 응답 코드가 없으면 오류 문자열을 보여준다', async () => {
		server.use(http.get('/api/orgs/1/projects/10/events/121', () => HttpResponse.json({ ...EVENTS[0], deliveries: [] })));
		renderApp('/app/events?id=121');
		expect(await screen.findByText('전달이 없습니다')).toBeDefined();
		server.use(http.get('/api/orgs/1/projects/10/events/121', () => HttpResponse.json({ ...EVENTS[0], deliveries: [{ ...DETAIL.deliveries[0], last_status_code: null, last_error: 'ECONNREFUSED', next_attempt_at: null }] })));
		renderApp('/app/events?id=121');
		expect(await screen.findByText('ECONNREFUSED')).toBeDefined();
	});

	it('거부된 요청: 헤더가 없으면 (헤더 없음), 모든 사유로 되돌리면 필터를 뺀다', async () => {
		renderApp('/app/events?view=rejected');
		await screen.findByText('서명 불일치');
		const u = user();
		await u.click(screen.getAllByRole('button', { name: '헤더' })[1]!);
		expect(await screen.findByText('(헤더 없음)')).toBeDefined();
		await u.click(screen.getByRole('combobox', { name: '사유' }));
		await u.click(await screen.findByRole('option', { name: '연결 없음' }));
		await waitFor(() => expect(screen.queryByRole('cell', { name: '서명 불일치' })).toBeNull());
		await u.click(screen.getByRole('combobox', { name: '사유' }));
		await u.click(await screen.findByRole('option', { name: '모든 사유' }));
		expect(await screen.findByRole('cell', { name: '서명 불일치' })).toBeDefined();
	});

	it('URL에 view=rejected면 거부된 요청 탭으로 연다', async () => {
		renderApp('/app/events?view=rejected');
		expect(await screen.findByText('서명 불일치')).toBeDefined();
	});

	it('헤더 값이 여러 개면 쉼표로 잇고, 소스가 없는 이벤트는 삭제된 소스로 보여준다', async () => {
		server.use(http.get('/api/orgs/1/projects/10/events/121', () => HttpResponse.json({ ...DETAIL, source_id: null, headers: { 'x-multi': ['a', 'b'] } })));
		renderApp('/app/events?id=121');
		const sheet = await screen.findByRole('dialog');
		await within(sheet).findByText('이벤트 #121');
		expect(within(sheet).getByText('삭제된 소스')).toBeDefined();
		await user().click(within(sheet).getByRole('tab', { name: '헤더' }));
		expect(await within(sheet).findByText('x-multi: a, b')).toBeDefined();
	});

});
