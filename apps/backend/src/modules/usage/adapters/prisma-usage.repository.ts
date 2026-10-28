import { Injectable } from '@nestjs/common';
import type { Plan } from '@prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';
import type { ProjectUsage, UsageRepository } from '../ports/usage.repository';

@Injectable()
export class PrismaUsageRepository implements UsageRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findPlan(orgId: number): Promise<Plan | null> {
		const org = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { plan: true } });
		return org?.plan ?? null;
	}

	async countEventsByProject(orgId: number, since: Date): Promise<ProjectUsage[]> {
		const [projects, counts] = await Promise.all([
			this.prisma.project.findMany({ where: { organization_id: orgId }, select: { id: true, name: true }, orderBy: { id: 'asc' } }),
			this.prisma.event.groupBy({ by: ['project_id'], where: { project: { organization_id: orgId }, received_at: { gte: since } }, _count: { _all: true } }),
		]);
		const byProject = new Map(counts.map((c) => [c.project_id, c._count._all]));
		return projects.map((p) => ({ project_id: p.id, name: p.name, event_count: byProject.get(p.id) ?? 0 }));
	}
}
