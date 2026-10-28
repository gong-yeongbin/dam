import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { errorMessage } from '@/api/client';
import { getMe } from '@/api/orgs';
import { clearToken } from '@/auth/token';
import { formatTime } from '@/components/Time';
import { Button } from '@/components/ui/button';

// 로그인한 내 계정. 구글에서 받은 이름·이메일이라 여기서 바꾸지 않는다
export function MePage() {
	const navigate = useNavigate();
	const me = useQuery({ queryKey: ['me'], queryFn: getMe });
	const logout = () => {
		clearToken();
		void navigate('/login', { replace: true });
	};
	return (
		<div className="max-w-[560px]">
			<h1 className="pt-3 text-[26px] font-medium tracking-tight">내 정보</h1>
			{me.isError && <p className="mt-4 text-destructive">{errorMessage(me.error)}</p>}
			{me.data && (
				<dl className="mt-6 grid grid-cols-[100px_1fr] gap-x-3 gap-y-3 rounded-lg bg-card p-5 text-sm">
					<dt className="text-muted-foreground">이름</dt>
					<dd>{me.data.name}</dd>
					<dt className="text-muted-foreground">이메일</dt>
					<dd>{me.data.email}</dd>
					<dt className="text-muted-foreground">가입</dt>
					<dd>{formatTime(me.data.created_at)}</dd>
					<dt className="text-muted-foreground">로그인</dt>
					<dd>구글 계정. 이름·이메일은 구글에서 가져옵니다.</dd>
				</dl>
			)}
			<Button type="button" variant="outline" size="sm" className="mt-4" onClick={logout}>
				로그아웃
			</Button>
		</div>
	);
}
