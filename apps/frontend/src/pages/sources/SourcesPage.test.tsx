import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setToken } from '@/auth/token';
import { server, SOURCES } from '@/test/msw';
import { renderApp } from '@/test/render';

const user = () => userEvent.setup();

describe('SourcesPage', () => {
	beforeEach(() => {
		localStorage.clear();
		setToken('jwt');
	});

	it('소스를 이름·받는 주소·서명 검증으로 보여주고 주소를 복사한다', async () => {
		server.use(http.get('/api/orgs/1/projects/10/sources', () => HttpResponse.json({ data: [SOURCES[0], { ...SOURCES[0], id: 8, name: '깃허브', slug: 'zzz', signature_config: { header: 'x-hub-signature-256', prefix: 'sha256=' } }], next_cursor: null })));
		renderApp('/app/sources');
		expect(await screen.findByText('토스 결제')).toBeDefined();
		expect(screen.getByText('/in/abcdefghij0123456789')).toBeDefined();
		expect(screen.getByText('꺼짐')).toBeDefined();
		expect(screen.getByText('켜짐 · x-hub-signature-256')).toBeDefined();
		// user-event가 가짜 클립보드를 넣어 준다
		await user().click(screen.getByRole('button', { name: '토스 결제 주소 복사' }));
		expect(await navigator.clipboard.readText()).toBe('http://localhost:3000/api/in/abcdefghij0123456789');
		expect(await screen.findByText('복사됨')).toBeDefined();
	});

	it('새 소스: 서명 검증을 켜면 키·헤더가 필수이고, 만들면 상세가 열린다', async () => {
		const posted: unknown[] = [];
		server.use(
			http.post('/api/orgs/1/projects/10/sources', async ({ request }) => {
				posted.push(await request.json());
				return HttpResponse.json({ ...SOURCES[0], id: 9, name: '포트원', slug: 'newslug', signature_config: { header: 'webhook-signature' } }, { status: 201 });
			}),
			http.get('/api/orgs/1/projects/10/sources', () => HttpResponse.json({ data: posted.length ? [SOURCES[0], { ...SOURCES[0], id: 9, name: '포트원', slug: 'newslug', signature_config: { header: 'webhook-signature' } }] : SOURCES, next_cursor: null }))
		);
		renderApp('/app/sources');
		await screen.findByText('토스 결제');
		const u = user();
		await u.click(screen.getByRole('button', { name: '새 소스' }));
		const dialog = await screen.findByRole('dialog');
		const submit = within(dialog).getByRole('button', { name: '만들기' });
		await u.type(within(dialog).getByLabelText('이름'), '포트원');
		expect(submit.hasAttribute('disabled')).toBe(false);
		await u.click(within(dialog).getByRole('checkbox', { name: '업체 서명을 검증한다' }));
		expect(submit.hasAttribute('disabled')).toBe(true);
		await u.type(within(dialog).getByLabelText(/서명 키/), 'whsec_abc');
		await u.type(within(dialog).getByLabelText('서명 헤더'), 'webhook-signature');
		await u.type(within(dialog).getByLabelText('이벤트 ID 헤더'), 'webhook-id');
		await u.click(within(dialog).getByRole('combobox', { name: '키 인코딩' }));
		await u.click(await screen.findByRole('option', { name: 'base64' }));
		await u.click(submit);
		expect(await screen.findByText(/소스를 만들었습니다/)).toBeDefined();
		expect(posted[0]).toEqual({ name: '포트원', signing_secret: 'whsec_abc', signature_config: { header: 'webhook-signature', encoding: 'hex', secret_encoding: 'base64', signed_payload: '{body}', tolerance_sec: 300, event_id_header: 'webhook-id' } });
		// 만든 소스의 상세가 열려 받는 주소를 보여준다
		const sheet = await screen.findByRole('dialog');
		expect(within(sheet).getByLabelText('받는 주소').getAttribute('value')).toBe('http://localhost:3000/api/in/newslug');
	});

	it('상세: 서명을 끄고 저장하면 둘 다 null로 보낸다. 주소 새로 발급·삭제는 확인 뒤', async () => {
		const patched: unknown[] = [];
		server.use(
			http.patch('/api/orgs/1/projects/10/sources/7', async ({ request }) => {
				patched.push(await request.json());
				return HttpResponse.json(SOURCES[0]);
			}),
			http.post('/api/orgs/1/projects/10/sources/7/rotate-slug', () => HttpResponse.json({ ...SOURCES[0], slug: 'rotated' })),
			http.delete('/api/orgs/1/projects/10/sources/7', () => new HttpResponse(null, { status: 204 }))
		);
		renderApp('/app/sources?id=7');
		const u = user();
		const sheet = await screen.findByRole('dialog');
		await u.click(within(sheet).getByRole('button', { name: '저장' }));
		expect(await screen.findByText('저장했습니다.')).toBeDefined();
		expect(patched[0]).toEqual({ name: '토스 결제', signing_secret: null, signature_config: null });

		await u.click(within(sheet).getByRole('button', { name: '주소 새로 발급' }));
		await u.click(await screen.findByRole('button', { name: '새로 발급' }));
		expect(await screen.findByText(/새 주소를 발급했습니다/)).toBeDefined();

		await u.click(within(sheet).getByRole('button', { name: '소스 삭제' }));
		await u.click(await screen.findByRole('button', { name: '지우기' }));
		expect(await screen.findByText(/소스를 지웠습니다/)).toBeDefined();
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	});

	it('만들기가 실패하면 백엔드 메시지를 보여준다', async () => {
		server.use(http.post('/api/orgs/1/projects/10/sources', () => HttpResponse.json({ code: 'plan_limit', message: '현재 플랜은 프로젝트마다 소스를 3개까지 만들 수 있습니다.' }, { status: 403 })));
		renderApp('/app/sources');
		await screen.findByText('토스 결제');
		const u = user();
		await u.click(screen.getByRole('button', { name: '새 소스' }));
		const dialog = await screen.findByRole('dialog');
		await u.type(within(dialog).getByLabelText('이름'), '넷째');
		await u.click(within(dialog).getByRole('button', { name: '만들기' }));
		expect(await screen.findByText(/소스를 3개까지/)).toBeDefined();
	});

	it('서명이 켜진 소스를 고치면 앞 문자열·시각 헤더·허용 오차가 같이 간다. 실패는 메시지로', async () => {
		const patched: unknown[] = [];
		server.use(
			http.get('/api/orgs/1/projects/10/sources', () => HttpResponse.json({ data: [{ ...SOURCES[0], id: 8, name: '깃허브', slug: 'zzz', signature_config: { header: 'x-hub-signature-256', prefix: 'sha256=' } }], next_cursor: null })),
			http.patch('/api/orgs/1/projects/10/sources/8', async ({ request }) => {
				patched.push(await request.json());
				return patched.length === 1 ? HttpResponse.json({ code: 'validation_failed', message: '요청이 올바르지 않습니다.' }, { status: 400 }) : HttpResponse.json(SOURCES[0]);
			}),
			http.post('/api/orgs/1/projects/10/sources/8/rotate-slug', () => HttpResponse.json({ code: 'source_not_found', message: '소스가 없습니다.' }, { status: 404 })),
			http.delete('/api/orgs/1/projects/10/sources/8', () => HttpResponse.json({ code: 'source_not_found', message: '지울 소스가 없습니다.' }, { status: 404 }))
		);
		renderApp('/app/sources?id=8');
		const u = user();
		const sheet = await screen.findByRole('dialog');
		expect(within(sheet).getByLabelText('서명 앞 문자열').getAttribute('value')).toBe('sha256=');
		expect(within(sheet).getByRole('button', { name: '저장' }).hasAttribute('disabled')).toBe(true);
		await u.type(within(sheet).getByLabelText(/서명 키/), 'secret2');
		await u.type(within(sheet).getByLabelText('시각 헤더'), 'x-timestamp');
		await u.clear(within(sheet).getByLabelText('허용 오차(초)'));
		await u.type(within(sheet).getByLabelText('허용 오차(초)'), '60');
		await u.clear(within(sheet).getByLabelText('서명 대상'));
		await u.type(within(sheet).getByLabelText('서명 대상'), '{{header:x-timestamp}.{{body}');
		await u.click(within(sheet).getByRole('combobox', { name: '서명 인코딩' }));
		await u.click(await screen.findByRole('option', { name: 'base64' }));
		await u.click(within(sheet).getByRole('button', { name: '저장' }));
		expect(await screen.findByText('요청이 올바르지 않습니다.')).toBeDefined();
		expect(patched[0]).toEqual({ name: '깃허브', signing_secret: 'secret2', signature_config: { header: 'x-hub-signature-256', encoding: 'base64', secret_encoding: 'utf8', signed_payload: '{header:x-timestamp}.{body}', tolerance_sec: 60, prefix: 'sha256=', timestamp_header: 'x-timestamp' } });

		await u.click(within(sheet).getByRole('button', { name: '주소 새로 발급' }));
		await u.click(await screen.findByRole('button', { name: '새로 발급' }));
		expect(await screen.findByText('소스가 없습니다.')).toBeDefined();
		await u.click(within(sheet).getByRole('button', { name: '소스 삭제' }));
		await u.click(await screen.findByRole('button', { name: '지우기' }));
		expect(await screen.findByText('지울 소스가 없습니다.')).toBeDefined();
	});

});
