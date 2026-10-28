import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { type BulkRetryStatus, bulkRetry, type DeliveryFilter, listDeliveries } from '@/api/deliveries';
import { listDestinations } from '@/api/destinations';
import type { Delivery, DeliveryStatus } from '@/api/events';
import { useProject } from '@/auth/project';
import { STATUS_LABEL, StatusTag } from '@/components/StatusTag';
import { Time } from '@/components/Time';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DeliverySheet } from './DeliverySheet';

const STATUSES = Object.keys(STATUS_LABEL) as DeliveryStatus[];
const BULK_STATUSES: BulkRetryStatus[] = ['dead', 'failed', 'canceled'];

// 목적지로 보낸 전달 목록. 상태·목적지로 거르고, 행을 누르면 오른쪽에 시도 기록.
// 이벤트 화면에서 넘어오면 ?event_id=로 그 이벤트의 전달만 본다. 열린 상세는 ?id=
export function DeliveriesPage() {
	const { current } = useProject();
	const [params, setParams] = useSearchParams();
	const [filter, setFilter] = useState<DeliveryFilter>({ event_id: params.get('event_id') ?? undefined });
	const [cursors, setCursors] = useState<string[]>([]);
	const [bulkOpen, setBulkOpen] = useState(false);
	const openId = params.get('id');

	const orgId = current?.org.id ?? 0;
	const projectId = current?.id ?? 0;
	const enabled = current !== null;

	const destinations = useQuery({ queryKey: ['destinations', orgId, projectId], queryFn: () => listDestinations(orgId, projectId), enabled });
	const pages = useQuery({
		queryKey: ['deliveries', orgId, projectId, filter, cursors],
		queryFn: async () => {
			const first = await listDeliveries(orgId, projectId, filter);
			const rest = await Promise.all(cursors.map((cursor) => listDeliveries(orgId, projectId, { ...filter, cursor })));
			return [first, ...rest];
		},
		enabled,
		placeholderData: (previous) => previous,
	});
	const rows = pages.data?.flatMap((page) => page.data) ?? [];
	const nextCursor = pages.data?.at(-1)?.next_cursor ?? null;
	const destinationName = (id: number | null) => (id === null ? '삭제된 목적지' : (destinations.data?.find((d) => d.id === id)?.name ?? `#${id}`));
	const destinationItems = [{ value: null as number | null, label: '모든 목적지' }, ...(destinations.data?.map((d) => ({ value: d.id as number | null, label: d.name })) ?? [])];

	const changeFilter = (next: DeliveryFilter) => {
		setFilter(next);
		setCursors([]);
	};
	const open = (id: string | null) => {
		if (id === null) params.delete('id');
		else params.set('id', id);
		setParams(params, { replace: true });
	};

	return (
		<div>
			<div className="flex items-center pt-3">
				<h1 className="text-[26px] font-medium tracking-tight">전달</h1>
				<Button size="sm" variant="outline" className="ml-auto" disabled={!current} onClick={() => setBulkOpen(true)}>
					일괄 재시도
				</Button>
			</div>

			<div className="mt-5 flex flex-wrap items-center gap-2">
				<Select<DeliveryStatus | null, false>
					items={[{ value: null, label: '모든 상태' }, ...STATUSES.map((s) => ({ value: s as DeliveryStatus | null, label: STATUS_LABEL[s].text }))]}
					value={filter.status ?? null}
					onValueChange={(status) => changeFilter({ ...filter, status: status ?? undefined })}
				>
					<SelectTrigger aria-label="상태" className="w-44">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={null}>모든 상태</SelectItem>
						{STATUSES.map((s) => (
							<SelectItem key={s} value={s}>
								{STATUS_LABEL[s].text}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select<number | null, false> items={destinationItems} value={filter.destination_id ?? null} disabled={destinations.isPending && enabled} onValueChange={(id) => changeFilter({ ...filter, destination_id: id ?? undefined })}>
					<SelectTrigger aria-label="목적지" className="w-52">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{destinationItems.map((item) => (
							<SelectItem key={item.label} value={item.value}>
								{item.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{filter.event_id && (
					<Button variant="secondary" size="sm" onClick={() => changeFilter({ ...filter, event_id: undefined })}>
						이벤트 #{filter.event_id}의 전달만 ×
					</Button>
				)}
				{pages.data && <span className="ml-auto text-[13px] text-muted-foreground">{rows.length.toLocaleString()}건</span>}
			</div>

			<div className="mt-3 rounded-lg bg-card">
				<Table className="text-[13px]">
					<TableHeader>
						<TableRow className="hover:bg-transparent">
							<TableHead className="w-[140px]">만든 시각</TableHead>
							<TableHead>목적지</TableHead>
							<TableHead className="w-[110px]">이벤트</TableHead>
							<TableHead className="w-[120px]">상태</TableHead>
							<TableHead className="w-[70px] text-right">시도</TableHead>
							<TableHead className="w-[160px]">마지막 응답</TableHead>
							<TableHead className="w-[140px]">다음 시도</TableHead>
							<TableHead className="w-[100px]">ID</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((row: Delivery) => (
							<TableRow key={row.id} className="h-[42px] cursor-pointer" onClick={() => open(row.id)}>
								<TableCell>
									<Time iso={row.created_at} />
								</TableCell>
								<TableCell>{destinationName(row.destination_id)}</TableCell>
								<TableCell className="text-muted-foreground">#{row.event_id}</TableCell>
								<TableCell>
									<StatusTag status={row.status} />
								</TableCell>
								<TableCell className="text-right">{row.attempt}</TableCell>
								<TableCell className="truncate">{row.last_status_code ?? row.last_error ?? '-'}</TableCell>
								<TableCell>{row.next_attempt_at ? <Time iso={row.next_attempt_at} /> : '-'}</TableCell>
								<TableCell className="text-muted-foreground">{row.id}</TableCell>
							</TableRow>
						))}
						{rows.length === 0 && (
							<TableRow className="hover:bg-transparent">
								<TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
									{!current ? '프로젝트를 먼저 만드세요.' : pages.isPending ? '불러오는 중' : '전달이 없습니다. 소스가 웹훅을 받으면 연결된 목적지마다 전달이 생깁니다.'}
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

			{openId && current && <DeliverySheet orgId={orgId} projectId={projectId} id={openId} destinationName={destinationName} onClose={() => open(null)} />}
			{current && <BulkRetryDialog open={bulkOpen} onOpenChange={setBulkOpen} orgId={orgId} projectId={projectId} destinationItems={destinationItems.slice(1)} />}
		</div>
	);
}

// 조건에 맞는 전달을 한꺼번에 pending으로 되돌린다. 상태는 필수
function BulkRetryDialog({ open, onOpenChange, orgId, projectId, destinationItems }: { open: boolean; onOpenChange: (open: boolean) => void; orgId: number; projectId: number; destinationItems: { value: number | null; label: string }[] }) {
	const client = useQueryClient();
	const [status, setStatus] = useState<BulkRetryStatus>('dead');
	const [destination, setDestination] = useState<number | null>(null);
	const [after, setAfter] = useState('');
	const [before, setBefore] = useState('');
	const toIso = (value: string) => (value ? new Date(value).toISOString() : undefined);
	const run = useMutation({
		mutationFn: () => bulkRetry(orgId, projectId, { status, destination_id: destination ?? undefined, created_after: toIso(after), created_before: toIso(before) }),
		onSuccess: async ({ count }) => {
			toast.success(`${count.toLocaleString()}건을 다시 보냅니다.`);
			onOpenChange(false);
			await client.invalidateQueries({ queryKey: ['deliveries'] });
		},
		onError: (error) => toast.error(errorMessage(error)),
	});
	const items = [{ value: null as number | null, label: '모든 목적지' }, ...destinationItems];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="font-sans">일괄 재시도</DialogTitle>
				</DialogHeader>
				<form
					className="space-y-4"
					onSubmit={(e) => {
						e.preventDefault();
						run.mutate();
					}}
				>
					<div>
						<label htmlFor="bulk-status" className="block text-sm font-medium">
							되돌릴 상태
						</label>
						<Select<BulkRetryStatus, false> items={BULK_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s].text }))} value={status} onValueChange={(s) => s && setStatus(s)}>
							<SelectTrigger id="bulk-status" className="mt-1.5 w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{BULK_STATUSES.map((s) => (
									<SelectItem key={s} value={s}>
										{STATUS_LABEL[s].text}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<label htmlFor="bulk-destination" className="block text-sm font-medium">
							목적지
						</label>
						<Select<number | null, false> items={items} value={destination} onValueChange={setDestination}>
							<SelectTrigger id="bulk-destination" className="mt-1.5 w-full">
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
					</div>
					<div className="flex items-center gap-2">
						<Input type="datetime-local" aria-label="만든 시각 부터" value={after} onChange={(e) => setAfter(e.target.value)} />
						<span className="text-muted-foreground">~</span>
						<Input type="datetime-local" aria-label="만든 시각 까지" value={before} onChange={(e) => setBefore(e.target.value)} />
					</div>
					<p className="text-sm text-muted-foreground">한 번에 최대 1,000건. 더 있으면 다시 누릅니다.</p>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							취소
						</Button>
						<Button type="submit" disabled={run.isPending}>
							다시 보내기
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
