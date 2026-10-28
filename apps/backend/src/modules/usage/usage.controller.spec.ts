import { UsageController } from './usage.controller';
import type { UsageService } from './usage.service';

describe('UsageController', () => {
	const service = { get: vi.fn().mockResolvedValue('usage') };
	const controller = new UsageController(service as unknown as UsageService);

	it('get — 경로의 orgId를 넘긴다', async () => {
		expect(await controller.get({ orgId: 3 })).toBe('usage');
		expect(service.get).toHaveBeenCalledWith(3);
	});
});
