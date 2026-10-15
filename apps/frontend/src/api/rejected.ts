import { api, type Page } from './client';

// 인그레스가 거부한 요청. 본문은 없다
export type RejectionReason = 'payload_too_large' | 'project_suspended' | 'no_connection' | 'signature_missing' | 'signature_mismatch' | 'timestamp_out_of_range' | 'usage_exceeded';
export type RejectedRequest = { id: string; project_id: number; source_id: number | null; reason: RejectionReason; headers: Record<string, string | string[]>; size: number; received_at: string };
export type RejectedFilter = { source_id?: number; reason?: RejectionReason; cursor?: string };

export const REASON_LABEL: Record<RejectionReason, string> = {
	payload_too_large: '본문이 너무 큼',
	project_suspended: '정지된 프로젝트',
	no_connection: '연결 없음',
	signature_missing: '서명 없음',
	signature_mismatch: '서명 불일치',
	timestamp_out_of_range: '서명 시각 초과',
	usage_exceeded: '사용량 초과',
};

export const listRejected = async (orgId: number, projectId: number, filter: RejectedFilter) => (await api.get<Page<RejectedRequest>>(`/orgs/${orgId}/projects/${projectId}/rejected-requests`, { params: { limit: 50, ...filter } })).data;
