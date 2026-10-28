import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { type Connection, deleteConnection, pauseConnection, type RetryRule, updateConnection } from '@/api/connections';
import { useDelayedOpen } from '@/components/useDelayedOpen';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { RetryFields } from './RetryFields';

type Props = { orgId: number; projectId: number; connection: Connection; sourceName: (id: number) => string; destinationName: (id: number) => string; onClose: () => void };

// 연결 하나. 재시도 설정을 고치고, 일시 정지(보류)·재개, 삭제한다
export function ConnectionSheet({ orgId, projectId, connection, sourceName, destinationName, onClose }: Props) {
	const client = useQueryClient();
	const open = useDelayedOpen();
	const [retry, setRetry] = useState<RetryRule>({ retry_strategy: connection.retry_strategy, retry_interval_ms: connection.retry_interval_ms, retry_count: connection.retry_count });
	const [confirmDelete, setConfirmDelete] = useState(false);
	const refresh = () => client.invalidateQueries({ queryKey: ['connections'] });
	const save = useMutation({
		mutationFn: () => updateConnection(orgId, projectId, connection.id, retry),
		onSuccess: async () => {
			toast.success('재시도 설정을 저장했습니다. 다음 시도부터 적용됩니다.');
			await refresh();
		},
		onError: (error) => toast.error(errorMessage(error)),
	});
	const paused = connection.paused_at !== null;
	const pause = useMutation({
		mutationFn: () => pauseConnection(orgId, projectId, connection.id, !paused),
		onSuccess: async () => {
			toast.success(paused ? '재개했습니다. 보류해 둔 전달부터 다시 보냅니다.' : '일시 정지했습니다. 들어오는 웹훅은 보류됩니다.');
			await refresh();
		},
		onError: (error) => toast.error(errorMessage(error)),
	});
	const remove = useMutation({
		mutationFn: () => deleteConnection(orgId, projectId, connection.id),
		onSuccess: async () => {
			toast.success('연결을 지웠습니다. 남은 전달은 취소됩니다.');
			onClose();
			await refresh();
		},
		onError: (error) => toast.error(errorMessage(error)),
	});

	return (
		<Sheet open={open} onOpenChange={(next) => !next && onClose()}>
			<SheetContent className="overflow-y-auto data-[side=right]:sm:max-w-[560px]">
				<SheetHeader className="pr-10">
					<SheetTitle className="font-sans text-base font-semibold">
						{sourceName(connection.source_id)} → {destinationName(connection.destination_id)}
					</SheetTitle>
				</SheetHeader>
				<div className="space-y-6 px-4 pb-6">
					<form
						className="space-y-4"
						onSubmit={(e) => {
							e.preventDefault();
							save.mutate();
						}}
					>
						<h2 className="text-sm font-semibold">재시도</h2>
						<RetryFields idPrefix={`connection-${connection.id}`} value={retry} onChange={setRetry} />
						<Button type="submit" size="sm" disabled={save.isPending}>
							저장
						</Button>
					</form>

					<div className="rounded-lg bg-muted/60 p-4 text-sm">
						<p className="font-medium">{paused ? '일시 정지 중' : '보내는 중'}</p>
						<p className="mt-1 text-muted-foreground">{paused ? '들어오는 웹훅은 저장만 하고 보류해 둡니다. 재개하면 보류한 것부터 보냅니다.' : '일시 정지하면 들어오는 웹훅을 저장만 하고 보내지 않습니다. 배포 중에 씁니다.'}</p>
						<Button type="button" size="sm" variant="outline" className="mt-3" disabled={pause.isPending} onClick={() => pause.mutate()}>
							{paused ? '재개' : '일시 정지'}
						</Button>
					</div>

					<div>
						<Button type="button" size="sm" variant="destructive" onClick={() => setConfirmDelete(true)}>
							연결 삭제
						</Button>
					</div>
				</div>

				<AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle className="font-sans">이 연결을 지울까요?</AlertDialogTitle>
							<AlertDialogDescription>이 소스로 오는 웹훅은 더 이상 이 목적지로 가지 않습니다. 아직 보내지 않은 전달은 취소됩니다. 소스와 목적지는 남습니다.</AlertDialogDescription>
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
