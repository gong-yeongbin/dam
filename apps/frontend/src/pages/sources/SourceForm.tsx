import { type ReactNode, useState } from 'react';
import type { SignatureConfig, Source, SourceBody } from '@/api/sources';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const EMPTY_CONFIG: SignatureConfig = { header: '', encoding: 'hex', secret_encoding: 'utf8', prefix: '', signed_payload: '{body}', timestamp_header: '', tolerance_sec: 300, event_id_header: '' };

// 빈 값은 보내지 않는다(백엔드가 모르는 필드·빈 문자열을 거부한다)
const toBody = (name: string, verify: boolean, secret: string, config: SignatureConfig): SourceBody => {
	if (!verify) return { name, signing_secret: null, signature_config: null };
	const clean: SignatureConfig = { header: config.header.trim(), encoding: config.encoding, secret_encoding: config.secret_encoding, signed_payload: config.signed_payload?.trim() || '{body}', tolerance_sec: config.tolerance_sec };
	if (config.prefix) clean.prefix = config.prefix;
	if (config.timestamp_header?.trim()) clean.timestamp_header = config.timestamp_header.trim();
	if (config.event_id_header?.trim()) clean.event_id_header = config.event_id_header.trim();
	return { name, signing_secret: secret, signature_config: clean };
};

type Props = { source?: Source; idPrefix: string; submitLabel: string; pending: boolean; onSubmit: (body: SourceBody) => void; footer?: ReactNode };

// 소스 만들기·수정 폼. 서명 검증을 켜면 업체 서명 설정을 적는다. 키는 다시 조회할 수 없어 수정 때도 새로 넣는다
export function SourceForm({ source, idPrefix, submitLabel, pending, onSubmit, footer }: Props) {
	const [name, setName] = useState(source?.name ?? '');
	const [verify, setVerify] = useState(source?.signature_config !== null && source?.signature_config !== undefined);
	const [secret, setSecret] = useState('');
	const [config, setConfig] = useState<SignatureConfig>({ ...EMPTY_CONFIG, ...source?.signature_config });
	const set = (patch: Partial<SignatureConfig>) => setConfig({ ...config, ...patch });
	const id = (field: string) => `${idPrefix}-${field}`;
	const valid = name.trim() !== '' && (!verify || (secret.trim() !== '' && config.header.trim() !== ''));

	return (
		<form
			className="space-y-4"
			onSubmit={(e) => {
				e.preventDefault();
				onSubmit(toBody(name.trim(), verify, secret.trim(), config));
			}}
		>
			<div>
				<label htmlFor={id('name')} className="block text-sm font-medium">
					이름
				</label>
				<Input id={id('name')} className="mt-1.5" placeholder="예: 토스페이먼츠 결제" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
			</div>

			<label className="flex items-center gap-2 text-sm font-medium">
				<input type="checkbox" className="size-4 accent-primary" checked={verify} onChange={(e) => setVerify(e.target.checked)} />
				업체 서명을 검증한다
			</label>
			{!verify && <p className="text-sm text-muted-foreground">끄면 이 주소로 오는 요청을 전부 받습니다. 토스 결제·포트원 V1처럼 서명이 없는 업체는 끄세요.</p>}

			{verify && (
				<div className="space-y-3 rounded-lg bg-muted/60 p-4">
					<div>
						<label htmlFor={id('secret')} className="block text-sm font-medium">
							서명 키 {source && <span className="font-normal text-muted-foreground">(저장된 키는 볼 수 없어 다시 넣습니다)</span>}
						</label>
						<Input id={id('secret')} className="mt-1.5" placeholder="업체가 발급한 웹훅 시크릿" maxLength={500} value={secret} onChange={(e) => setSecret(e.target.value)} />
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div>
							<label htmlFor={id('header')} className="block text-sm font-medium">
								서명 헤더
							</label>
							<Input id={id('header')} className="mt-1.5" placeholder="x-hub-signature-256" value={config.header} onChange={(e) => set({ header: e.target.value })} />
						</div>
						<div>
							<label htmlFor={id('prefix')} className="block text-sm font-medium">
								서명 앞 문자열
							</label>
							<Input id={id('prefix')} className="mt-1.5" placeholder="sha256=" maxLength={32} value={config.prefix ?? ''} onChange={(e) => set({ prefix: e.target.value })} />
						</div>
						<EnumSelect id={id('encoding')} label="서명 인코딩" value={config.encoding ?? 'hex'} options={['hex', 'base64']} onChange={(v) => set({ encoding: v })} />
						<EnumSelect id={id('secret-encoding')} label="키 인코딩" value={config.secret_encoding ?? 'utf8'} options={['utf8', 'base64']} onChange={(v) => set({ secret_encoding: v })} />
						<div className="col-span-2">
							<label htmlFor={id('payload')} className="block text-sm font-medium">
								서명 대상
							</label>
							<Input id={id('payload')} className="mt-1.5" maxLength={300} value={config.signed_payload ?? '{body}'} onChange={(e) => set({ signed_payload: e.target.value })} />
							<p className="mt-1 text-xs text-muted-foreground">{'{body}'}는 본문, {'{header:이름}'}은 그 헤더 값. 예: {'{header:webhook-id}.{header:webhook-timestamp}.{body}'}</p>
						</div>
						<div>
							<label htmlFor={id('ts')} className="block text-sm font-medium">
								시각 헤더
							</label>
							<Input id={id('ts')} className="mt-1.5" placeholder="비우면 검사 안 함" value={config.timestamp_header ?? ''} onChange={(e) => set({ timestamp_header: e.target.value })} />
						</div>
						<div>
							<label htmlFor={id('tolerance')} className="block text-sm font-medium">
								허용 오차(초)
							</label>
							<Input id={id('tolerance')} type="number" min={1} max={3600} className="mt-1.5" value={config.tolerance_sec ?? 300} onChange={(e) => set({ tolerance_sec: Number(e.target.value) })} />
						</div>
						<div className="col-span-2">
							<label htmlFor={id('event-id')} className="block text-sm font-medium">
								이벤트 ID 헤더
							</label>
							<Input id={id('event-id')} className="mt-1.5" placeholder="비우면 본문 해시로 중복을 가립니다" value={config.event_id_header ?? ''} onChange={(e) => set({ event_id_header: e.target.value })} />
						</div>
					</div>
				</div>
			)}

			<div className="flex justify-end gap-2">
				{footer}
				<Button type="submit" disabled={!valid || pending}>
					{submitLabel}
				</Button>
			</div>
		</form>
	);
}

function EnumSelect<T extends string>({ id, label, value, options, onChange }: { id: string; label: string; value: T; options: T[]; onChange: (v: T) => void }) {
	return (
		<div>
			<label htmlFor={id} className="block text-sm font-medium">
				{label}
			</label>
			<Select<T, false> items={options.map((o) => ({ value: o, label: o }))} value={value} onValueChange={(v) => v && onChange(v)}>
				<SelectTrigger id={id} className="mt-1.5 w-full">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{options.map((o) => (
						<SelectItem key={o} value={o}>
							{o}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
