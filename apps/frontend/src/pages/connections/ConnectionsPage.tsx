import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { type Connection, createConnection, DEFAULT_RETRY, describeRetry, listConnections, type RetryRule } from '@/api/connections';
import { listDestinations } from '@/api/destinations';
import { listSources } from '@/api/sources';
import { useProject } from '@/auth/project';
import { Time } from '@/components/Time';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConnectionSheet } from './ConnectionSheet';
import { RetryFields } from './RetryFields';

// 소스 → 목적지 연결. 재시도 설정은 연결마다. 행을 누르면 오른쪽에서 고치고, 일시 정지·삭제한다
export function ConnectionsPage() {
	const { current } = useProject();
	const [params, setParams] = useSearchParams();
	const [creating, setCreating] = useState(false);
	const openId = params.get('id');
	const orgId = current?.org.id ?? 0;
	const projectId = current?.id ?? 0;
	const enabled = current !== null;

	const sources = useQuery({ queryKey: ['sources', orgId, projectId], queryFn: () => listSources(orgId, projectId), enabled });
	const destinations = useQuery({ queryKey: ['destinations', orgId, projectId], queryFn: () => listDestinations(orgId, projectId), enabled });
	const connections = useQuery({ queryKey: ['connections', orgId, projectId], queryFn: () => listConnections(orgId, projectId), enabled });

	const sourceName = (id: number) => sources.data?.find((s) => s.id === id)?.name ?? `#${id}`;
	const destinationName = (id: number) => destinations.data?.find((d) => d.id === id)?.name ?? `#${id}`;
	const open = (id: number | null) => {
		if (id === null) params.delete('id');
		else params.set('id', String(id));
		setParams(params, { replace: true });
	};
	const rows = connections.data ?? [];
	const selected = openId ? rows.find((c) => String(c.id) === openId) : undefined;

	return (
		<div>
			<div className="flex items-center pt-3">
				<h1 className="text-[26px] font-medium tracking-tight">연결</h1>
				<Button size="sm" className="ml-auto" disabled={!current} onClick={() => setCreating(true)}>
					새 연결
				</Button>
			</div>

			<div className="mt-5 rounded-lg bg-card">
				<Table className="text-[13px]">
					<TableHeader>
						<TableRow className="hover:bg-transparent">
							<TableHead>소스</TableHead>
							<TableHead>목적지</TableHead>
							<TableHead className="w-[220px]">재시도</TableHead>
							<TableHead className="w-[110px]">상태</TableHead>
							<TableHead className="w-[140px]">만든 시각</TableHead>
							<TableHead className="w-[80px]">ID</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((row: Connection) => (
							<TableRow key={row.id} className="h-[42px] cursor-pointer" onClick={() => open(row.id)}>
								<TableCell>{sourceName(row.source_id)}</TableCell>
								<TableCell>{destinationName(row.destination_id)}</TableCell>
								<TableCell>{describeRetry(row)}</TableCell>
								<TableCell>{row.paused_at ? <Badge className="bg-warn-bg text-warn">일시 정지</Badge> : <Badge className="bg-ok-bg text-ok">보내는 중</Badge>}</TableCell>
								<TableCell>
									<Time iso={row.created_at} />
								</TableCell>
								<TableCell className="text-muted-foreground">{row.id}</TableCell>
							</TableRow>
						))}
						{rows.length === 0 && (
							<TableRow className="hover:bg-transparent">
								<TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
									{!current ? (
										'프로젝트를 먼저 만드세요.'
									) : connections.isPending ? (
										'불러오는 중'
									) : (
										<>
											연결이 없습니다. 소스와 목적지를 만든 뒤 이어 주세요.{' '}
											<Link to="/app/sources" className="text-primary underline-offset-4 hover:underline">
												소스
											</Link>
											{' · '}
											<Link to="/app/destinations" className="text-primary underline-offset-4 hover:underline">
												목적지
											</Link>
										</>
									)}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{selected && current && <ConnectionSheet key={selected.id} orgId={orgId} projectId={projectId} connection={selected} sourceName={sourceName} destinationName={destinationName} onClose={() => open(null)} />}
			{current && <CreateDialog open={creating} onOpenChange={setCreating} orgId={orgId} projectId={projectId} sources={sources.data ?? []} destinations={destinations.data ?? []} />}
		</div>
	);
}

type Named = { id: number; name: string };

function CreateDialog({ open, onOpenChange, orgId, projectId, sources, destinations }: { open: boolean; onOpenChange: (open: boolean) => void; orgId: number; projectId: number; sources: Named[]; destinations: Named[] }) {
	const client = useQueryClient();
	const [sourceId, setSourceId] = useState<number | null>(null);
	const [destinationId, setDestinationId] = useState<number | null>(null);
	const [retry, setRetry] = useState<RetryRule>(DEFAULT_RETRY);
	const create = useMutation({
		mutationFn: () => createConnection(orgId, projectId, { source_id: sourceId!, destination_id: destinationId!, ...retry }),
		onSuccess: async () => {
			toast.success('연결했습니다. 이제 이 소스로 오는 웹훅이 목적지로 갑니다.');
			onOpenChange(false);
			setSourceId(null);
			setDestinationId(null);
			setRetry(DEFAULT_RETRY);
			await client.invalidateQueries({ queryKey: ['connections'] });
		},
		onError: (error) => toast.error(errorMessage(error)),
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="font-sans">새 연결</DialogTitle>
				</DialogHeader>
				<form
					className="space-y-4"
					onSubmit={(e) => {
						e.preventDefault();
						create.mutate();
					}}
				>
					<NamedSelect id="new-connection-source" label="소스" placeholder="소스를 고르세요" items={sources} value={sourceId} onChange={setSourceId} emptyHint="소스가 없습니다. 소스 화면에서 먼저 만드세요." />
					<NamedSelect id="new-connection-destination" label="목적지" placeholder="목적지를 고르세요" items={destinations} value={destinationId} onChange={setDestinationId} emptyHint="목적지가 없습니다. 목적지 화면에서 먼저 만드세요." />
					<RetryFields idPrefix="new-connection" value={retry} onChange={setRetry} />
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							취소
						</Button>
						<Button type="submit" disabled={sourceId === null || destinationId === null || create.isPending}>
							연결하기
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function NamedSelect({ id, label, placeholder, items, value, onChange, emptyHint }: { id: string; label: string; placeholder: string; items: Named[]; value: number | null; onChange: (id: number | null) => void; emptyHint: string }) {
	return (
		<div>
			<label htmlFor={id} className="block text-sm font-medium">
				{label}
			</label>
			<Select<number | null, false> items={items.map((i) => ({ value: i.id as number | null, label: i.name }))} value={value} onValueChange={onChange} disabled={items.length === 0}>
				<SelectTrigger id={id} className="mt-1.5 w-full">
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{items.map((item) => (
						<SelectItem key={item.id} value={item.id}>
							{item.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{items.length === 0 && <p className="mt-1.5 text-sm text-muted-foreground">{emptyHint}</p>}
		</div>
	);
}
