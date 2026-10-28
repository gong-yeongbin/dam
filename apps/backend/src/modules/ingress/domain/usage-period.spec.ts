import { usagePeriod, usagePeriodStart } from './usage-period';

describe('usagePeriod', () => {
	it('한국 시각 기준의 yyyymm', () => {
		expect(usagePeriod(new Date('2026-10-15T03:00:00Z'))).toBe('202610');
		expect(usagePeriod(new Date('2026-01-05T00:00:00Z'))).toBe('202601');
	});

	it('한국 시각으로 1일 0시에 달이 바뀐다 (UTC로는 전날 15시)', () => {
		expect(usagePeriod(new Date('2026-10-31T14:59:59Z'))).toBe('202610');
		expect(usagePeriod(new Date('2026-10-31T15:00:00Z'))).toBe('202611');
	});

	it('해가 바뀐다', () => {
		expect(usagePeriod(new Date('2026-12-31T15:00:00Z'))).toBe('202701');
	});

	it('usagePeriodStart — KST 1일 0시를 UTC로. 1일 0시 직전(UTC 15:00 전)은 앞 달', () => {
		expect(usagePeriodStart(new Date('2026-10-15T03:00:00Z')).toISOString()).toBe('2026-09-30T15:00:00.000Z');
		expect(usagePeriodStart(new Date('2026-10-31T14:59:59Z')).toISOString()).toBe('2026-09-30T15:00:00.000Z');
		expect(usagePeriodStart(new Date('2026-10-31T15:00:00Z')).toISOString()).toBe('2026-10-31T15:00:00.000Z');
	});
});
