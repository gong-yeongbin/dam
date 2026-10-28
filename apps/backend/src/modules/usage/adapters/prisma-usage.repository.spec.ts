import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { PrismaUsageRepository } from './prisma-usage.repository';

// adapter는 docker compose의 postgres 위에서 통합으로 본다(`pnpm docker:up && pnpm db:deploy` 선행)
describe('PrismaUsageRepository (통합)', () => {
	const prisma = new PrismaService(new ConfigService({ DATABASE_URL: process.env.DATABASE_URL }));
	const repo = new PrismaUsageRepository(prisma);
	let orgId: number;
	let other: number;
	let shop: number;
	let blog: number;

	beforeAll(async () => {
		await prisma.onModuleInit();
		orgId = (await prisma.organization.create({ data: { name: `usage-${randomUUID()}`, plan: 'team' } })).id;
		other = (await prisma.organization.create({ data: { name: `usage-other-${randomUUID()}`, plan: 'free' } })).id;
		shop = (await prisma.project.create({ data: { organization_id: orgId, name: 'shop' } })).id;
		blog = (await prisma.project.create({ data: { organization_id: orgId, name: 'blog' } })).id;
		const otherProject = (await prisma.project.create({ data: { organization_id: other, name: 'x' } })).id;
		const event = (project_id: number, received_at: string, key: string) => ({ project_id, idempotency_key: key, headers: {}, body: new Uint8Array(0), size: 0, received_at: new Date(received_at) });
		await prisma.event.createMany({
			data: [
				event(shop, '2026-10-05T00:00:00Z', 'a'),
				event(shop, '2026-10-20T00:00:00Z', 'b'),
				// 월초 전 것은 빠진다
				event(shop, '2026-09-30T14:59:59Z', 'c'),
				event(otherProject, '2026-10-05T00:00:00Z', 'd'),
			],
		});
	});

	afterAll(async () => {
		await prisma.project.deleteMany({ where: { organization_id: { in: [orgId, other] } } });
		await prisma.organization.deleteMany({ where: { id: { in: [orgId, other] } } });
		await prisma.onModuleDestroy();
	});

	it('findPlan — 조직의 플랜. 없으면 null', async () => {
		expect(await repo.findPlan(orgId)).toBe('team');
		expect(await repo.findPlan(0)).toBeNull();
	});

	it('countEventsByProject — 그 조직의 프로젝트만, since 이후 이벤트만, 없는 프로젝트는 0', async () => {
		expect(await repo.countEventsByProject(orgId, new Date('2026-09-30T15:00:00Z'))).toEqual([
			{ project_id: shop, name: 'shop', event_count: 2 },
			{ project_id: blog, name: 'blog', event_count: 0 },
		]);
	});
});
