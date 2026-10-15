import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { PricingPage } from './PricingPage';

describe('PricingPage', () => {
	it('플랜 2개(Free·Team)의 이름·가격·보존일·초과 단가를 보여준다', () => {
		render(
			<MemoryRouter>
				<PricingPage />
			</MemoryRouter>
		);
		expect(screen.getByRole('heading', { level: 1, name: '요금' })).toBeDefined();
		for (const [name, price, retention] of [
			['Free', '0원', '보존 3일'],
			['Team', '49,000원', '보존 7일'],
		]) {
			expect(screen.getByText(name!)).toBeDefined();
			expect(screen.getByText(price!)).toBeDefined();
			expect(screen.getByText(retention!)).toBeDefined();
		}
		// 상단 바 1개 + 카드 2개
		expect(screen.getAllByRole('link', { name: '시작하기' }).map((a) => a.getAttribute('href'))).toEqual(['/login', '/login', '/login']);
		expect(screen.getByText('초과 10만 건당 10,000원부터')).toBeDefined();
		expect(screen.queryByText('Business')).toBeNull();
		expect(screen.getByText('초과 시 거부')).toBeDefined();
	});

	it('모든 플랜 공통 항목과 자주 묻는 질문 3개를 보여준다', () => {
		render(
			<MemoryRouter>
				<PricingPage />
			</MemoryRouter>
		);
		expect(screen.getByText('자동 재시도 무료')).toBeDefined();
		expect(screen.getByText('내부망 주소 차단')).toBeDefined();
		expect(screen.getByText('포함 이벤트를 넘으면 어떻게 되나요?')).toBeDefined();
		expect(screen.getByText('이벤트는 무엇을 세나요?')).toBeDefined();
	});
});
