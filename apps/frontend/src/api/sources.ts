import { api, type Page } from './client';

// 백엔드 DTO 그대로(snake_case). 서명 키는 응답에 없다(암호화 저장, 다시 조회 불가)
export type SignatureConfig = {
	header: string;
	encoding?: 'hex' | 'base64';
	secret_encoding?: 'utf8' | 'base64';
	prefix?: string;
	signed_payload?: string;
	timestamp_header?: string;
	tolerance_sec?: number;
	event_id_header?: string;
};
export type Source = { id: number; project_id: number; slug: string; name: string; signature_config: SignatureConfig | null; created_at: string; updated_at: string };
export type SourceBody = { name: string; signing_secret?: string | null; signature_config?: SignatureConfig | null };

const base = (orgId: number, projectId: number) => `/orgs/${orgId}/projects/${projectId}/sources`;

export const listSources = async (orgId: number, projectId: number) => (await api.get<Page<Source>>(base(orgId, projectId), { params: { limit: 200 } })).data.data;
export const createSource = async (orgId: number, projectId: number, body: SourceBody) => (await api.post<Source>(base(orgId, projectId), body)).data;
export const updateSource = async (orgId: number, projectId: number, id: number, body: Partial<SourceBody>) => (await api.patch<Source>(`${base(orgId, projectId)}/${id}`, body)).data;
// 받는 주소를 새로 발급한다. 옛 주소는 바로 404
export const rotateSourceSlug = async (orgId: number, projectId: number, id: number) => (await api.post<Source>(`${base(orgId, projectId)}/${id}/rotate-slug`)).data;
export const deleteSource = async (orgId: number, projectId: number, id: number) => {
	await api.delete(`${base(orgId, projectId)}/${id}`);
};

// 업체 설정에 넣을 받는 주소. 개발 서버는 /api 프록시를 거친다
export const ingressUrl = (slug: string) => `${import.meta.env.VITE_INGRESS_URL || `${window.location.origin}/api`}/in/${slug}`;
