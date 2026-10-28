import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { errorMessage } from '@/api/client';
import { getUsage } from '@/api/usage';
import { useProject } from '@/auth/project';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const PLAN_LABEL = { free: 'Free', team: 'Team', business: 'Business' } as const;
// '202610' → '2026년 10월'
const monthLabel = (period: string) => `${period.slice(0, 4)}년 ${Number(period.slice(4))}월`;

// 이번 달 조직 사용량. 숫자는 타일이 아니라 글자로 크게. 프로젝트별 수는 조회용
export function UsagePage() {
	const { current, orgs } = useProject();
	const org = current?.org ?? orgs[0] ?? null;
	const usage = useQuery({ queryKey: ['usage', org?.id], queryFn: () => getUsage(org!.id), enabled: org !== null });

	if (!org) return <p className="pt-4 text-muted-foreground">조직이 없습니다.</p>;
	const u = usage.data;
	const ratio = u ? Math.min(u.used / u.included, 1) : 0;
	const over = u ? u.used > u.included : false;

	return (
		<div className="max-w-[720px]">
			<div className="flex items-center gap-3 pt-3">
				<h1 className="text-[26px] font-medium tracking-tight">사용량</h1>
				{u && <span className="text-[13px] text-muted-foreground">{monthLabel(u.period)} · 한국 시각 기준 매월 1일에 새로 셉니다</span>}
			</div>
			{usage.isError && <p className="mt-4 text-destructive">{errorMessage(usage.error)}</p>}
			{usage.isPending && <p className="mt-4 text-muted-foreground">불러오는 중</p>}

			{u && (
				<>
					<section className="mt-6 rounded-lg bg-card p-5">
						<p className="text-sm text-muted-foreground">
							{org.name} · {PLAN_LABEL[u.plan]}
						</p>
						<p className="mt-2 text-[40px] leading-none font-medium tracking-tight">
							{u.used.toLocaleString()}
							<span className="ml-2 text-base font-normal text-muted-foreground">/ {u.included.toLocaleString()} 이벤트</span>
						</p>
						<div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="포함량 대비 사용량" aria-valuemin={0} aria-valuemax={u.included} aria-valuenow={Math.min(u.used, u.included)}>
							<div className={over ? 'h-full bg-bad' : 'h-full bg-primary'} style={{ width: `${ratio * 100}%` }} />
						</div>
						<p className="mt-3 text-sm text-muted-foreground">
							{over
								? u.plan === 'free'
									? `포함량을 ${(u.used - u.included).toLocaleString()}건 넘었습니다. Free는 남은 웹훅을 429로 거부합니다. 다음 달 1일에 다시 받습니다.`
									: `포함량을 ${(u.used - u.included).toLocaleString()}건 넘었습니다. 넘은 만큼 10만 건당 10,000원부터 청구됩니다.`
								: u.plan === 'free'
									? `${(u.included - u.used).toLocaleString()}건 남았습니다. 넘으면 그 달 남은 웹훅은 429로 거부됩니다.`
									: `${(u.included - u.used).toLocaleString()}건 남았습니다. 넘으면 넘은 만큼만 종량으로 청구됩니다.`}{' '}
							<Link to="/pricing" className="text-primary underline-offset-4 hover:underline">
								요금
							</Link>
						</p>
					</section>

					<section className="mt-4 rounded-lg bg-card">
						<h2 className="px-5 pt-5 text-sm font-semibold">프로젝트별</h2>
						<Table className="mt-3 text-[13px]">
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead className="pl-5">프로젝트</TableHead>
									<TableHead className="w-[160px] text-right">이벤트</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{u.projects.map((p) => (
									<TableRow key={p.project_id} className="h-[42px]">
										<TableCell className="pl-5">{p.name}</TableCell>
										<TableCell className="text-right">{p.event_count.toLocaleString()}</TableCell>
									</TableRow>
								))}
								{u.projects.length === 0 && (
									<TableRow>
										<TableCell colSpan={2} className="h-16 text-center text-muted-foreground">
											프로젝트가 없습니다
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
						<p className="px-5 pt-3 pb-5 text-xs text-muted-foreground">위 합계는 청구 기준이고 프로젝트별 수는 지금 남아 있는 이벤트를 센 것이라, 보존 기간이 지나 지워진 만큼 작을 수 있습니다. 리플레이는 세고 거부된 요청은 세지 않습니다.</p>
					</section>
				</>
			)}
		</div>
	);
}
