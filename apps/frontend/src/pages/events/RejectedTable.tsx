import { useQuery } from '@tanstack/react-query';
import { Fragment, useState } from 'react';
import { type RejectedFilter, type RejectedRequest, type RejectionReason, listRejected, REASON_LABEL } from '@/api/rejected';
import { Time } from '@/components/Time';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SourceSelect } from './EventsPage';

type Props = { orgId: number; projectId: number; sourceOptions: { value: number; label: string }[] | undefined; sourceName: (id: number | null) => string };

const REASONS = [{ value: null as RejectionReason | null, label: '모든 사유' }, ...Object.entries(REASON_LABEL).map(([value, label]) => ({ value: value as RejectionReason, label }))];

// 인그레스가 거부한 요청. "왜 안 들어오지" 확인용. 행의 "헤더"를 누르면 받은 헤더가 펼쳐진다
export function RejectedTable({ orgId, projectId, sourceOptions, sourceName }: Props) {
	const [filter, setFilter] = useState<RejectedFilter>({});
	const [cursors, setCursors] = useState<string[]>([]);
	const [expanded, setExpanded] = useState<string | null>(null);
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
			<div className="mt-5 flex flex-wrap items-center gap-2">
				<SourceSelect options={sourceOptions} value={filter.source_id} onChange={(source_id) => changeFilter({ ...filter, source_id })} />
				<Select<RejectionReason | null, false> items={REASONS} value={filter.reason ?? null} onValueChange={(reason) => changeFilter({ ...filter, reason: reason ?? undefined })}>
					<SelectTrigger aria-label="사유" className="w-44">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{REASONS.map((item) => (
							<SelectItem key={item.label} value={item.value}>
								{item.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="mt-3 rounded-lg bg-card">
				<Table className="text-[13px]">
					<TableHeader>
						<TableRow className="hover:bg-transparent">
							<TableHead className="w-[140px]">받은 시각</TableHead>
							<TableHead className="w-[160px]">소스</TableHead>
							<TableHead>사유</TableHead>
							<TableHead className="w-[100px] text-right">크기</TableHead>
							<TableHead className="w-[100px]">ID</TableHead>
							<TableHead className="w-[80px]" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((row: RejectedRequest) => (
							<Fragment key={row.id}>
								<TableRow className="h-[42px]">
									<TableCell>
										<Time iso={row.received_at} />
									</TableCell>
									<TableCell>{sourceName(row.source_id)}</TableCell>
									<TableCell className="text-destructive">{REASON_LABEL[row.reason]}</TableCell>
									<TableCell className="text-right">{row.size.toLocaleString()} B</TableCell>
									<TableCell className="text-muted-foreground">{row.id}</TableCell>
									<TableCell>
										<Button variant="ghost" size="xs" aria-expanded={expanded === row.id} onClick={() => setExpanded(expanded === row.id ? null : row.id)}>
											헤더
										</Button>
									</TableCell>
								</TableRow>
								{expanded === row.id && (
									<TableRow className="hover:bg-transparent">
										<TableCell colSpan={6} className="bg-muted/60">
											<pre className="break-all whitespace-pre-wrap">
												{Object.entries(row.headers)
													.map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
													.join('\n') || '(헤더 없음)'}
											</pre>
										</TableCell>
									</TableRow>
								)}
							</Fragment>
						))}
						{rows.length === 0 && (
							<TableRow className="hover:bg-transparent">
								<TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
									{pages.isPending ? '불러오는 중' : '거부된 요청이 없습니다.'}
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
		</div>
	);
}
