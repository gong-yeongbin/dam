import { useQuery } from '@tanstack/react-query';
import { Button, Empty, Select, Space, Table, Typography } from 'antd';
import { useState } from 'react';
import { type RejectedFilter, type RejectedRequest, type RejectionReason, listRejected, REASON_LABEL } from '@/api/rejected';
import { Time } from '@/components/Time';

const { Text } = Typography;

type Props = { orgId: number; projectId: number; sourceOptions: { value: number; label: string }[] | undefined; sourceName: (id: number | null) => string };

// 인그레스가 거부한 요청. "왜 안 들어오지" 확인용. 행을 펼치면 받은 헤더
export function RejectedTable({ orgId, projectId, sourceOptions, sourceName }: Props) {
	const [filter, setFilter] = useState<RejectedFilter>({});
	const [cursors, setCursors] = useState<string[]>([]);
	const pages = useQuery({
		queryKey: ['rejected', orgId, projectId, filter, cursors],
		queryFn: async () => {
			const first = await listRejected(orgId, projectId, filter);
			const rest = await Promise.all(cursors.map((cursor) => listRejected(orgId, projectId, { ...filter, cursor })));
			return [first, ...rest];
		},
		placeholderData: (previous) => previous,
	});
	const rows = pages.data?.flatMap((page) => page.data) ?? [];
	const nextCursor = pages.data?.at(-1)?.next_cursor ?? null;
	const changeFilter = (next: RejectedFilter) => {
		setFilter(next);
		setCursors([]);
	};

	return (
		<div>
			<Space style={{ marginBottom: 16 }} wrap>
				<Select aria-label="소스" allowClear placeholder="모든 소스" style={{ width: 200 }} options={sourceOptions} value={filter.source_id} onChange={(source_id: number | undefined) => changeFilter({ ...filter, source_id })} />
				<Select
					aria-label="사유"
					allowClear
					placeholder="모든 사유"
					style={{ width: 180 }}
					options={Object.entries(REASON_LABEL).map(([value, label]) => ({ value, label }))}
					value={filter.reason}
					onChange={(reason: RejectionReason | undefined) => changeFilter({ ...filter, reason })}
				/>
			</Space>
			<Table<RejectedRequest>
				rowKey="id"
				size="middle"
				loading={pages.isPending}
				dataSource={rows}
				pagination={false}
				locale={{ emptyText: <Empty description="거부된 요청이 없습니다." /> }}
				expandable={{
					expandedRowRender: (row) => <pre style={{ margin: 0, fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{Object.entries(row.headers).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n') || '(헤더 없음)'}</pre>,
				}}
				columns={[
					{ title: '받은 시각', dataIndex: 'received_at', width: 140, render: (iso: string) => <Time iso={iso} /> },
					{ title: '소스', dataIndex: 'source_id', width: 160, render: (id: number | null) => sourceName(id) },
					{ title: '사유', dataIndex: 'reason', render: (reason: RejectionReason) => <Text type="danger">{REASON_LABEL[reason]}</Text> },
					{ title: '크기', dataIndex: 'size', width: 100, align: 'right', render: (size: number) => `${size.toLocaleString()} B` },
					{ title: 'ID', dataIndex: 'id', width: 100 },
				]}
			/>
			{nextCursor && (
				<div style={{ textAlign: 'center', marginTop: 16 }}>
					<Button onClick={() => setCursors([...cursors, nextCursor])} loading={pages.isFetching}>
						더 보기
					</Button>
				</div>
			)}
		</div>
	);
}
