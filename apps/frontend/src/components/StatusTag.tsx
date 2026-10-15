import { Tag } from 'antd';
import type { DeliveryStatus } from '@/api/events';

// 전달 상태 배지. 색과 글자를 같이 써서 색만으로 구분하지 않는다
const LABEL: Record<DeliveryStatus, { text: string; color: string }> = {
	pending: { text: '대기', color: 'default' },
	succeeded: { text: '성공', color: 'success' },
	failed: { text: '재시도 대기', color: 'warning' },
	dead: { text: '실패', color: 'error' },
	canceled: { text: '취소', color: 'default' },
	held: { text: '보류', color: 'processing' },
};

export function StatusTag({ status }: { status: DeliveryStatus }) {
	const { text, color } = LABEL[status];
	return (
		<Tag color={color} style={{ marginInlineEnd: 0 }}>
			{text}
		</Tag>
	);
}
