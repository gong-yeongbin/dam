import { api, type Page } from './client';

// 백엔드 DTO 그대로(snake_case)
export type RetryStrategy = 'linear' | 'exponential';
export type RetryRule = { retry_strategy: RetryStrategy; retry_interval_ms: number; retry_count: number };
export type Connection = RetryRule & { id: number; source_id: number; destination_id: number; paused_at: string | null; created_at: string; updated_at: string };

export const STRATEGY_LABEL: Record<RetryStrategy, string> = { linear: '같은 간격', exponential: '2배씩' };
// 백엔드 기본값(2배씩·5분·9회)과 같다
export const DEFAULT_RETRY: RetryRule = { retry_strategy: 'exponential', retry_interval_ms: 300_000, retry_count: 9 };
export const describeRetry = (rule: RetryRule) => `${STRATEGY_LABEL[rule.retry_strategy]} · ${rule.retry_interval_ms / 1000}초 · ${rule.retry_count}회`;

const base = (orgId: number, projectId: number) => `/orgs/${orgId}/projects/${projectId}/connections`;

export const listConnections = async (orgId: number, projectId: number) => (await api.get<Page<Connection>>(base(orgId, projectId), { params: { limit: 200 } })).data.data;
export const createConnection = async (orgId: number, projectId: number, body: { source_id: number; destination_id: number } & Partial<RetryRule>) => (await api.post<Connection>(base(orgId, projectId), body)).data;
export const updateConnection = async (orgId: number, projectId: number, id: number, body: Partial<RetryRule>) => (await api.patch<Connection>(`${base(orgId, projectId)}/${id}`, body)).data;
export const pauseConnection = async (orgId: number, projectId: number, id: number, paused: boolean) => (await api.post<Connection>(`${base(orgId, projectId)}/${id}/${paused ? 'pause' : 'unpause'}`)).data;
export const deleteConnection = async (orgId: number, projectId: number, id: number) => {
	await api.delete(`${base(orgId, projectId)}/${id}`);
};
