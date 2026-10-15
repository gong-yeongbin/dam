import { useQuery } from '@tanstack/react-query';
import { Button, DatePicker, Empty, Segmented, Select, Space, Table, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { type Event, type EventFilter, listEvents, listSources } from '@/api/events';
import { useProject } from '@/auth/project';
import { Time } from '@/components/Time';
import { EventDrawer } from './EventDrawer';
import { RejectedTable } from './RejectedTable';

const { Title, Text } = Typography;

// 받은 웹훅 목록. 거부된 요청은 같은 화면의 탭(Hookdeck의 Requests와 같다). 행을 누르면 오른쪽에 상세.
// 열린 상세와 탭은 URL(?id=, ?view=rejected)에 둬 새로고침해도 유지된다
export function EventsPage() {
	const { current } = useProject();
	const [params, setParams] = useSearchParams();
	const [filter, setFilter] = useState<EventFilter>({});
	// "더 보기"로 이어 붙인 페이지들
	const [cursors, setCursors] = useState<string[]>([]);
	const openId = params.get('id');
	const view = params.get('view') === 'rejected' ? 'rejected' : 'received';

	const orgId = current?.org.id ?? 0;
	const projectId = current?.id ?? 0;
	const enabled = current !== null;

	const sources = useQuery({ queryKey: ['sources', orgId, projectId], queryFn: () => listSources(orgId, projectId), enabled });
	const pages = useQuery({
		queryKey: ['events', orgId, projectId, filter, cursors],
		queryFn: async () => {
			const first = await listEvents(orgId, projectId, filter);
			const rest = await Promise.all(cursors.map((cursor) => listEvents(orgId, projectId, { ...filter, cursor })));
			return [first, ...rest];
		},
		enabled,
		placeholderData: (previous) => previous,
	});
	const rows = pages.data?.flatMap((page) => page.data) ?? [];
	const nextCursor = pages.data?.at(-1)?.next_cursor ?? null;
	const sourceName = (id: number | null) => (id === null ? '삭제된 소스' : (sources.data?.find((s) => s.id === id)?.name ?? `#${id}`));

	const changeFilter = (next: EventFilter) => {
		setFilter(next);
		setCursors([]);
	};
	const open = (id: string | null) => {
		if (id === null) params.delete('id');
		else params.set('id', id);
		setParams(params, { replace: true });
	};
	const switchView = (next: 'received' | 'rejected') => {
		params.delete('id');
		if (next === 'rejected') params.set('view', 'rejected');
		else params.delete('view');
		setParams(params, { replace: true });
	};
	const sourceOptions = sources.data?.map((s) => ({ value: s.id, label: s.name }));

	return (
		<div>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
				<Title level={3} style={{ margin: 0 }}>
					이벤트
				</Title>
				<Segmented<'received' | 'rejected'>
					value={view}
					onChange={switchView}
					options={[
						{ value: 'received', label: '받은 요청' },
						{ value: 'rejected', label: '거부된 요청' },
					]}
				/>
			</div>
			{view === 'rejected' && current && <RejectedTable orgId={orgId} projectId={projectId} sourceOptions={sourceOptions} sourceName={sourceName} />}
			{view === 'received' && (
			<>
			<Space style={{ marginBottom: 16 }} wrap>
				<Select
					aria-label="소스"
					allowClear
					placeholder="모든 소스"
					style={{ width: 200 }}
					loading={sources.isPending && enabled}
					options={sourceOptions}
					value={filter.source_id}
					onChange={(source_id: number | undefined) => changeFilter({ ...filter, source_id })}
				/>
				<DatePicker.RangePicker
					showTime
					placeholder={['받은 시각 부터', '까지']}
					onChange={(range: [Dayjs | null, Dayjs | null] | null) => changeFilter({ ...filter, received_after: range?.[0]?.toISOString(), received_before: range?.[1]?.toISOString() })}
				/>
			</Space>

			<Table<Event>
				rowKey="id"
				size="middle"
				loading={pages.isPending && enabled}
				dataSource={rows}
				pagination={false}
				locale={{ emptyText: <Empty description={current ? '받은 이벤트가 없습니다. 소스 주소로 웹훅을 보내 보세요.' : '프로젝트를 먼저 만드세요.'} /> }}
				onRow={(row) => ({ onClick: () => open(row.id), style: { cursor: 'pointer' } })}
				columns={[
					{ title: '받은 시각', dataIndex: 'received_at', width: 140, render: (iso: string) => <Time iso={iso} /> },
					{ title: '소스', dataIndex: 'source_id', width: 160, render: (id: number | null) => sourceName(id) },
					{
						title: '요청',
						key: 'request',
						render: (_, row) => (
							<Text style={{ fontFamily: 'inherit' }}>
								<Text strong>{row.method}</Text> {row.path || '/'}
								{row.query ? `?${row.query}` : ''}
							</Text>
						),
					},
					{ title: '크기', dataIndex: 'size', width: 100, align: 'right', render: (size: number) => `${size.toLocaleString()} B` },
					{ title: '서명', dataIndex: 'verified', width: 80, render: (verified: boolean) => (verified ? '확인' : '-') },
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

			{openId && current && <EventDrawer orgId={orgId} projectId={projectId} id={openId} sourceName={sourceName} onClose={() => open(null)} />}
			</>
			)}
		</div>
	);
}
