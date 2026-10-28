import { type ReactNode, useState } from 'react';
import type { Destination, DestinationBody } from '@/api/destinations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Header = { name: string; value: string };
const toRows = (headers: Record<string, string> | undefined) => Object.entries(headers ?? {}).map(([name, value]) => ({ name, value }));

type Props = { destination?: Destination; idPrefix: string; submitLabel: string; pending: boolean; onSubmit: (body: DestinationBody) => void; footer?: ReactNode };

// 목적지 만들기·수정 폼. 헤더 값은 응답에서 가려져 오므로(***) 수정 때는 바꿀 것만 다시 넣는다
export function DestinationForm({ destination, idPrefix, submitLabel, pending, onSubmit, footer }: Props) {
	const [name, setName] = useState(destination?.name ?? '');
	const [url, setUrl] = useState(destination?.url ?? '');
	const [headers, setHeaders] = useState<Header[]>(toRows(destination?.headers));
	const [timeout, setTimeoutSec] = useState((destination?.timeout_ms ?? 10000) / 1000);
	const [concurrency, setConcurrency] = useState(destination?.concurrency ?? 5);
	const id = (field: string) => `${idPrefix}-${field}`;
	const valid = name.trim() !== '' && /^https?:\/\/.+/.test(url.trim()) && headers.every((h) => h.name.trim() === '' || h.value.trim() !== '');
	const setHeader = (i: number, patch: Partial<Header>) => setHeaders(headers.map((h, j) => (i === j ? { ...h, ...patch } : h)));

	return (
		<form
			className="space-y-4"
			onSubmit={(e) => {
				e.preventDefault();
				const picked = headers.filter((h) => h.name.trim() !== '');
				onSubmit({ name: name.trim(), url: url.trim(), headers: picked.length ? Object.fromEntries(picked.map((h) => [h.name.trim(), h.value])) : null, timeout_ms: timeout * 1000, concurrency });
			}}
		>
			<div>
				<label htmlFor={id('name')} className="block text-sm font-medium">
					이름
				</label>
				<Input id={id('name')} className="mt-1.5" placeholder="예: 주문 서버" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
			</div>
			<div>
				<label htmlFor={id('url')} className="block text-sm font-medium">
					주소
				</label>
				<Input id={id('url')} className="mt-1.5" placeholder="https://api.example.com/webhooks" maxLength={2048} value={url} onChange={(e) => setUrl(e.target.value)} />
				<p className="mt-1 text-xs text-muted-foreground">받은 요청의 방식·경로·쿼리·헤더·본문을 그대로 이 주소로 보냅니다. 내부망 주소는 막힙니다.</p>
			</div>

			<div>
				<p className="text-sm font-medium">덧붙일 헤더</p>
				<p className="mt-1 text-xs text-muted-foreground">고객 서버 인증 토큰 등. 암호화해 저장하고, 조회하면 값이 가려집니다.</p>
				<div className="mt-2 space-y-2">
					{headers.map((h, i) => (
						<div key={i} className="flex items-center gap-2">
							<Input aria-label={`헤더 이름 ${i + 1}`} placeholder="Authorization" className="h-8" value={h.name} onChange={(e) => setHeader(i, { name: e.target.value })} />
							<Input aria-label={`헤더 값 ${i + 1}`} placeholder="Bearer …" className="h-8" value={h.value} onChange={(e) => setHeader(i, { value: e.target.value })} />
							<Button type="button" variant="ghost" size="xs" aria-label={`헤더 ${i + 1} 지우기`} onClick={() => setHeaders(headers.filter((_, j) => j !== i))}>
								지우기
							</Button>
						</div>
					))}
					{headers.length < 20 && (
						<Button type="button" variant="outline" size="xs" onClick={() => setHeaders([...headers, { name: '', value: '' }])}>
							헤더 추가
						</Button>
					)}
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div>
					<label htmlFor={id('timeout')} className="block text-sm font-medium">
						타임아웃(초)
					</label>
					<Input id={id('timeout')} type="number" min={1} max={30} className="mt-1.5" value={timeout} onChange={(e) => setTimeoutSec(Number(e.target.value))} />
				</div>
				<div>
					<label htmlFor={id('concurrency')} className="block text-sm font-medium">
						동시 요청 수
					</label>
					<Input id={id('concurrency')} type="number" min={1} max={100} className="mt-1.5" value={concurrency} onChange={(e) => setConcurrency(Number(e.target.value))} />
				</div>
				<p className="col-span-2 text-xs text-muted-foreground">타임아웃을 넘기면 실패로 보고 재시도합니다. 동시 요청 수를 넘는 전달은 자리가 날 때까지 1~5초 미룹니다.</p>
			</div>

			<div className="flex justify-end gap-2">
				{footer}
				<Button type="submit" disabled={!valid || pending}>
					{submitLabel}
				</Button>
			</div>
		</form>
	);
}
