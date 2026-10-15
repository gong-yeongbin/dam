import { fireEvent, screen, waitFor } from '@testing-library/react';
import { setToken } from '@/auth/token';
import { renderApp } from '@/test/render';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw';

const renderAt = renderApp;

describe('AppShell', () => {
	beforeEach(() => localStorage.clear());

	it('토큰이 없으면 /login으로 보낸다', () => {
		renderAt('/app/events');
		expect(screen.getByRole('button', { name: /Google 계정으로 로그인/ })).toBeDefined();
	});

	it('/app은 이벤트로 가고, 메뉴 6개와 실제 프로젝트를 보여준다', async () => {
		setToken('jwt');
		renderAt('/app');
		expect(screen.getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['이벤트', '전달', '연결', '소스', '목적지', '설정']);
		expect(screen.getByRole('link', { name: '이벤트' }).getAttribute('href')).toBe('/app/events');
		expect(screen.getByRole('combobox', { name: '프로젝트' })).toBeDefined();
		expect(await screen.findByText('shop')).toBeDefined();
	});

	it('새 프로젝트를 고르면 만들기 창이 뜨고, 이름을 넣어 만들면 그 프로젝트가 선택된다', async () => {
		setToken('jwt');
		renderAt('/app/settings');
		await screen.findByText('shop');
		fireEvent.mouseDown(screen.getByRole('combobox', { name: '프로젝트' }));
		const option = (await screen.findByText('새 프로젝트')).closest('.ant-select-item-option');
		fireEvent.click(option!);
		const create = await screen.findByRole('button', { name: '만들기' });
		expect(create.hasAttribute('disabled')).toBe(true);
		fireEvent.change(screen.getByRole('textbox'), { target: { value: 'blog' } });
		fireEvent.click(create);
		await waitFor(() => expect(localStorage.getItem('relaydam.project')).toBe('11'));
	});

	it('메뉴를 접으면 로고·프로젝트가 숨고 아이콘만 남는다. 접힘은 기억된다', () => {
		setToken('jwt');
		renderAt('/app/events');
		fireEvent.click(screen.getByRole('button', { name: '메뉴 접기' }));
		expect(screen.queryByRole('link', { name: 'relaydam' })).toBeNull();
		expect(screen.queryByRole('combobox', { name: '프로젝트' })).toBeNull();
		expect(localStorage.getItem('relaydam.sidebar.collapsed')).toBe('1');
		fireEvent.click(screen.getByRole('button', { name: '메뉴 펼치기' }));
		expect(screen.getByRole('link', { name: 'relaydam' })).toBeDefined();
		expect(localStorage.getItem('relaydam.sidebar.collapsed')).toBe('0');
	});

	it('내 계정 → 사용량·조직 설정으로 간다', async () => {
		setToken('jwt');
		renderAt('/app/events');
		fireEvent.click(screen.getByRole('button', { name: '내 계정' }));
		expect(await screen.findByText('사용량')).toBeDefined();
		fireEvent.click(screen.getByText('조직 설정'));
		expect(await screen.findByText('준비 중')).toBeDefined();
	});

	it('로그아웃하면 토큰을 지우고 /login으로 간다', async () => {
		setToken('jwt');
		renderAt('/app/events');
		fireEvent.click(screen.getByRole('button', { name: '내 계정' }));
		fireEvent.click(await screen.findByText('로그아웃'));
		expect(localStorage.getItem('relaydam.token')).toBeNull();
		expect(await screen.findByRole('button', { name: /Google 계정으로 로그인/ })).toBeDefined();
	});

	it('접힘을 기억해 두면 처음부터 접힌 채로 뜬다', async () => {
		setToken('jwt');
		localStorage.setItem('relaydam.sidebar.collapsed', '1');
		renderAt('/app/events');
		expect(await screen.findByRole('button', { name: '메뉴 펼치기' })).toBeDefined();
		expect(screen.queryByRole('link', { name: 'relaydam' })).toBeNull();
	});

	it('프로젝트 만들기가 실패하면 백엔드 메시지를 보여주고 창은 남는다', async () => {
		server.use(http.post('/api/orgs/1/projects', () => HttpResponse.json({ code: 'plan_limit', message: 'free 플랜은 프로젝트 1개까지입니다.' }, { status: 403 })));
		setToken('jwt');
		renderAt('/app/settings');
		await screen.findByText('shop');
		fireEvent.mouseDown(screen.getByRole('combobox', { name: '프로젝트' }));
		fireEvent.click((await screen.findByText('새 프로젝트')).closest('.ant-select-item-option')!);
		fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'blog' } });
		fireEvent.click(screen.getByRole('button', { name: '만들기' }));
		expect(await screen.findByText('free 플랜은 프로젝트 1개까지입니다.')).toBeDefined();
		// 창은 그대로 열려 있다
		expect(screen.getByRole('textbox')).toBeDefined();
	});
});
