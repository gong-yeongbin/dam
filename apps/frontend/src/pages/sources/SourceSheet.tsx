import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { deleteSource, ingressUrl, rotateSourceSlug, type Source, type SourceBody, updateSource } from '@/api/sources';
import { useDelayedOpen } from '@/components/useDelayedOpen';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SourceForm } from './SourceForm';
import { CopyButton } from './SourcesPage';

type Props = { orgId: number; projectId: number; source: Source; onClose: () => void };

// 소스 하나. 받는 주소(복사·새로 발급), 이름·서명 수정, 삭제
export function SourceSheet({ orgId, projectId, source, onClose }: Props) {
	const client = useQueryClient();
	const open = useDelayedOpen();
	const [confirm, setConfirm] = useState<'rotate' | 'delete' | null>(null);
	const refresh = () => client.invalidateQueries({ queryKey: ['sources'] });
	const save = useMutation({
		mutationFn: (body: SourceBody) => updateSource(orgId, projectId, source.id, body),
		onSuccess: async () => {
			toast.success('저장했습니다.');
			await refresh();
		},
		onError: (error) => toast.error(errorMessage(error)),
	});
	const rotate = useMutation({
		mutationFn: () => rotateSourceSlug(orgId, projectId, source.id),
		onSuccess: async () => {
			toast.success('새 주소를 발급했습니다. 옛 주소는 바로 404입니다. 업체 설정을 바꾸세요.');
			await refresh();
		},
		onError: (error) => toast.error(errorMessage(error)),
	});
	const remove = useMutation({
		mutationFn: () => deleteSource(orgId, projectId, source.id),
		onSuccess: async () => {
			toast.success('소스를 지웠습니다. 받은 이벤트는 "삭제된 소스"로 남습니다.');
			onClose();
			await refresh();
		},
		onError: (error) => toast.error(errorMessage(error)),
	});
	const url = ingressUrl(source.slug);

	return (
		<Sheet open={open} onOpenChange={(next) => !next && onClose()}>
			<SheetContent className="overflow-y-auto data-[side=right]:sm:max-w-[600px]">
				<SheetHeader className="pr-10">
					<SheetTitle className="font-sans text-base font-semibold">{source.name}</SheetTitle>
				</SheetHeader>
				<div className="space-y-6 px-4 pb-6">
					<div className="rounded-lg bg-muted/60 p-4">
						<p className="text-sm font-medium">받는 주소</p>
						<div className="mt-1.5 flex items-center gap-2">
							<Input readOnly value={url} className="h-8 bg-card font-mono text-xs" aria-label="받는 주소" />
							<CopyButton text={url} label="받는 주소 복사" />
						</div>
						<p className="mt-2 text-sm text-muted-foreground">업체 웹훅 설정에 이 주소를 넣습니다. POST·PUT·PATCH·DELETE를 받고, 뒤에 경로·쿼리를 붙여도 됩니다.</p>
						<Button type="button" size="sm" variant="outline" className="mt-3" disabled={rotate.isPending} onClick={() => setConfirm('rotate')}>
							주소 새로 발급
						</Button>
					</div>

					<SourceForm idPrefix={`source-${source.id}`} source={source} submitLabel="저장" pending={save.isPending} onSubmit={(body) => save.mutate(body)} />

					<div>
						<Button type="button" size="sm" variant="destructive" onClick={() => setConfirm('delete')}>
							소스 삭제
						</Button>
					</div>
				</div>

				<AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle className="font-sans">{confirm === 'rotate' ? '주소를 새로 발급할까요?' : '이 소스를 지울까요?'}</AlertDialogTitle>
							<AlertDialogDescription>{confirm === 'rotate' ? '옛 주소로 오는 요청은 바로 404가 됩니다. 업체 설정을 새 주소로 바꿔야 합니다.' : '이 주소로 오는 웹훅은 더 받지 않고, 이어진 연결도 지워집니다. 이미 받은 이벤트는 남습니다.'}</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>그대로 두기</AlertDialogCancel>
							<AlertDialogAction
								variant={confirm === 'delete' ? 'destructive' : 'default'}
								onClick={() => {
									const action = confirm;
									setConfirm(null);
									if (action === 'rotate') rotate.mutate();
									else remove.mutate();
								}}
							>
								{confirm === 'rotate' ? '새로 발급' : '지우기'}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</SheetContent>
		</Sheet>
	);
}
