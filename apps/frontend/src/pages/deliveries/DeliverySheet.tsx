import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Fragment, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { cancelDelivery, type DeliveryAttempt, getDelivery, retryDelivery, TRIGGER_LABEL } from '@/api/deliveries';
import { StatusTag } from '@/components/StatusTag';
import { Time, formatTime } from '@/components/Time';
import { useDelayedOpen } from '@/components/useDelayedOpen';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Props = { orgId: number; projectId: number; id: string; destinationName: (id: number | null) => string; onClose: () => void };

// 전달 하나와 그 시도 기록. 다시 보내기는 시도 횟수를 이어 가고, 취소는 예정된 재시도를 멈춘다
export function DeliverySheet({ orgId, projectId, id, destinationName, onClose }: Props) {
	const client = useQueryClient();
	const open = useDelayedOpen();
	const [confirmCancel, setConfirmCancel] = useState(false);
	const [expanded, setExpanded] = useState<string | null>(null);
	const query = useQuery({ queryKey: ['delivery', orgId, projectId, id], queryFn: () => getDelivery(orgId, projectId, id) });
	const refresh = async () => {
		await client.invalidateQueries({ queryKey: ['delivery', orgId, projectId, id] });
		await client.invalidateQueries({ queryKey: ['deliveries'] });
	};
	const retry = useMutation({
		mutationFn: () => retryDelivery(orgId, projectId, id),
		onSuccess: async () => {
			toast.success('다시 보냅니다. 시도 기록에 이어집니다.');
			await refresh();
		},
		onError: (error) => toast.error(errorMessage(error)),
	});
	const cancel = useMutation({
		mutationFn: () => cancelDelivery(orgId, projectId, id),
		onSuccess: async () => {
			toast.success('취소했습니다. 더 보내지 않습니다.');
			await refresh();
		},
		onError: (error) => toast.error(errorMessage(error)),
	});

	const d = query.data;
	const cancelable = d !== undefined && ['pending', 'failed', 'held'].includes(d.status);
	return (
		<Sheet open={open} onOpenChange={(next) => !next && onClose()}>
			<SheetContent className="overflow-y-auto data-[side=right]:sm:max-w-[640px]">
				<SheetHeader className="flex-row items-center justify-between pr-10">
					<SheetTitle className="font-sans text-base font-semibold">{d ? `전달 #${d.id}` : '전달'}</SheetTitle>
					<div className="flex gap-2">
						<Button size="sm" variant="outline" disabled={!cancelable || cancel.isPending} onClick={() => setConfirmCancel(true)}>
							취소
						</Button>
						<Button size="sm" disabled={!d || d.status === 'pending' || retry.isPending} onClick={() => retry.mutate()}>
							다시 보내기
						</Button>
					</div>
				</SheetHeader>
				<AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle className="font-sans">예정된 재시도를 취소할까요?</AlertDialogTitle>
							<AlertDialogDescription>이 전달은 더 보내지 않습니다. 나중에 다시 보내기로 되살릴 수 있습니다.</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>그대로 두기</AlertDialogCancel>
							<AlertDialogAction
								variant="destructive"
								onClick={() => {
									setConfirmCancel(false);
									cancel.mutate();
								}}
							>
								취소하기
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				<div className="px-4 pb-6">
					{query.isError && (
						<Alert variant="destructive">
							<AlertTitle>{errorMessage(query.error)}</AlertTitle>
						</Alert>
					)}
					{d && (
						<>
							<dl className="grid grid-cols-[88px_1fr_88px_1fr] gap-x-3 gap-y-2 rounded-lg bg-muted/60 p-4 text-[13px]">
								<dt className="text-muted-foreground">목적지</dt>
								<dd>{destinationName(d.destination_id)}</dd>
								<dt className="text-muted-foreground">이벤트</dt>
								<dd>
									<Link to={`/app/events?id=${d.event_id}`} className="text-primary underline-offset-4 hover:underline">
										#{d.event_id}
									</Link>
								</dd>
								<dt className="text-muted-foreground">상태</dt>
								<dd>
									<StatusTag status={d.status} />
								</dd>
								<dt className="text-muted-foreground">시도</dt>
								<dd>{d.attempt}회</dd>
								<dt className="text-muted-foreground">만든 시각</dt>
								<dd>{formatTime(d.created_at)}</dd>
								<dt className="text-muted-foreground">다음 시도</dt>
								<dd>{d.next_attempt_at ? formatTime(d.next_attempt_at) : '-'}</dd>
								<dt className="text-muted-foreground">마지막 응답</dt>
								<dd className="col-span-3 break-all">{d.last_status_code ?? d.last_error ?? '-'}</dd>
							</dl>

							<h2 className="mt-5 text-sm font-semibold">시도 기록 {d.attempts.length}</h2>
							<Table className="mt-2 text-[13px]">
								<TableHeader>
									<TableRow className="hover:bg-transparent">
										<TableHead className="w-[50px]">#</TableHead>
										<TableHead>시각</TableHead>
										<TableHead>계기</TableHead>
										<TableHead>응답</TableHead>
										<TableHead className="text-right">소요</TableHead>
										<TableHead className="w-[80px]" />
									</TableRow>
								</TableHeader>
								<TableBody>
									{d.attempts.map((a: DeliveryAttempt) => (
										<Fragment key={a.id}>
											<TableRow className="h-[42px]">
												<TableCell>{a.attempt_no}</TableCell>
												<TableCell>
													<Time iso={a.attempted_at} />
												</TableCell>
												<TableCell>{TRIGGER_LABEL[a.trigger]}</TableCell>
												<TableCell className={a.status_code !== null && a.status_code < 300 ? 'text-ok' : 'text-bad'}>{a.status_code ?? a.error ?? '-'}</TableCell>
												<TableCell className="text-right">{a.duration_ms.toLocaleString()} ms</TableCell>
												<TableCell>
													{a.response_body && (
														<Button variant="ghost" size="xs" aria-expanded={expanded === a.id} onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
															본문
														</Button>
													)}
												</TableCell>
											</TableRow>
											{expanded === a.id && (
												<TableRow className="hover:bg-transparent">
													<TableCell colSpan={6} className="bg-muted/60">
														<pre className="max-h-60 overflow-auto break-all whitespace-pre-wrap">{a.response_body}</pre>
													</TableCell>
												</TableRow>
											)}
										</Fragment>
									))}
									{d.attempts.length === 0 && (
										<TableRow className="hover:bg-transparent">
											<TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
												아직 보내지 않았습니다
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
