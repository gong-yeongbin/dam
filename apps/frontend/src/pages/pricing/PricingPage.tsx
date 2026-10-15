import { CheckOutlined } from '@ant-design/icons';
import { Button, Card, Collapse, Typography } from 'antd';
import { Link } from 'react-router';
import { PublicLayout } from '@/layout/PublicLayout';
import { colors } from '@/theme';

const { Title, Paragraph, Text } = Typography;

// 값은 plan.md 결정 11과 백엔드 plan-limits.ts와 같다. 바꾸면 셋을 같이 바꾼다.
// 초과 단가의 구간 할인(500만 건 이후)은 여기 안 적는다. 볼 사람이 거의 없다.
// business는 team과 보존일만 달라 요금표에서 뺐다(2026-10-15). 차별화는 billing 때 정한다
const PLANS = [
	{ name: 'Free', price: '0원', rows: ['월 1,000 이벤트', '초과 시 거부', '멤버 1명', '프로젝트 1개', '소스·목적지 각 3개', '보존 3일'] },
	{ name: 'Team', price: '49,000원', rows: ['월 10,000 이벤트', '초과 10만 건당 10,000원부터', '멤버 무제한', '프로젝트 무제한', '소스·목적지 무제한', '보존 7일'] },
];

// 플랜과 무관하게 전부 들어 있는 것
const INCLUDED = ['자동 재시도 무료', '서명 검증', '대시보드에서 재전송', '내부망 주소 차단'];

const FAQ = [
	{ q: '포함 이벤트를 넘으면 어떻게 되나요?', a: 'Free는 그 달 남은 웹훅을 받지 않고 429로 거부합니다. 보낸 쪽이 실패를 알고 다시 보냅니다. Team은 초과분만큼 10만 건당 10,000원부터 청구되고, 많이 쓸수록 단가가 내려갑니다.' },
	{ q: '플랜은 언제 바꿀 수 있나요?', a: '가입하면 Free로 시작합니다. 플랜 변경과 결제는 준비 중입니다.' },
	{ q: '이벤트는 무엇을 세나요?', a: '받아서 저장한 웹훅 한 건이 이벤트 하나입니다. 연결된 목적지가 여러 곳이어도 한 건이고, 같은 웹훅이 다시 오면 세지 않습니다. 재시도는 세지 않고, 대시보드에서 리플레이하면 새 이벤트로 셉니다.' },
];

export function PricingPage() {
	return (
		<PublicLayout>
			<div style={{ textAlign: 'center' }}>
				<Title level={1} style={{ fontSize: 40, letterSpacing: '-0.02em', margin: 0, color: colors.ink }}>
					요금
				</Title>
				<Paragraph style={{ fontSize: 18, color: colors.muted, margin: '16px 0 0' }}>월 정액에 이벤트가 포함되고, 넘으면 건당 종량입니다.</Paragraph>
			</div>

			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 24, marginTop: 48, maxWidth: 680, marginLeft: 'auto', marginRight: 'auto' }}>
				{PLANS.map((plan) => (
					<Card key={plan.name} style={{ borderColor: colors.line }} styles={{ body: { padding: 28 } }}>
						<Text style={{ fontSize: 15, fontWeight: 600, color: colors.muted }}>{plan.name}</Text>
						<div style={{ marginTop: 8 }}>
							<Text style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', color: colors.ink }}>{plan.price}</Text>
							<Text style={{ fontSize: 14, color: colors.muted, marginLeft: 4 }}>/ 월</Text>
						</div>
						<ul style={{ listStyle: 'none', padding: 0, margin: '24px 0 0', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 15, color: colors.ink }}>
							{plan.rows.map((row) => (
								<li key={row}>{row}</li>
							))}
						</ul>
						<Link to="/login">
							<Button type="primary" block style={{ marginTop: 28 }}>
								시작하기
							</Button>
						</Link>
					</Card>
				))}
			</div>

			<div style={{ maxWidth: 680, margin: '24px auto 0', padding: '16px 24px', background: '#fff', border: `1px solid ${colors.line}`, borderRadius: 8 }}>
				<Text style={{ display: 'block', fontSize: 13, color: colors.muted, marginBottom: 10 }}>모든 플랜 공통</Text>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px 24px' }}>
					{INCLUDED.map((item) => (
						<Text key={item} style={{ fontSize: 15, color: colors.ink }}>
							<CheckOutlined style={{ color: colors.accent, marginRight: 8 }} />
							{item}
						</Text>
					))}
				</div>
			</div>

			<div style={{ maxWidth: 680, margin: '72px auto 0' }}>
				<Title level={4} style={{ margin: '0 0 16px', fontSize: 20, color: colors.ink }}>
					자주 묻는 질문
				</Title>
				<Collapse ghost expandIconPosition="end" items={FAQ.map((item, i) => ({ key: String(i), label: <Text style={{ fontSize: 15, fontWeight: 600, color: colors.ink }}>{item.q}</Text>, children: <Paragraph style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: colors.muted }}>{item.a}</Paragraph> }))} />
			</div>
		</PublicLayout>
	);
}
