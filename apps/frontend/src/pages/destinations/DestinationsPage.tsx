import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { createDestination, deleteDestination, type Destination, type DestinationBody, listDestinations, updateDestination } from '@/api/destinations';
import { useProject } from '@/auth/project';
import { Time } from '@/components/Time';
import { useDelayedOpen } from '@/components/useDelayedOpen';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DestinationForm } from './DestinationForm';

// 웹훅을 보낼 고객 서버. 행을 누르면 오른쪽에서 고치거나 지운다
export function DestinationsPage() {
	const { current } = useProject();
	const [params, setParams] = useSearchParams();
	const [creating, setCreating] = useState(false);
	const client = useQueryClient();
	const openId = params.get('id');
	const orgId = current?.org.id ?? 0;
	const projectId = current?.id ?? 0;
	const enabled = current !== null;

	const destinations = useQuery({ queryKey: ['destinations', orgId, projectId], queryFn: () => listDestinations(orgId, projectId), enabled });
	const create = useMutation({
		mutationFn: (body: DestinationBody) => createDestination(orgId, projectId, body),
		onSuccess: async () => {
			toast.success('목적지를 만들었습니다. 연결 화면에서 소스와 이어 주세요.');
			setCreating(false);
			await client.invalidateQueries({ queryKey: ['destinations'] });
		},
		onError: (error) => toast.error(errorMessage(error)),
	});
	const open = (id: number | null) => {
		if (id === null) params.delete('id');
		else params.set('id', String(id));
		setParams(params, { replace: true });
	};
	const rows = destinations.data ?? [];
	const selected = openId ? rows.find((d) => String(d.id) === openId) : undefined;

	return (
		<div>
			<div className="flex items-center pt-3">
				<h1 className="text-[26px] font-medium tracking-tight">목적지</h1>
				<Button size="sm" className="ml-auto" disabled={!current} onClick={() => setCreating(true)}>
					새 목적지
				</Button>
			</div>

			<div className="mt-5 rounded-lg bg-card">
				<Table className="text-[13px]">
					<TableHeader>
						<TableRow className="hover:bg-transparent">
							<TableHead className="w-[220px]">이름</TableHead>
							<TableHead>주소</TableHead>
							<TableHead className="w-[110px] text-right">동시 요청</TableHead>
							<TableHead className="w-[110px] text-right">타임아웃</TableHead>
							<TableHead className="w-[140px]">만든 시각</TableHead>
							<TableHead className="w-[80px]">ID</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((row: Destination) => (
							<TableRow key={row.id} className="h-[42px] cursor-pointer" onClick={() => open(row.id)}>
								<TableCell className="font-medium">{row.name}</TableCell>
								<TableCell className="font-mono text-xs">{row.url}</TableCell>
								<TableCell className="text-right">{row.concurrency}</TableCell>
								<TableCell className="text-right">{row.timeout_ms / 1000}초</TableCell>
								<TableCell>
									<Time iso={row.created_at} />
								</TableCell>
								<TableCell className="text-muted-foreground">{row.id}</TableCell>
							</TableRow>
						))}
						{rows.length === 0 && (
							<TableRow className="hover:bg-transparent">
								<TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
									{!current ? '프로젝트를 먼저 만드세요.' : destinations.isPending ? '불러오는 중' : '목적지가 없습니다. 웹훅을 받을 고객 서버 주소를 등록하세요.'}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{selected && current && <DestinationSheet key={selected.id} orgId={orgId} projectId={projectId} destination={selected} onClose={() => open(null)} />}
			<Dialog open={creating} onOpenChange={setCreating}>
				<DialogContent className="sm:max-w-[560px]">
					<DialogHeader>
						<DialogTitle className="font-sans">새 목적지</DialogTitle>
					</DialogHeader>
					<DestinationForm
						idPrefix="new-destination"
						submitLabel="만들기"
						pending={create.isPending}
						onSubmit={(body) => create.mutate(body)}
						footer={
							<Button type="button" variant="outline" onClick={() => setCreating(false)}>
								취소
							</Button>
						}
					/>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function DestinationSheet({ orgId, projectId, destination, onClose }: { orgId: number; projectId: number; destination: Destination; onClose: () => void }) {
	const client = useQueryClient();
	const open = useDelayedOpen();
	const [confirmDelete, setConfirmDelete] = useState(false);
	const refresh = () => client.invalidateQueries({ queryKey: ['destinations'] });
	const save = useMutation({
		mutationFn: (body: DestinationBody) => updateDestination(orgId, projectId, destination.id, body),
		onSuccess: async () => {
			toast.success('저장했습니다. 다음 전달부터 적용됩니다.');
			await refresh();
		},
		onError: (error) => toast.error(errorMessage(error)),
	});
	const remove = useMutation({
		mutationFn: () => deleteDestination(orgId, projectId, destination.id),
		onSuccess: async () => {
			toast.success('목적지를 지웠습니다. 남은 전달은 취소됩니다.');
			onClose();
			await refresh();
		},
		onError: (error) => toast.error(errorMessage(error)),
	});

	return (
		<Sheet open={open} onOpenChange={(next) => !next && onClose()}>
			<SheetContent className="overflow-y-auto data-[side=right]:sm:max-w-[600px]">
				<SheetHeader className="pr-10">
					<SheetTitle className="font-sans text-base font-semibold">{destination.name}</SheetTitle>
				</SheetHeader>
				<div className="space-y-6 px-4 pb-6">
					<DestinationForm idPrefix={`destination-${destination.id}`} destination={destination} submitLabel="저장" pending={save.isPending} onSubmit={(body) => save.mutate(body)} />
					<div>
						<Button type="button" size="sm" variant="destructive" onClick={() => setConfirmDelete(true)}>
							목적지 삭제
						</Button>
					</div>
				</div>
				<AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle className="font-sans">이 목적지를 지울까요?</AlertDialogTitle>
							<AlertDialogDescription>이어진 연결이 같이 지워지고, 아직 보내지 않은 전달은 취소됩니다. 받은 이벤트는 남습니다.</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>그대로 두기</AlertDialogCancel>
							<AlertDialogAction
								variant="destructive"
								onClick={() => {
									setConfirmDelete(false);
									remove.mutate();
								}}
							>
								지우기
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</SheetContent>
		</Sheet>
	);
}
