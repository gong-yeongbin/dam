import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { App } from './App';

describe('App', () => {
	it('/ 는 랜딩이다', () => {
		localStorage.clear();
		render(
			<MemoryRouter initialEntries={['/']}>
				<App />
			</MemoryRouter>
		);
		expect(screen.getByRole('heading', { level: 1, name: '웹훅 수신 게이트웨이' })).toBeDefined();
	});

	it('/login 은 로그인이다', () => {
		localStorage.clear();
		render(
			<MemoryRouter initialEntries={['/login']}>
				<App />
			</MemoryRouter>
		);
		expect(screen.getByRole('button', { name: /Google 계정으로 로그인/ })).toBeDefined();
	});

	it('/developers·/docs 는 준비 중이다', () => {
		localStorage.clear();
		render(
			<MemoryRouter initialEntries={['/docs']}>
				<App />
			</MemoryRouter>
		);
		expect(screen.getByText('준비 중입니다.')).toBeDefined();
		expect(screen.getByRole('link', { name: '개발자' }).getAttribute('href')).toBe('/developers');
	});
});
