import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { createSource, ingressUrl, listSources, type Source, type SourceBody } from '@/api/sources';
import { useProject } from '@/auth/project';
import { Time } from '@/components/Time';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SourceForm } from './SourceForm';
import { SourceSheet } from './SourceSheet';

// 주소 복사. HTTPS·localhost에서만 된다
export function CopyButton({ text, label }: { text: string; label: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<Button
			type="button"
			variant="outline"
			size="xs"
			aria-label={label}
			onClick={async (e) => {
				e.stopPropagation();
				await navigator.clipboard.writeText(text);
				setCopied(true);
				setTimeout(() => setCopied(false), 1500);
			}}
		>
			{copied ? '복사됨' : '복사'}
		</Button>
	);
}

// 웹훅을 받는 주소. 소스마다 고유 주소 하나. 행을 누르면 오른쪽에서 고치고 주소를 새로 받거나 지운다
export function SourcesPage() {
	const { current } = useProject();
	const [params, setParams] = useSearchParams();
	const [creating, setCreating] = useState(false);
	const client = useQueryClient();
	const openId = params.get('id');
	const orgId = current?.org.id ?? 0;
	const projectId = current?.id ?? 0;
	const enabled = current !== null;

	const sources = useQuery({ queryKey: ['sources', orgId, projectId], queryFn: () => listSources(orgId, projectId), enabled });
	const create = useMutation({
		mutationFn: (body: SourceBody) => createSource(orgId, projectId, body),
		onSuccess: async (created) => {
			toast.success(`소스를 만들었습니다. 받는 주소를 업체 설정에 넣으세요.`);
			setCreating(false);
			await client.invalidateQueries({ queryKey: ['sources'] });
			open(created.id);
		},
		onError: (error) => toast.error(errorMessage(error)),
	});
	const open = (id: number | null) => {
		if (id === null) params.delete('id');
		else params.set('id', String(id));
		setParams(params, { replace: true });
	};
	const rows = sources.data ?? [];
	const selected = openId ? rows.find((s) => String(s.id) === openId) : undefined;

	return (
		<div>
			<div className="flex items-center pt-3">
				<h1 className="text-[26px] font-medium tracking-tight">소스</h1>
				<Button size="sm" className="ml-auto" disabled={!current} onClick={() => setCreating(true)}>
					새 소스
				</Button>
			</div>

			<div className="mt-5 rounded-lg bg-card">
				<Table className="text-[13px]">
					<TableHeader>
						<TableRow className="hover:bg-transparent">
							<TableHead className="w-[220px]">이름</TableHead>
							<TableHead>받는 주소</TableHead>
							<TableHead className="w-[200px]">서명 검증</TableHead>
							<TableHead className="w-[140px]">만든 시각</TableHead>
							<TableHead className="w-[80px]">ID</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((row: Source) => (
							<TableRow key={row.id} className="h-[42px] cursor-pointer" onClick={() => open(row.id)}>
								<TableCell className="font-medium">{row.name}</TableCell>
								<TableCell>
									<span className="mr-2 font-mono text-xs">/in/{row.slug}</span>
									<CopyButton text={ingressUrl(row.slug)} label={`${row.name} 주소 복사`} />
								</TableCell>
								<TableCell>{row.signature_config ? <span>켜짐 · {row.signature_config.header}</span> : <span className="text-muted-foreground">꺼짐</span>}</TableCell>
								<TableCell>
									<Time iso={row.created_at} />
								</TableCell>
								<TableCell className="text-muted-foreground">{row.id}</TableCell>
							</TableRow>
						))}
						{rows.length === 0 && (
							<TableRow className="hover:bg-transparent">
								<TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
									{!current ? '프로젝트를 먼저 만드세요.' : sources.isPending ? '불러오는 중' : '소스가 없습니다. 소스를 만들면 웹훅을 받을 주소가 발급됩니다.'}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{selected && current && <SourceSheet key={selected.id} orgId={orgId} projectId={projectId} source={selected} onClose={() => open(null)} />}
			<Dialog open={creating} onOpenChange={setCreating}>
				<DialogContent className="sm:max-w-[560px]">
					<DialogHeader>
						<DialogTitle className="font-sans">새 소스</DialogTitle>
					</DialogHeader>
					<SourceForm
						idPrefix="new-source"
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
