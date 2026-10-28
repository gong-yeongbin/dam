import { api, type Page } from './client';
import type { Delivery, DeliveryStatus } from './events';

// 백엔드 DTO 그대로(snake_case). BigInt id는 문자열로 온다
export type AttemptTrigger = 'initial' | 'automatic' | 'manual' | 'bulk_retry' | 'unpause';
export type DeliveryAttempt = {
	id: string;
	delivery_id: string;
	attempt_no: number;
	trigger: AttemptTrigger;
	status_code: number | null;
	error: string | null;
	duration_ms: number;
	response_body: string | null;
	attempted_at: string;
};
export type DeliveryDetail = Delivery & { attempts: DeliveryAttempt[] };
export type DeliveryFilter = { status?: DeliveryStatus; destination_id?: number; event_id?: string; cursor?: string };
export type BulkRetryStatus = 'dead' | 'failed' | 'canceled';
export type BulkRetryBody = { status: BulkRetryStatus; destination_id?: number; created_after?: string; created_before?: string };

export const TRIGGER_LABEL: Record<AttemptTrigger, string> = {
	initial: '첫 전달',
	automatic: '자동 재시도',
	manual: '수동 재시도',
	bulk_retry: '일괄 재시도',
	unpause: '재개',
};

const base = (orgId: number, projectId: number) => `/orgs/${orgId}/projects/${projectId}/deliveries`;

export const listDeliveries = async (orgId: number, projectId: number, filter: DeliveryFilter) => (await api.get<Page<Delivery>>(base(orgId, projectId), { params: { limit: 50, ...filter } })).data;
export const getDelivery = async (orgId: number, projectId: number, id: string) => (await api.get<DeliveryDetail>(`${base(orgId, projectId)}/${id}`)).data;
export const retryDelivery = async (orgId: number, projectId: number, id: string) => (await api.post<Delivery>(`${base(orgId, projectId)}/${id}/retry`)).data;
export const cancelDelivery = async (orgId: number, projectId: number, id: string) => (await api.post<Delivery>(`${base(orgId, projectId)}/${id}/cancel`)).data;
// 조건에 맞는 것을 한 번에 최대 1,000건 되돌린다. 돌린 수를 준다
export const bulkRetry = async (orgId: number, projectId: number, body: BulkRetryBody) => (await api.post<{ count: number }>(`${base(orgId, projectId)}/retry`, body)).data;
