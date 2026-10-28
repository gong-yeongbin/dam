import { api } from './client';

// 백엔드 DTO 그대로. used는 청구 기준(리플레이 포함·거부 제외), projects는 조회용이라 합이 used와 다를 수 있다
export type Usage = {
	period: string;
	period_start: string;
	plan: 'free' | 'team' | 'business';
	included: number;
	used: number;
	projects: { project_id: number; name: string; event_count: number }[];
};

export const getUsage = async (orgId: number) => (await api.get<Usage>(`/orgs/${orgId}/usage`)).data;
