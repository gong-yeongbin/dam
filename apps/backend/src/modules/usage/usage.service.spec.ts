import { NotFoundException } from '@nestjs/common';
import type { Plan } from '@prisma/client';
import type { IngressCounters } from '@/modules/ingress/ports/ingress.counters';
import type { ProjectUsage, UsageRepository } from './ports/usage.repository';
import { UsageService } from './usage.service';

// port를 in-memory fake로 둔다. 근거는 context-notes.md "계층별 테스트"
class FakeUsage implements UsageRepository {
	plans = new Map<number, Plan>([[1, 'team']]);
	projects: ProjectUsage[] = [
		{ project_id: 10, name: 'shop', event_count: 812 },
		{ project_id: 11, name: 'blog', event_count: 0 },
	];
	since: Date | null = null;

	findPlan(orgId: number) {
		return Promise.resolve(this.plans.get(orgId) ?? null);
	}
	countEventsByProject(_orgId: number, since: Date) {
		this.since = since;
		return Promise.resolve(this.projects);
	}
}

class FakeCounters implements Pick<IngressCounters, 'getUsage'> {
	asked: [number, string] | null = null;
	getUsage(organizationId: number, period: string) {
		this.asked = [organizationId, period];
		return Promise.resolve(1284);
	}
}

describe('UsageService', () => {
	it('get — 이번 달(KST) 카운터와 포함량, 프로젝트별 수를 준다', async () => {
		const usage = new FakeUsage();
		const counters = new FakeCounters();
		const service = new UsageService(usage, counters as unknown as IngressCounters);

		const result = await service.get(1, new Date('2026-10-15T03:00:00Z'));

		expect(result).toEqual({ period: '202610', period_start: new Date('2026-09-30T15:00:00Z'), plan: 'team', included: 10_000, used: 1284, projects: usage.projects });
		expect(counters.asked).toEqual([1, '202610']);
		expect(usage.since).toEqual(new Date('2026-09-30T15:00:00Z'));
	});

	it('get — free는 포함량 1,000', async () => {
		const usage = new FakeUsage();
		usage.plans.set(2, 'free');
		const service = new UsageService(usage, new FakeCounters() as unknown as IngressCounters);
		expect((await service.get(2, new Date('2026-10-15T03:00:00Z'))).included).toBe(1_000);
	});

	it('get — 없는 조직은 404 organization_not_found', async () => {
		const service = new UsageService(new FakeUsage(), new FakeCounters() as unknown as IngressCounters);
		await expect(service.get(9)).rejects.toThrow(NotFoundException);
	});
});
