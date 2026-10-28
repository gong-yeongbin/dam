import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setToken } from '@/auth/token';
import { server, USAGE } from '@/test/msw';
import { renderApp } from '@/test/render';

describe('UsagePage', () => {
	beforeEach(() => {
		localStorage.clear();
		setToken('jwt');
	});

	it('이번 달 사용량·포함량·남은 수와 프로젝트별 이벤트 수를 보여준다', async () => {
		renderApp('/app/usage');
		expect(await screen.findByText('1,284')).toBeDefined();
		expect(screen.getByText('/ 10,000 이벤트')).toBeDefined();
		expect(screen.getByText(/2026년 10월/)).toBeDefined();
		expect(screen.getByText(/8,716건 남았습니다. 넘으면 넘은 만큼만 종량/)).toBeDefined();
		expect(screen.getByRole('progressbar', { name: '포함량 대비 사용량' }).getAttribute('aria-valuenow')).toBe('1284');
		expect(screen.getByRole('cell', { name: 'shop' })).toBeDefined();
		expect(screen.getByRole('cell', { name: '812' })).toBeDefined();
		expect(screen.getByRole('cell', { name: '0' })).toBeDefined();
	});

	it('free가 포함량을 넘으면 거부 안내, 유료가 넘으면 종량 안내', async () => {
		server.use(http.get('/api/orgs/1/usage', () => HttpResponse.json({ ...USAGE, plan: 'free', included: 1000, used: 1200 })));
		renderApp('/app/usage');
		expect(await screen.findByText(/포함량을 200건 넘었습니다. Free는 남은 웹훅을 429로 거부합니다/)).toBeDefined();
		expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('1000');

		server.use(http.get('/api/orgs/1/usage', () => HttpResponse.json({ ...USAGE, used: 12000, projects: [] })));
		renderApp('/app/usage');
		expect(await screen.findByText(/포함량을 2,000건 넘었습니다. 넘은 만큼 10만 건당/)).toBeDefined();
		expect(screen.getByText('프로젝트가 없습니다')).toBeDefined();
	});

	it('free에서 남았을 때는 429 안내. 조회가 실패하면 오류', async () => {
		server.use(http.get('/api/orgs/1/usage', () => HttpResponse.json({ ...USAGE, plan: 'free', included: 1000, used: 10 })));
		renderApp('/app/usage');
		expect(await screen.findByText(/990건 남았습니다. 넘으면 그 달 남은 웹훅은 429로 거부됩니다/)).toBeDefined();

		server.use(http.get('/api/orgs/1/usage', () => HttpResponse.json({ code: 'organization_not_found', message: '조직이 없습니다.' }, { status: 404 })));
		renderApp('/app/usage');
		expect(await screen.findByText('조직이 없습니다.')).toBeDefined();
	});
});
