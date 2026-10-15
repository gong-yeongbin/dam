import { api, type Page } from './client';

export type Org = { id: number; name: string; plan: 'free' | 'team' | 'business'; role: 'owner' | 'admin' | 'member' };
export type Project = { id: number; organization_id: number; name: string; suspended_at: string | null };

export const listOrgs = async () => (await api.get<Page<Org>>('/orgs', { params: { limit: 200 } })).data.data;
export const listProjects = async (orgId: number) => (await api.get<Page<Project>>(`/orgs/${orgId}/projects`, { params: { limit: 200 } })).data.data;
export const createProject = async (orgId: number, name: string) => (await api.post<Project>(`/orgs/${orgId}/projects`, { name })).data;
