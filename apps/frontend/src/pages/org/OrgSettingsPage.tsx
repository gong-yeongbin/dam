import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { cancelInvitation, changeMemberRole, createInvitation, getMe, type Invitation, listInvitations, listMembers, type Member, removeMember, ROLE_LABEL, updateOrg } from '@/api/orgs';
import { useProject } from '@/auth/project';
import { clearToken } from '@/auth/token';
import { formatTime, Time } from '@/components/Time';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const PLAN_LABEL = { free: 'Free', team: 'Team', business: 'Business' } as const;
type InviteRole = 'admin' | 'member';

// 지금 프로젝트가 속한 조직의 설정. 이름·플랜, 멤버(역할·내보내기·나가기), 초대. 바꾸는 건 admin 이상만
export function OrgSettingsPage() {
	const { current, orgs } = useProject();
	const org = current?.org ?? orgs[0] ?? null;
	if (!org) return <p className="pt-4 text-muted-foreground">조직이 없습니다.</p>;
	return <OrgSettings key={org.id} org={org} />;
}

function OrgSettings({ org }: { org: { id: number; name: string; plan: 'free' | 'team' | 'business'; role: 'owner' | 'admin' | 'member' } }) {
	const client = useQueryClient();
	const navigate = useNavigate();
	const isAdmin = org.role !== 'member';
	const [name, setName] = useState(org.name);
	const [email, setEmail] = useState('');
	const [role, setRole] = useState<InviteRole>('member');
	const [confirm, setConfirm] = useState<{ kind: 'remove' | 'leave'; userId: number; name: string } | null>(null);

	const me = useQuery({ queryKey: ['me'], queryFn: getMe });
	const members = useQuery({ queryKey: ['members', org.id], queryFn: () => listMembers(org.id) });
	// 만료 여부는 렌더 밖(select)에서 계산한다
	const invitations = useQuery({ queryKey: ['invitations', org.id], queryFn: () => listInvitations(org.id), enabled: isAdmin, select: (list) => list.map((inv) => ({ ...inv, expired: new Date(inv.expires_at).getTime() < Date.now() })) });
	const fail = (error: unknown) => toast.error(errorMessage(error));

	const rename = useMutation({
		mutationFn: () => updateOrg(org.id, name.trim()),
		onSuccess: async () => {
			toast.success('조직 이름을 바꿨습니다.');
			await client.invalidateQueries({ queryKey: ['projects'] });
		},
		onError: fail,
	});
	const setMemberRole = useMutation({
		mutationFn: ({ userId, role }: { userId: number; role: InviteRole }) => changeMemberRole(org.id, userId, role),
		onSuccess: async () => {
			toast.success('역할을 바꿨습니다.');
			await client.invalidateQueries({ queryKey: ['members', org.id] });
		},
		onError: fail,
	});
	const remove = useMutation({
		mutationFn: (userId: number) => removeMember(org.id, userId),
		onSuccess: async (_, userId) => {
			if (userId === me.data?.id) {
				toast.success('조직에서 나왔습니다.');
				clearToken();
				void navigate('/login', { replace: true });
				return;
			}
			toast.success('내보냈습니다.');
			await client.invalidateQueries({ queryKey: ['members', org.id] });
		},
		onError: fail,
	});
	const invite = useMutation({
		mutationFn: () => createInvitation(org.id, email.trim(), role),
		onSuccess: async () => {
			toast.success(`${email.trim()}에게 초대 메일을 보냈습니다. 같은 이메일로 로그인해 수락하면 들어옵니다.`);
			setEmail('');
			await client.invalidateQueries({ queryKey: ['invitations', org.id] });
		},
		onError: fail,
	});
	const cancel = useMutation({
		mutationFn: (id: number) => cancelInvitation(org.id, id),
		onSuccess: async () => {
			toast.success('초대를 취소했습니다.');
			await client.invalidateQueries({ queryKey: ['invitations', org.id] });
		},
		onError: fail,
	});

	return (
		<div className="max-w-[880px]">
			<div className="flex items-center gap-3 pt-3">
				<h1 className="text-[26px] font-medium tracking-tight">조직 설정</h1>
				<Badge variant="secondary">{PLAN_LABEL[org.plan]}</Badge>
				<span className="text-[13px] text-muted-foreground">내 역할 {ROLE_LABEL[org.role]}</span>
			</div>

			<section className="mt-6 rounded-lg bg-card p-5">
				<h2 className="text-sm font-semibold">이름</h2>
				<form
					className="mt-3 flex items-center gap-2"
					onSubmit={(e) => {
						e.preventDefault();
						rename.mutate();
					}}
				>
					<Input aria-label="조직 이름" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} disabled={!isAdmin} className="max-w-[360px]" />
					<Button type="submit" size="sm" disabled={!isAdmin || !name.trim() || name.trim() === org.name || rename.isPending}>
						저장
					</Button>
				</form>
				{org.plan === 'free' && <p className="mt-3 text-sm text-muted-foreground">Free는 멤버 1명·프로젝트 1개입니다. 플랜 변경과 결제는 준비 중입니다.</p>}
			</section>

			<section className="mt-4 rounded-lg bg-card">
				<h2 className="px-5 pt-5 text-sm font-semibold">멤버 {members.data?.length ?? ''}</h2>
				<Table className="mt-3 text-[13px]">
					<TableHeader>
						<TableRow className="hover:bg-transparent">
							<TableHead className="pl-5">이름</TableHead>
							<TableHead>이메일</TableHead>
							<TableHead className="w-[160px]">역할</TableHead>
							<TableHead className="w-[140px]">들어온 날</TableHead>
							<TableHead className="w-[100px]" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{(members.data ?? []).map((m: Member) => {
							const isMe = m.user_id === me.data?.id;
							const editable = isAdmin && m.role !== 'owner' && !isMe;
							return (
								<TableRow key={m.user_id} className="h-[42px]">
									<TableCell className="pl-5 font-medium">
										{m.user.name}
										{isMe && <span className="ml-1.5 text-muted-foreground">(나)</span>}
									</TableCell>
									<TableCell>{m.user.email}</TableCell>
									<TableCell>
										{editable ? (
											<Select<InviteRole, false> items={[{ value: 'admin', label: ROLE_LABEL.admin }, { value: 'member', label: ROLE_LABEL.member }]} value={m.role === 'admin' ? 'admin' : 'member'} onValueChange={(next) => next && setMemberRole.mutate({ userId: m.user_id, role: next })}>
												<SelectTrigger aria-label={`${m.user.name} 역할`} size="sm" className="w-28">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="admin">{ROLE_LABEL.admin}</SelectItem>
													<SelectItem value="member">{ROLE_LABEL.member}</SelectItem>
												</SelectContent>
											</Select>
										) : (
											ROLE_LABEL[m.role]
										)}
									</TableCell>
									<TableCell>
										<Time iso={m.created_at} />
									</TableCell>
									<TableCell>
										{isMe && m.role !== 'owner' && (
											<Button variant="ghost" size="xs" onClick={() => setConfirm({ kind: 'leave', userId: m.user_id, name: m.user.name })}>
												나가기
											</Button>
										)}
										{editable && (
											<Button variant="ghost" size="xs" className="text-destructive" onClick={() => setConfirm({ kind: 'remove', userId: m.user_id, name: m.user.name })}>
												내보내기
											</Button>
										)}
									</TableCell>
								</TableRow>
							);
						})}
						{members.data?.length === 0 && (
							<TableRow>
								<TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
									멤버가 없습니다
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</section>

			{isAdmin && (
				<section className="mt-4 rounded-lg bg-card p-5">
					<h2 className="text-sm font-semibold">초대</h2>
					<form
						className="mt-3 flex items-center gap-2"
						onSubmit={(e) => {
							e.preventDefault();
							invite.mutate();
						}}
					>
						<Input type="email" aria-label="초대할 이메일" placeholder="name@company.com" maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} className="max-w-[320px]" />
						<Select<InviteRole, false> items={[{ value: 'member', label: ROLE_LABEL.member }, { value: 'admin', label: ROLE_LABEL.admin }]} value={role} onValueChange={(next) => next && setRole(next)}>
							<SelectTrigger aria-label="초대 역할" className="w-28">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="member">{ROLE_LABEL.member}</SelectItem>
								<SelectItem value="admin">{ROLE_LABEL.admin}</SelectItem>
							</SelectContent>
						</Select>
						<Button type="submit" size="sm" disabled={!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) || invite.isPending}>
							초대 보내기
						</Button>
					</form>
					<p className="mt-2 text-sm text-muted-foreground">초대받은 사람이 그 이메일의 구글 계정으로 로그인해 메일의 링크를 열면 들어옵니다. 같은 이메일로 다시 보내면 새 링크로 다시 갑니다.</p>

					{(invitations.data ?? []).length > 0 && (
						<Table className="mt-4 text-[13px]">
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead>이메일</TableHead>
									<TableHead className="w-[120px]">역할</TableHead>
									<TableHead className="w-[200px]">만료</TableHead>
									<TableHead className="w-[80px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{invitations.data!.map((inv: Invitation & { expired: boolean }) => {
									const { expired } = inv;
									return (
										<TableRow key={inv.id} className="h-[42px]">
											<TableCell>{inv.email}</TableCell>
											<TableCell>{ROLE_LABEL[inv.role]}</TableCell>
											<TableCell className={expired ? 'text-bad' : ''}>
												{expired ? '만료됨 · ' : ''}
												{formatTime(inv.expires_at)}
											</TableCell>
											<TableCell>
												<Button variant="ghost" size="xs" aria-label={`${inv.email} 초대 취소`} disabled={cancel.isPending} onClick={() => cancel.mutate(inv.id)}>
													취소
												</Button>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					)}
				</section>
			)}

			<AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="font-sans">{confirm?.kind === 'leave' ? '이 조직에서 나갈까요?' : `${confirm?.name} 님을 내보낼까요?`}</AlertDialogTitle>
						<AlertDialogDescription>{confirm?.kind === 'leave' ? '나가면 이 조직의 프로젝트를 더 볼 수 없습니다. 다시 들어오려면 초대를 받아야 합니다.' : '그 사람은 이 조직의 프로젝트를 더 볼 수 없습니다. 다시 초대할 수 있습니다.'}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>그대로 두기</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={() => {
								const target = confirm!;
								setConfirm(null);
								remove.mutate(target.userId);
							}}
						>
							{confirm?.kind === 'leave' ? '나가기' : '내보내기'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
