import { api, type Page } from './client';

export type Destination = { id: number; project_id: number; name: string; url: string; headers: Record<string, string>; timeout_ms: number; concurrency: number; created_at: string; updated_at: string };

export type DestinationBody = { name: string; url: string; headers?: Record<string, string> | null; timeout_ms?: number; concurrency?: number };

const base = (orgId: number, projectId: number) => `/orgs/${orgId}/projects/${projectId}/destinations`;

export const listDestinations = async (orgId: number, projectId: number) => (await api.get<Page<Destination>>(base(orgId, projectId), { params: { limit: 200 } })).data.data;
export const createDestination = async (orgId: number, projectId: number, body: DestinationBody) => (await api.post<Destination>(base(orgId, projectId), body)).data;
export const updateDestination = async (orgId: number, projectId: number, id: number, body: Partial<DestinationBody>) => (await api.patch<Destination>(`${base(orgId, projectId)}/${id}`, body)).data;
export const deleteDestination = async (orgId: number, projectId: number, id: number) => {
	await api.delete(`${base(orgId, projectId)}/${id}`);
};
