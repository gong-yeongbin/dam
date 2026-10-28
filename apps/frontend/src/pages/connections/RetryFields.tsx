import { type RetryRule, type RetryStrategy, STRATEGY_LABEL } from '@/api/connections';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STRATEGIES: RetryStrategy[] = ['exponential', 'linear'];

// 재시도 설정 입력 셋. 만들기와 수정이 같이 쓴다. 간격은 초로 받고 ms로 저장한다
export function RetryFields({ value, onChange, idPrefix }: { value: RetryRule; onChange: (next: RetryRule) => void; idPrefix: string }) {
	return (
		<div className="grid grid-cols-3 gap-3">
			<div>
				<label htmlFor={`${idPrefix}-strategy`} className="block text-sm font-medium">
					방식
				</label>
				<Select<RetryStrategy, false> items={STRATEGIES.map((s) => ({ value: s, label: STRATEGY_LABEL[s] }))} value={value.retry_strategy} onValueChange={(s) => s && onChange({ ...value, retry_strategy: s })}>
					<SelectTrigger id={`${idPrefix}-strategy`} className="mt-1.5 w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{STRATEGIES.map((s) => (
							<SelectItem key={s} value={s}>
								{STRATEGY_LABEL[s]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div>
				<label htmlFor={`${idPrefix}-interval`} className="block text-sm font-medium">
					간격(초)
				</label>
				<Input id={`${idPrefix}-interval`} type="number" min={1} max={86400} className="mt-1.5" value={value.retry_interval_ms / 1000} onChange={(e) => onChange({ ...value, retry_interval_ms: Number(e.target.value) * 1000 })} />
			</div>
			<div>
				<label htmlFor={`${idPrefix}-count`} className="block text-sm font-medium">
					횟수
				</label>
				<Input id={`${idPrefix}-count`} type="number" min={0} max={50} className="mt-1.5" value={value.retry_count} onChange={(e) => onChange({ ...value, retry_count: Number(e.target.value) })} />
			</div>
			<p className="col-span-3 text-sm text-muted-foreground">
				{value.retry_strategy === 'exponential' ? '간격이 매번 2배가 됩니다.' : '매번 같은 간격입니다.'} 최대 50회, 1주일까지. 목적지가 Retry-After를 주면 그 값을 따릅니다.
			</p>
		</div>
	);
}
