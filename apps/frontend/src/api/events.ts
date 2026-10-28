import { api, type Page } from './client';

// 소스 타입·목록은 sources.ts가 주인이다. 이벤트 화면이 소스 이름을 붙일 때 쓴다
export { listSources, type Source } from './sources';

// 백엔드 DTO 그대로(snake_case). BigInt id는 문자열로 온다
export type DeliveryStatus = 'pending' | 'succeeded' | 'failed' | 'dead' | 'canceled' | 'held';
export type Delivery = {
	id: string;
	event_id: string;
	destination_id: number | null;
	connection_id: number | null;
	status: DeliveryStatus;
	attempt: number;
	next_attempt_at: string | null;
	last_status_code: number | null;
	last_error: string | null;
	created_at: string;
	updated_at: string;
};
export type Event = {
	id: string;
	project_id: number;
	source_id: number | null;
	idempotency_key: string;
	method: string;
	path: string;
	query: string;
	source_ip: string | null;
	verified: boolean;
	headers: Record<string, string | string[]>;
	content_type: string | null;
	size: number;
	received_at: string;
};
export type EventDetail = Event & { deliveries: Delivery[] };
export type EventFilter = { source_id?: number; received_after?: string; received_before?: string; cursor?: string };

const base = (orgId: number, projectId: number) => `/orgs/${orgId}/projects/${projectId}`;

export const listEvents = async (orgId: number, projectId: number, filter: EventFilter) => (await api.get<Page<Event>>(`${base(orgId, projectId)}/events`, { params: { limit: 50, ...filter } })).data;
export const getEvent = async (orgId: number, projectId: number, id: string) => (await api.get<EventDetail>(`${base(orgId, projectId)}/events/${id}`)).data;
// 본문은 받은 바이트 그대로. 글자로 보여준다
export const getEventBody = async (orgId: number, projectId: number, id: string) => (await api.get<string>(`${base(orgId, projectId)}/events/${id}/body`, { responseType: 'text', transformResponse: (v: string) => v })).data;
export const replayEvent = async (orgId: number, projectId: number, id: string) => (await api.post<Event>(`${base(orgId, projectId)}/events/${id}/replay`)).data;
