import type { Plan } from '@prisma/client';

// 프로젝트별 이번 달 이벤트 수. 조회용 수치일 뿐 과금은 조직 합산(context-notes "사용량·과금은 조직 합산")
export type ProjectUsage = { project_id: number; name: string; event_count: number };

export interface UsageRepository {
	findPlan(orgId: number): Promise<Plan | null>;
	// since(KST 월초) 이후 받은 이벤트를 project별로 센다. 이벤트가 없는 project도 0으로 넣는다
	countEventsByProject(orgId: number, since: Date): Promise<ProjectUsage[]>;
}

export const USAGE_REPOSITORY = Symbol('UsageRepository');
