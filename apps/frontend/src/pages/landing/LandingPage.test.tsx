import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setToken } from '@/auth/token';
import { LandingPage } from './LandingPage';

const renderLanding = () =>
	render(
		<MemoryRouter initialEntries={['/']}>
			<Routes>
				<Route path="/" element={<LandingPage />} />
				<Route path="/app" element={<p>대시보드</p>} />
				<Route path="/login" element={<p>로그인 화면</p>} />
			</Routes>
		</MemoryRouter>
	);

describe('LandingPage', () => {
	beforeEach(() => localStorage.clear());

	it('제목, 실제 이벤트 화면 조각, 기능 6개, 0원 요금, GitHub 링크를 보여준다', () => {
		renderLanding();
		expect(screen.getByRole('heading', { level: 1, name: /웹훅을 받아 두고/ })).toBeDefined();
		expect(screen.getAllByRole('group', { name: '이벤트 화면 예시' }).length).toBeGreaterThan(0);
		expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
			'받는 즉시 저장, 중복은 한 번만',
			'재시도는 연결마다 정합니다',
			'업체 서명을 확인하고, 우리 서명을 붙입니다',
			'목적지가 흔들리면 멈춰서 기다립니다',
			'실패한 건은 다시 보냅니다',
			'거부한 요청도 남깁니다',
		]);
		expect(screen.getByRole('heading', { level: 2, name: '0원으로 시작' })).toBeDefined();
		expect(screen.getByRole('link', { name: 'GitHub' }).getAttribute('href')).toContain('github.com');
	});

	it('로그인·시작하기·무료로 시작하기는 /login, 요금은 /pricing으로 간다', () => {
		renderLanding();
		expect(screen.getByRole('link', { name: '로그인' }).getAttribute('href')).toBe('/login');
		expect(screen.getByRole('link', { name: '시작하기' }).getAttribute('href')).toBe('/login');
		expect(screen.getByRole('link', { name: '무료로 시작하기' }).getAttribute('href')).toBe('/login');
		expect(screen.getByRole('link', { name: '요금' }).getAttribute('href')).toBe('/pricing');
		expect(screen.getByRole('link', { name: '요금 자세히 보기' }).getAttribute('href')).toBe('/pricing');
	});

	it('자주 묻는 질문은 고른 질문의 답만 보여준다', () => {
		renderLanding();
		expect(screen.getByText(/Free는 그 달 남은 웹훅을 받지 않고/)).toBeDefined();
		fireEvent.click(screen.getByRole('button', { name: '이벤트는 무엇을 세나요?' }));
		expect(screen.getByText(/받아서 저장한 웹훅 한 건이 이벤트 하나입니다/)).toBeDefined();
		expect(screen.queryByText(/Free는 그 달 남은 웹훅을 받지 않고/)).toBeNull();
	});

	it('curl 복사 버튼은 클립보드에 넣고 복사됨으로 바뀐다', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText } });
		renderLanding();
		fireEvent.click(screen.getByRole('button', { name: '복사' }));
		expect(writeText).toHaveBeenCalledWith(expect.stringContaining('curl -X POST'));
		expect(await screen.findByRole('button', { name: '복사됨' })).toBeDefined();
	});

	it('끝의 새 프로젝트 폼은 이름을 /login으로 넘긴다. 이름이 비면 못 보낸다', () => {
		renderLanding();
		const input = screen.getByLabelText('이름');
		const submit = screen.getByRole('button', { name: '만들고 시작하기' });
		fireEvent.change(input, { target: { value: '  ' } });
		expect(submit.hasAttribute('disabled')).toBe(true);
		fireEvent.change(input, { target: { value: 'blog' } });
		fireEvent.click(submit);
		expect(screen.getByText('로그인 화면')).toBeDefined();
	});

	it('이미 로그인돼 있으면 /app으로 보낸다', () => {
		setToken('jwt');
		renderLanding();
		expect(screen.getByText('대시보드')).toBeDefined();
		expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
	});

	it('자주 묻는 질문은 마우스를 올리거나 포커스만 가도 답이 바뀐다', () => {
		renderLanding();
		fireEvent.mouseEnter(screen.getByRole('button', { name: '플랜은 언제 바꿀 수 있나요?' }));
		expect(screen.getByText(/가입하면 Free로 시작합니다/)).toBeDefined();
		fireEvent.focus(screen.getByRole('button', { name: '이벤트는 무엇을 세나요?' }));
		expect(screen.getByText(/받아서 저장한 웹훅 한 건이 이벤트 하나입니다/)).toBeDefined();
	});

});
