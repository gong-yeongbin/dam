import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { type Event, type EventFilter, listEvents, listSources } from '@/api/events';
import { useProject } from '@/auth/project';
import { Time } from '@/components/Time';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventSheet } from './EventSheet';
import { RejectedTable } from './RejectedTable';

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
	const switchView = (next: string) => {
		params.delete('id');
		if (next === 'rejected') params.set('view', 'rejected');
		else params.delete('view');
		setParams(params, { replace: true });
	};
	const sourceOptions = sources.data?.map((s) => ({ value: s.id, label: s.name }));
	// 날짜 입력은 브라우저 기본 datetime-local. 비우면 조건을 뺀다
	const toIso = (value: string) => (value ? new Date(value).toISOString() : undefined);

	return (
		<div>
			<div className="flex items-center pt-3">
				<h1 className="text-[26px] font-medium tracking-tight">이벤트</h1>
			</div>
			<Tabs value={view} onValueChange={switchView} className="mt-3">
				<TabsList variant="line">
					<TabsTrigger value="received">받은 요청</TabsTrigger>
					<TabsTrigger value="rejected">거부된 요청</TabsTrigger>
				</TabsList>
			</Tabs>

			{view === 'rejected' && current && <RejectedTable orgId={orgId} projectId={projectId} sourceOptions={sourceOptions} sourceName={sourceName} />}
			{view === 'received' && (
				<>
					<div className="mt-5 flex flex-wrap items-center gap-2">
						<SourceSelect options={sourceOptions} value={filter.source_id} loading={sources.isPending && enabled} onChange={(source_id) => changeFilter({ ...filter, source_id })} />
						<Input type="datetime-local" aria-label="받은 시각 부터" className="w-52" onChange={(e) => changeFilter({ ...filter, received_after: toIso(e.target.value) })} />
						<span className="text-muted-foreground">~</span>
						<Input type="datetime-local" aria-label="받은 시각 까지" className="w-52" onChange={(e) => changeFilter({ ...filter, received_before: toIso(e.target.value) })} />
						{pages.data && <span className="ml-auto text-[13px] text-muted-foreground">{rows.length.toLocaleString()}건</span>}
					</div>

					<div className="mt-3 rounded-lg bg-card">
						<Table className="text-[13px]">
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead className="w-[140px]">받은 시각</TableHead>
									<TableHead className="w-[160px]">소스</TableHead>
									<TableHead>요청</TableHead>
									<TableHead className="w-[100px] text-right">크기</TableHead>
									<TableHead className="w-[80px]">서명</TableHead>
									<TableHead className="w-[100px]">ID</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{rows.map((row: Event) => (
									<TableRow key={row.id} className="h-[42px] cursor-pointer" onClick={() => open(row.id)}>
										<TableCell>
											<Time iso={row.received_at} />
										</TableCell>
										<TableCell>{sourceName(row.source_id)}</TableCell>
										<TableCell>
											<span className="font-semibold">{row.method}</span> {row.path || '/'}
											{row.query ? `?${row.query}` : ''}
										</TableCell>
										<TableCell className="text-right">{row.size.toLocaleString()} B</TableCell>
										<TableCell>{row.verified ? '확인' : '-'}</TableCell>
										<TableCell className="text-muted-foreground">{row.id}</TableCell>
									</TableRow>
								))}
								{rows.length === 0 && (
									<TableRow className="hover:bg-transparent">
										<TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
											{!current ? '프로젝트를 먼저 만드세요.' : pages.isPending ? '불러오는 중' : '받은 이벤트가 없습니다. 소스 주소로 웹훅을 보내 보세요.'}
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
					{nextCursor && (
						<div className="mt-4 text-center">
							<Button variant="outline" onClick={() => setCursors([...cursors, nextCursor])} disabled={pages.isFetching}>
								더 보기
							</Button>
						</div>
					)}

					{openId && current && <EventSheet orgId={orgId} projectId={projectId} id={openId} sourceName={sourceName} onClose={() => open(null)} />}
				</>
			)}
		</div>
	);
}

// 소스 필터. null이 "모든 소스"다. 거부된 요청 탭도 같이 쓴다
export function SourceSelect({ options, value, loading, onChange }: { options: { value: number; label: string }[] | undefined; value: number | undefined; loading?: boolean; onChange: (id: number | undefined) => void }) {
	const items = [{ value: null, label: '모든 소스' }, ...(options ?? [])];
	return (
		<Select<number | null, false> items={items} value={value ?? null} disabled={loading} onValueChange={(next) => onChange(next ?? undefined)}>
			<SelectTrigger aria-label="소스" className="w-52">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{items.map((item) => (
					<SelectItem key={item.label} value={item.value}>
						{item.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
