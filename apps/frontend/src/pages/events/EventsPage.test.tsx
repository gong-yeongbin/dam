import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setToken } from '@/auth/token';
import { EVENTS, server } from '@/test/msw';
import { renderApp } from '@/test/render';

describe('EventsPage', () => {
	beforeEach(() => {
		localStorage.clear();
		setToken('jwt');
	});

	it('받은 이벤트를 최근 것부터 표로 보여준다. 소스 이름·요청·크기·서명', async () => {
		renderApp('/app/events');
		expect(await screen.findByText('토스 결제')).toBeDefined();
		const rows = screen.getAllByRole('row').slice(1);
		expect(rows).toHaveLength(2);
		expect(within(rows[0]!).getByText('/orders/42?v=2')).toBeDefined();
		expect(within(rows[0]!).getByText('18 B')).toBeDefined();
		expect(within(rows[0]!).getByText('확인')).toBeDefined();
		expect(within(rows[1]!).getByText('삭제된 소스')).toBeDefined();
		// 사이드바의 프로젝트 선택에 실제 프로젝트가 들어온다
		expect(screen.getByText('shop')).toBeDefined();
	});

	it('더 보기를 누르면 다음 페이지를 이어 붙인다', async () => {
		renderApp('/app/events');
		const more = await screen.findByRole('button', { name: '더 보기' });
		fireEvent.click(more);
		await waitFor(() => expect(screen.queryByRole('button', { name: '더 보기' })).toBeNull());
		expect(screen.getAllByRole('row').slice(1)).toHaveLength(2);
	});

	it('소스로 거른다', async () => {
		renderApp('/app/events');
		await screen.findByText('토스 결제');
		fireEvent.mouseDown(screen.getByRole('combobox', { name: '소스' }));
		fireEvent.click((await screen.findByText('토스 결제', { selector: '.ant-select-item-option-content' })).closest('.ant-select-item-option')!);
		await waitFor(() => expect(screen.getAllByRole('row').slice(1)).toHaveLength(1));
		expect(screen.queryByText('삭제된 소스')).toBeNull();
	});

	it('행을 누르면 상세(전달·헤더·본문)가 열리고 URL에 id가 남는다. 리플레이는 확인 뒤 보낸다', async () => {
		renderApp('/app/events');
		fireEvent.click(await screen.findByText('/orders/42?v=2'));
		const drawer = await screen.findByRole('dialog');
		expect(await within(drawer).findByText('이벤트 #121')).toBeDefined();
		expect(within(drawer).getByText('재시도 대기')).toBeDefined();
		expect(within(drawer).getByText('취소')).toBeDefined();
		expect(within(drawer).getByText('삭제된 목적지')).toBeDefined();

		fireEvent.click(within(drawer).getByRole('tab', { name: '헤더' }));
		expect(await within(drawer).findByText(/x-toss-event: PAYMENT/)).toBeDefined();
		fireEvent.click(within(drawer).getByRole('tab', { name: '본문' }));
		expect(await within(drawer).findByText('{"order":42}')).toBeDefined();

		fireEvent.click(within(drawer).getByRole('button', { name: '리플레이' }));
		fireEvent.click(await screen.findByRole('button', { name: '다시 보내기' }));
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
		const drawer = await screen.findByRole('dialog');
		await within(drawer).findByText('이벤트 #121');
		fireEvent.click(within(drawer).getByRole('tab', { name: '본문' }));
		expect(await within(drawer).findByText('(비어 있음)')).toBeDefined();
		fireEvent.click(within(drawer).getByRole('button', { name: '리플레이' }));
		fireEvent.click(await screen.findByRole('button', { name: '다시 보내기' }));
		expect(await screen.findByText('연결된 목적지가 없습니다.')).toBeDefined();
	});

	it('소스 목록에 없는 소스 id는 #id로, 닫기를 누르면 상세가 닫힌다', async () => {
		server.use(http.get('/api/orgs/1/projects/10/events', () => HttpResponse.json({ data: [{ ...EVENTS[0], source_id: 99 }], next_cursor: null })));
		renderApp('/app/events?id=121');
		expect(await screen.findByText('#99')).toBeDefined();
		const drawer = await screen.findByRole('dialog');
		fireEvent.click(within(drawer).getByRole('button', { name: 'Close' }));
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	});

	it('거부된 요청 탭: 사유를 한국어로, 행을 펼치면 헤더. 사유로 거른다. URL에 view가 남는다', async () => {
		renderApp('/app/events');
		await screen.findByText('토스 결제');
		fireEvent.click(screen.getByText('거부된 요청'));
		expect(await screen.findByText('서명 불일치')).toBeDefined();
		expect(screen.getByText('연결 없음')).toBeDefined();
		fireEvent.click(screen.getAllByRole('button', { name: /Expand row/ })[0]!);
		expect(await screen.findByText(/x-signature: bad/)).toBeDefined();

		fireEvent.mouseDown(screen.getByRole('combobox', { name: '사유' }));
		fireEvent.click((await screen.findByText('연결 없음', { selector: '.ant-select-item-option-content' })).closest('.ant-select-item-option')!);
		// 드롭다운 항목에도 같은 글자가 있어 표의 칸(span.ant-typography)만 본다
		await waitFor(() => expect(screen.queryByText('서명 불일치', { selector: 'span.ant-typography' })).toBeNull());

		fireEvent.click(screen.getByText('받은 요청'));
		expect(await screen.findByText('/orders/42?v=2')).toBeDefined();
	});

	it('URL에 view=rejected면 거부된 요청 탭으로 연다', async () => {
		renderApp('/app/events?view=rejected');
		expect(await screen.findByText('서명 불일치')).toBeDefined();
	});
});
