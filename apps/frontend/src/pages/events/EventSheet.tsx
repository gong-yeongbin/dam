import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { type Delivery, getEvent, getEventBody, replayEvent } from '@/api/events';
import { errorMessage } from '@/api/client';
import { StatusTag } from '@/components/StatusTag';
import { Time, formatTime } from '@/components/Time';
import { useDelayedOpen } from '@/components/useDelayedOpen';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Props = { orgId: number; projectId: number; id: string; sourceName: (id: number | null) => string; onClose: () => void };

const headerLines = (headers: Record<string, string | string[]>) =>
	Object.entries(headers)
		.map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
		.join('\n');

// 이벤트 상세. 요청(헤더·본문)과 전달 목록. 리플레이는 새 이벤트를 만든다
export function EventSheet({ orgId, projectId, id, sourceName, onClose }: Props) {
	const client = useQueryClient();
	const [confirming, setConfirming] = useState(false);
	const open = useDelayedOpen();
	const event = useQuery({ queryKey: ['event', orgId, projectId, id], queryFn: () => getEvent(orgId, projectId, id) });
	const body = useQuery({ queryKey: ['event-body', orgId, projectId, id], queryFn: () => getEventBody(orgId, projectId, id) });
	const replay = useMutation({
		mutationFn: () => replayEvent(orgId, projectId, id),
		onSuccess: async (created) => {
			toast.success(`새 이벤트 #${created.id}로 다시 보냈습니다.`);
			await client.invalidateQueries({ queryKey: ['events'] });
		},
		onError: (error) => toast.error(errorMessage(error)),
	});

	const e = event.data;
	return (
		<Sheet open={open} onOpenChange={(next) => !next && onClose()}>
			<SheetContent className="overflow-y-auto data-[side=right]:sm:max-w-[640px]">
				<SheetHeader className="flex-row items-center justify-between pr-10">
					<SheetTitle className="font-sans text-base font-semibold">{e ? `이벤트 #${e.id}` : '이벤트'}</SheetTitle>
					<Button size="sm" disabled={!e || replay.isPending} onClick={() => setConfirming(true)}>
						리플레이
					</Button>
				</SheetHeader>
				<AlertDialog open={confirming} onOpenChange={setConfirming}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle className="font-sans">이 웹훅을 새 이벤트로 다시 보낼까요?</AlertDialogTitle>
							<AlertDialogDescription>지금 연결된 목적지 전부로 갑니다. 사용량에 들어갑니다.</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>취소</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => {
									setConfirming(false);
									replay.mutate();
								}}
							>
								다시 보내기
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				<div className="px-4 pb-6">
					{event.isError && (
						<Alert variant="destructive">
							<AlertTitle>{errorMessage(event.error)}</AlertTitle>
						</Alert>
					)}
					{e && (
						<>
							<dl className="grid grid-cols-[88px_1fr_88px_1fr] gap-x-3 gap-y-2 rounded-lg bg-muted/60 p-4 text-[13px]">
								<dt className="text-muted-foreground">받은 시각</dt>
								<dd className="col-span-3">
									{formatTime(e.received_at)} (<Time iso={e.received_at} />)
								</dd>
								<dt className="text-muted-foreground">소스</dt>
								<dd>{sourceName(e.source_id)}</dd>
								<dt className="text-muted-foreground">보낸 IP</dt>
								<dd>{e.source_ip ?? '-'}</dd>
								<dt className="text-muted-foreground">요청</dt>
								<dd className="col-span-3">
									<span className="font-semibold">{e.method}</span> {e.path || '/'}
									{e.query ? `?${e.query}` : ''}
								</dd>
								<dt className="text-muted-foreground">크기</dt>
								<dd>{e.size.toLocaleString()} B</dd>
								<dt className="text-muted-foreground">서명</dt>
								<dd>{e.verified ? '확인됨' : '검증 안 함'}</dd>
								<dt className="text-muted-foreground">멱등 키</dt>
								<dd className="col-span-3 break-all">
									<code className="text-xs">{e.idempotency_key}</code>
								</dd>
							</dl>

							<Tabs defaultValue="deliveries" className="mt-5">
								<TabsList variant="line">
									<TabsTrigger value="deliveries">전달 {e.deliveries.length}</TabsTrigger>
									<TabsTrigger value="headers">헤더</TabsTrigger>
									<TabsTrigger value="body">본문</TabsTrigger>
								</TabsList>
								<TabsContent value="deliveries" className="mt-3">
									<p className="mb-2 text-right">
										<Link to={`/app/deliveries?event_id=${e.id}`} className="text-[13px] text-primary underline-offset-4 hover:underline">
											전달 화면에서 보기
										</Link>
									</p>
									<Table className="text-[13px]">
										<TableHeader>
											<TableRow className="hover:bg-transparent">
												<TableHead>목적지</TableHead>
												<TableHead>상태</TableHead>
												<TableHead className="text-right">시도</TableHead>
												<TableHead>마지막 응답</TableHead>
												<TableHead>다음 시도</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{e.deliveries.map((d: Delivery) => (
												<TableRow key={d.id} className="h-[42px]">
													<TableCell>{d.destination_id === null ? '삭제된 목적지' : `#${d.destination_id}`}</TableCell>
													<TableCell>
														<StatusTag status={d.status} />
													</TableCell>
													<TableCell className="text-right">{d.attempt}</TableCell>
													<TableCell>{d.last_status_code ?? d.last_error ?? '-'}</TableCell>
													<TableCell>{d.next_attempt_at ? <Time iso={d.next_attempt_at} /> : '-'}</TableCell>
												</TableRow>
											))}
											{e.deliveries.length === 0 && (
												<TableRow>
													<TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
														전달이 없습니다
													</TableCell>
												</TableRow>
											)}
										</TableBody>
									</Table>
								</TabsContent>
								<TabsContent value="headers" className="mt-3">
									<pre className="text-[13px] break-all whitespace-pre-wrap">{headerLines(e.headers)}</pre>
								</TabsContent>
								<TabsContent value="body" className="mt-3">
									{body.isPending ? <p className="text-muted-foreground">불러오는 중</p> : <pre className="max-h-[480px] overflow-auto text-[13px] break-all whitespace-pre-wrap">{body.data || '(비어 있음)'}</pre>}
								</TabsContent>
							</Tabs>
						</>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
