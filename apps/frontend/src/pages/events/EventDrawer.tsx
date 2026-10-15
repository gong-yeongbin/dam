import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Descriptions, Drawer, Popconfirm, Space, Table, Tabs, Typography, message } from 'antd';
import { type Delivery, getEvent, getEventBody, replayEvent } from '@/api/events';
import { errorMessage } from '@/api/client';
import { StatusTag } from '@/components/StatusTag';
import { Time, formatTime } from '@/components/Time';

const { Text } = Typography;

type Props = { orgId: number; projectId: number; id: string; sourceName: (id: number | null) => string; onClose: () => void };

// 이벤트 상세. 요청(헤더·본문)과 전달 목록. 리플레이는 새 이벤트를 만든다
export function EventDrawer({ orgId, projectId, id, sourceName, onClose }: Props) {
	const client = useQueryClient();
	const event = useQuery({ queryKey: ['event', orgId, projectId, id], queryFn: () => getEvent(orgId, projectId, id) });
	const body = useQuery({ queryKey: ['event-body', orgId, projectId, id], queryFn: () => getEventBody(orgId, projectId, id) });
	const replay = useMutation({
		mutationFn: () => replayEvent(orgId, projectId, id),
		onSuccess: async (created) => {
			void message.success(`새 이벤트 #${created.id}로 다시 보냈습니다.`);
			await client.invalidateQueries({ queryKey: ['events'] });
		},
		onError: (error) => void message.error(errorMessage(error)),
	});

	const e = event.data;
	return (
		<Drawer
			open
			width={640}
			onClose={onClose}
			title={e ? `이벤트 #${e.id}` : '이벤트'}
			extra={
				<Popconfirm title="이 웹훅을 새 이벤트로 다시 보낼까요?" description="지금 연결된 목적지 전부로 갑니다. 사용량에 들어갑니다." okText="다시 보내기" cancelText="취소" onConfirm={() => replay.mutate()}>
					<Button type="primary" loading={replay.isPending} disabled={!e}>
						리플레이
					</Button>
				</Popconfirm>
			}
		>
			{event.isError && <Alert type="error" showIcon message={errorMessage(event.error)} />}
			{e && (
				<Space direction="vertical" size={20} style={{ width: '100%' }}>
					<Descriptions size="small" column={2} bordered>
						<Descriptions.Item label="받은 시각" span={2}>
							{formatTime(e.received_at)} (<Time iso={e.received_at} />)
						</Descriptions.Item>
						<Descriptions.Item label="소스">{sourceName(e.source_id)}</Descriptions.Item>
						<Descriptions.Item label="보낸 IP">{e.source_ip ?? '-'}</Descriptions.Item>
						<Descriptions.Item label="요청" span={2}>
							<Text strong>{e.method}</Text> {e.path || '/'}
							{e.query ? `?${e.query}` : ''}
						</Descriptions.Item>
						<Descriptions.Item label="크기">{e.size.toLocaleString()} B</Descriptions.Item>
						<Descriptions.Item label="서명">{e.verified ? '확인됨' : '검증 안 함'}</Descriptions.Item>
						<Descriptions.Item label="멱등 키" span={2}>
							<Text code style={{ wordBreak: 'break-all' }}>
								{e.idempotency_key}
							</Text>
						</Descriptions.Item>
					</Descriptions>

					<Tabs
						items={[
							{
								key: 'deliveries',
								label: `전달 ${e.deliveries.length}`,
								children: (
									<Table<Delivery>
										rowKey="id"
										size="small"
										pagination={false}
										dataSource={e.deliveries}
										locale={{ emptyText: '전달이 없습니다' }}
										columns={[
											{ title: '목적지', dataIndex: 'destination_id', render: (d: number | null) => (d === null ? '삭제된 목적지' : `#${d}`) },
											{ title: '상태', dataIndex: 'status', render: (s: Delivery['status']) => <StatusTag status={s} /> },
											{ title: '시도', dataIndex: 'attempt', align: 'right' },
											{ title: '마지막 응답', key: 'last', render: (_, d) => d.last_status_code ?? d.last_error ?? '-' },
											{ title: '다음 시도', dataIndex: 'next_attempt_at', render: (iso: string | null) => (iso ? <Time iso={iso} /> : '-') },
										]}
									/>
								),
							},
							{
								key: 'headers',
								label: '헤더',
								children: <pre style={{ margin: 0, fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{Object.entries(e.headers).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n')}</pre>,
							},
							{
								key: 'body',
								label: '본문',
								children: body.isPending ? <Text type="secondary">불러오는 중</Text> : <pre style={{ margin: 0, fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 480, overflow: 'auto' }}>{body.data || '(비어 있음)'}</pre>,
							},
						]}
					/>
				</Space>
			)}
		</Drawer>
	);
}
