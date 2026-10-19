import { Button, Typography } from 'antd';
import { Link, Navigate } from 'react-router';
import { getToken } from '@/auth/token';
import { PublicLayout } from '@/layout/PublicLayout';
import { colors } from '@/theme';
import { FlowDiagram } from './FlowDiagram';

const { Title, Paragraph, Text } = Typography;

// 실제로 만든 것만 적는다
const FEATURES = [
	{ title: '저장 먼저', body: '받는 즉시 저장, 중복은 한 번만' },
	{ title: '자동 재시도', body: '5분·10분·20분… 대시보드에서 재전송' },
	{ title: '서명 검증', body: '업체 서명을 확인하고 우리 서명을 붙여 전달' },
];

// 가입 후 실제 순서 그대로
const STEPS = [
	{ title: '소스 만들기', body: '받는 URL이 발급됩니다' },
	{ title: '목적지 등록', body: '고객 서버 주소를 적습니다' },
	{ title: '업체에 URL 등록', body: '업체 웹훅 설정에 넣으면 끝' },
];

// 흐름 그림과 같은 폭. 세 칸은 글 길이대로, 양 끝 정렬
const ROW = { display: 'grid', gridTemplateColumns: 'repeat(3, auto)', justifyContent: 'space-between', maxWidth: 780, margin: '72px auto 0', paddingTop: 40, borderTop: `1px solid ${colors.line}`, textAlign: 'left' } as const;

// 로그인 전 누구나 보는 한 장. 가운데 정렬, 강조는 흐름 그림의 relaydam 하나
export function LandingPage() {
	// 이미 로그인돼 있으면 대시보드로
	if (getToken()) return <Navigate to="/app" replace />;

	return (
		<PublicLayout>
			<div style={{ textAlign: 'center' }}>
				<Title level={1} style={{ fontSize: 44, lineHeight: 1.2, letterSpacing: '-0.02em', fontWeight: 700, margin: 0, whiteSpace: 'nowrap', color: colors.ink }}>
					웹훅 수신 게이트웨이
				</Title>
				<Paragraph style={{ fontSize: 18, lineHeight: 1.65, color: colors.muted, margin: '20px auto 0', whiteSpace: 'nowrap' }}>받은 웹훅을 저장하고, 고객 서버로 재시도하며 전달합니다.</Paragraph>

				<div style={{ maxWidth: 780, margin: '72px auto 0' }}>
					<FlowDiagram />
				</div>

				<div style={ROW}>
					{FEATURES.map((feature) => (
						<div key={feature.title}>
							<Title level={5} style={{ margin: 0, fontSize: 16, color: colors.ink }}>
								{feature.title}
							</Title>
							<Text style={{ display: 'block', marginTop: 6, fontSize: 15, lineHeight: 1.6, color: colors.muted }}>{feature.body}</Text>
						</div>
					))}
				</div>

				{/* 요금 페이지의 공통 기능 패널과 같은 흰 카드 */}
				<div style={{ ...ROW, borderTop: 'none', padding: '32px 40px', background: '#fff', border: `1px solid ${colors.line}`, borderRadius: 8 }}>
					{STEPS.map((step, i) => (
						<div key={step.title}>
							<Text style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.accent }}>{i + 1}단계</Text>
							<Title level={5} style={{ margin: '4px 0 0', fontSize: 16, color: colors.ink }}>
								{step.title}
							</Title>
							<Text style={{ display: 'block', marginTop: 6, fontSize: 15, lineHeight: 1.6, color: colors.muted }}>{step.body}</Text>
						</div>
					))}
				</div>

				<div style={{ marginTop: 72 }}>
					<Text style={{ display: 'block', fontSize: 16, color: colors.muted }}>Free는 월 1,000 이벤트, 보존 3일. 카드 없이 시작합니다.</Text>
					<Link to="/login">
						<Button type="primary" size="large" style={{ marginTop: 20 }}>
							무료로 시작하기
						</Button>
					</Link>
				</div>
			</div>
		</PublicLayout>
	);
}
