import { randomUUID } from 'node:crypto';
import { INCLUDED_EVENTS } from '@/common/plan-limits';
import { usagePeriod } from '@/modules/ingress/domain/usage-period';
import { newSlug } from '@/modules/sources/domain/slug';
import type { UsageDto } from '@/modules/usage/dto/usage.dto';
import { createTestApp, errorOf, type LoggedIn, type TestApp } from './support';

describe('usage (e2e)', () => {
	let t: TestApp;
	let owner: LoggedIn;
	let stranger: LoggedIn;
	let projectId: number;
	let slug: string;

	const auth = (who: LoggedIn) => ({ Authorization: `Bearer ${who.token}` });

	beforeAll(async () => {
		t = await createTestApp();
		[owner, stranger] = [await t.login(), await t.login()];
		await t.prisma.organization.update({ where: { id: owner.org_id }, data: { plan: 'team' } });
		projectId = (await t.prisma.project.create({ data: { organization_id: owner.org_id, name: 'shop' } })).id;
		await t.prisma.project.create({ data: { organization_id: owner.org_id, name: 'blog' } });
		const source = await t.prisma.source.create({ data: { project_id: projectId, slug: newSlug(), name: 's' } });
		const destination = await t.prisma.destination.create({ data: { project_id: projectId, name: 'd', url: 'https://example.com/hook' } });
		await t.prisma.connection.create({ data: { source_id: source.id, destination_id: destination.id } });
		slug = source.slug;
	});

	afterAll(() => t.close());

	it('GET /orgs/:orgId/usage — 받은 웹훅만큼 used가 오르고 프로젝트별로 센다. 거부된 요청은 안 센다', async () => {
		const before = (await t.http().get(`/orgs/${owner.org_id}/usage`).set(auth(owner)).expect(200)).body as UsageDto;
		expect(before).toMatchObject({ period: usagePeriod(new Date()), plan: 'team', included: INCLUDED_EVENTS.team, used: 0 });
		expect(before.projects.map((p) => [p.name, p.event_count])).toEqual([
			['shop', 0],
			['blog', 0],
		]);
		expect(before.projects[0]?.project_id).toBe(projectId);

		for (let i = 0; i < 2; i++) await t.http().post(`/in/${slug}`).set('Content-Type', 'application/json').send(JSON.stringify({ order: randomUUID() })).expect(200);
		// 없는 소스로 보낸 것은 거부라 안 센다
		await t.http().post(`/in/${newSlug()}`).send('{}').expect(404);

		const after = (await t.http().get(`/orgs/${owner.org_id}/usage`).set(auth(owner)).expect(200)).body as UsageDto;
		expect(after.used).toBe(2);
		expect(after.projects.find((p) => p.project_id === projectId)?.event_count).toBe(2);
		expect(new Date(after.period_start).getTime()).toBeLessThanOrEqual(Date.now());
	});

	it('타 조직은 404 organization_not_found', async () => {
		const response = await t.http().get(`/orgs/${owner.org_id}/usage`).set(auth(stranger)).expect(404);
		expect(errorOf(response).code).toBe('organization_not_found');
	});

	it('토큰이 없으면 401', async () => {
		await t.http().get(`/orgs/${owner.org_id}/usage`).expect(401);
	});
});
