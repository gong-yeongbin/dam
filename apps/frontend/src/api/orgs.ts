import { api, type Page } from './client';
import type { Org } from './projects';

// 백엔드 DTO 그대로(snake_case)
export type Role = 'owner' | 'admin' | 'member';
export type Member = { organization_id: number; user_id: number; role: Role; created_at: string; updated_at: string; user: { id: number; email: string; name: string; avatar_url: string | null } };
export type Invitation = { id: number; organization_id: number; email: string; role: 'admin' | 'member'; expires_at: string; invited_by_user_id: number; created_at: string; updated_at: string };
export type Me = { id: number; email: string; name: string; avatar_url: string | null; created_at: string; updated_at: string };

export const ROLE_LABEL: Record<Role, string> = { owner: '소유자', admin: '관리자', member: '멤버' };

export const getMe = async () => (await api.get<Me>('/users/me')).data;
export const updateOrg = async (orgId: number, name: string) => (await api.patch<Org>(`/orgs/${orgId}`, { name })).data;
export const listMembers = async (orgId: number) => (await api.get<Page<Member>>(`/orgs/${orgId}/members`, { params: { limit: 200 } })).data.data;
export const changeMemberRole = async (orgId: number, userId: number, role: 'admin' | 'member') => (await api.patch<Member>(`/orgs/${orgId}/members/${userId}`, { role })).data;
// 내보내기. 자기 자신이면 나가기
export const removeMember = async (orgId: number, userId: number) => {
	await api.delete(`/orgs/${orgId}/members/${userId}`);
};
export const listInvitations = async (orgId: number) => (await api.get<Page<Invitation>>(`/orgs/${orgId}/invitations`, { params: { limit: 200 } })).data.data;
export const createInvitation = async (orgId: number, email: string, role: 'admin' | 'member') => (await api.post<Invitation>(`/orgs/${orgId}/invitations`, { email, role })).data;
export const cancelInvitation = async (orgId: number, id: number) => {
	await api.delete(`/orgs/${orgId}/invitations/${id}`);
};
// 초대 메일의 링크 {APP_URL}/invitations/{token}. 로그인 계정 이메일이 초대 이메일과 같아야 한다
export const acceptInvitation = async (token: string) => (await api.post<{ organization_id: number }>(`/invitations/${token}/accept`)).data;
