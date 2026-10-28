import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { INCLUDED_EVENTS } from '@/common/plan-limits';
import { usagePeriod, usagePeriodStart } from '@/modules/ingress/domain/usage-period';
import { INGRESS_COUNTERS, type IngressCounters } from '@/modules/ingress/ports/ingress.counters';
import type { UsageDto } from './dto/usage.dto';
import { USAGE_REPOSITORY, type UsageRepository } from './ports/usage.repository';

@Injectable()
export class UsageService {
	constructor(
		@Inject(USAGE_REPOSITORY) private readonly usage: UsageRepository,
		@Inject(INGRESS_COUNTERS) private readonly counters: IngressCounters,
	) {}

	// 이번 달(KST) 조직 사용량. used는 인그레스가 세는 Valkey 카운터(리플레이 포함·거부 제외)라 청구 기준과 같다.
	// projects는 DB의 event 행을 센 조회용 수치라 보존 기간이 지나 지워진 만큼 used보다 작을 수 있다
	async get(orgId: number, now = new Date()): Promise<UsageDto> {
		const plan = await this.usage.findPlan(orgId);
		if (!plan) throw new NotFoundException({ code: 'organization_not_found', message: '조직이 없습니다.' });
		const period = usagePeriod(now);
		const [used, projects] = await Promise.all([this.counters.getUsage(orgId, period), this.usage.countEventsByProject(orgId, usagePeriodStart(now))]);
		return { period, period_start: usagePeriodStart(now), plan, included: INCLUDED_EVENTS[plan], used, projects };
	}
}
