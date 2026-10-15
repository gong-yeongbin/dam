import { Button, Layout, Typography } from 'antd';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { colors } from '@/theme';

const { Text } = Typography;
const SIDE = '0 48px';

// 상단 메뉴. 페이지가 생기면 여기 경로만 바꾼다
const NAV = [
	{ to: '/developers', label: '개발자' },
	{ to: '/docs', label: '문서' },
	{ to: '/pricing', label: '요금' },
];

// 로그인 전 화면(랜딩·요금)의 공통 틀. 상단 바 + 푸터
export function PublicLayout({ children }: { children: ReactNode }) {
	const { pathname } = useLocation();
	return (
		<Layout style={{ minHeight: '100vh', background: colors.bg }}>
			{/* 로고 왼쪽, 메뉴 가운데, 버튼 오른쪽 */}
			<Layout.Header style={{ background: 'transparent', height: 64, lineHeight: '64px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: SIDE }}>
				<Link to="/" style={{ color: colors.ink, fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' }}>
					relaydam
				</Link>
				{/* 지금 보고 있는 페이지면 진하게 */}
				<nav style={{ display: 'flex', gap: 32 }}>
					{NAV.map((item) => (
						<Link key={item.to} to={item.to} style={{ color: pathname === item.to ? colors.ink : colors.muted, fontWeight: pathname === item.to ? 600 : 500, fontSize: 15 }}>
							{item.label}
						</Link>
					))}
				</nav>
				<span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 24 }}>
					<Link to="/login" style={{ color: colors.ink, fontSize: 15, fontWeight: 500 }}>
						로그인
					</Link>
					<Link to="/login">
						<Button type="primary">시작하기</Button>
					</Link>
				</span>
			</Layout.Header>

			<Layout.Content style={{ maxWidth: 1040, width: '100%', margin: '0 auto', padding: '88px 48px 96px' }}>{children}</Layout.Content>

			<Layout.Footer style={{ background: 'transparent', display: 'flex', justifyContent: 'space-between', padding: '24px 48px', borderTop: `1px solid ${colors.line}`, fontSize: 14, color: colors.muted }}>
				<Text style={{ color: colors.muted }}>© 2026 relaydam</Text>
				<a href="https://github.com/gong-yeongbin/hookbuffer" target="_blank" rel="noreferrer" style={{ color: colors.muted }}>
					GitHub
				</a>
			</Layout.Footer>
		</Layout>
	);
}

// 아직 없는 공개 페이지 자리
export function ComingSoon({ title }: { title: string }) {
	return (
		<PublicLayout>
			<div style={{ textAlign: 'center' }}>
				<Text style={{ fontSize: 28, fontWeight: 700, color: colors.ink }}>{title}</Text>
				<Text style={{ display: 'block', marginTop: 12, fontSize: 16, color: colors.muted }}>준비 중입니다.</Text>
			</div>
		</PublicLayout>
	);
}
