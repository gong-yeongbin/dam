import type { DeliveryStatus } from '@/api/events';
import { Badge } from '@/components/ui/badge';

// 전달 상태 배지. 색과 글자를 같이 써서 색만으로 구분하지 않는다
export const STATUS_LABEL: Record<DeliveryStatus, { text: string; className: string }> = {
	pending: { text: '대기', className: 'bg-muted text-foreground' },
	succeeded: { text: '성공', className: 'bg-ok-bg text-ok' },
	failed: { text: '재시도 대기', className: 'bg-warn-bg text-warn' },
	dead: { text: '실패', className: 'bg-bad-bg text-bad' },
	canceled: { text: '취소', className: 'bg-muted text-muted-foreground' },
	held: { text: '보류', className: 'bg-warn-bg text-warn' },
};

export function StatusTag({ status }: { status: DeliveryStatus }) {
	const { text, className } = STATUS_LABEL[status];
	return (
		<Badge variant="secondary" className={className}>
			{text}
		</Badge>
	);
}
