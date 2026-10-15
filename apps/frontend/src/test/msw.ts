import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { Event, EventDetail, Source } from '@/api/events';
import type { Org, Project } from '@/api/projects';
import type { RejectedRequest } from '@/api/rejected';

// 테스트용 백엔드. 실제 응답 모양(snake_case, BigInt는 문자열)을 그대로 따른다
export const ORG: Org = { id: 1, name: '내 조직', plan: 'team', role: 'owner' };
export const PROJECT: Project = { id: 10, organization_id: 1, name: 'shop', suspended_at: null };
export const SOURCES: Source[] = [{ id: 7, project_id: 10, slug: 'abcdefghij0123456789', name: '토스 결제' }];
export const EVENTS: Event[] = [
	{ id: '121', project_id: 10, source_id: 7, idempotency_key: 'id:b', method: 'POST', path: '/orders/42', query: 'v=2', source_ip: '203.0.113.7', verified: true, headers: { 'content-type': 'application/json', 'x-toss-event': 'PAYMENT' }, content_type: 'application/json', size: 18, received_at: '2026-10-15T03:00:00.000Z' },
	{ id: '120', project_id: 10, source_id: null, idempotency_key: 'sha256:a', method: 'POST', path: '', query: '', source_ip: null, verified: false, headers: {}, content_type: null, size: 2, received_at: '2026-10-14T03:00:00.000Z' },
];
export const DETAIL: EventDetail = {
	...EVENTS[0]!,
	deliveries: [
		{ id: '900', event_id: '121', destination_id: 3, connection_id: 1, status: 'failed', attempt: 2, next_attempt_at: '2026-10-15T03:10:00.000Z', last_status_code: 503, last_error: null, created_at: '2026-10-15T03:00:00.000Z', updated_at: '2026-10-15T03:05:00.000Z' },
		{ id: '901', event_id: '121', destination_id: null, connection_id: null, status: 'canceled', attempt: 0, next_attempt_at: null, last_status_code: null, last_error: null, created_at: '2026-10-15T03:00:00.000Z', updated_at: '2026-10-15T03:00:00.000Z' },
	],
};

export const REJECTED: RejectedRequest[] = [
	{ id: '51', project_id: 10, source_id: 7, reason: 'signature_mismatch', headers: { 'x-signature': 'bad' }, size: 11, received_at: '2026-10-15T02:00:00.000Z' },
	{ id: '50', project_id: 10, source_id: null, reason: 'no_connection', headers: {}, size: 2, received_at: '2026-10-14T02:00:00.000Z' },
];

const page = <T,>(data: T[], next_cursor: string | null = null) => HttpResponse.json({ data, next_cursor });

export const handlers = [
	http.get('/api/orgs', () => page([ORG])),
	http.get('/api/orgs/1/projects', () => page([PROJECT])),
	http.post('/api/orgs/1/projects', async ({ request }) => {
		const { name } = (await request.json()) as { name: string };
		return HttpResponse.json({ ...PROJECT, id: 11, name }, { status: 201 });
	}),
	http.get('/api/orgs/1/projects/10/sources', () => page(SOURCES)),
	http.get('/api/orgs/1/projects/10/events', ({ request }) => {
		const url = new URL(request.url);
		const cursor = url.searchParams.get('cursor');
		const sourceId = url.searchParams.get('source_id');
		if (cursor === '120') return page([]);
		const rows = sourceId ? EVENTS.filter((e) => String(e.source_id) === sourceId) : EVENTS;
		return page(rows, sourceId ? null : '120');
	}),
	http.get('/api/orgs/1/projects/10/rejected-requests', ({ request }) => {
		const reason = new URL(request.url).searchParams.get('reason');
		return page(reason ? REJECTED.filter((r) => r.reason === reason) : REJECTED);
	}),
	http.get('/api/orgs/1/projects/10/events/121', () => HttpResponse.json(DETAIL)),
	http.get('/api/orgs/1/projects/10/events/121/body', () => new HttpResponse('{"order":42}', { headers: { 'content-type': 'application/json' } })),
	http.post('/api/orgs/1/projects/10/events/121/replay', () => HttpResponse.json({ ...EVENTS[0], id: '122' }, { status: 201 })),
];

export const server = setupServer(...handlers);
