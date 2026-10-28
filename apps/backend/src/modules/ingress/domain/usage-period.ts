const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 사용량을 세는 달(yyyymm). 한국 시각 기준이라 매월 1일 0시(KST)에 바뀐다. 한국은 서머타임이 없어 고정 오프셋으로 계산한다
export function usagePeriod(now: Date): string {
	const kst = new Date(now.getTime() + KST_OFFSET_MS);
	return `${kst.getUTCFullYear()}${String(kst.getUTCMonth() + 1).padStart(2, '0')}`;
}

// 그 달의 시작 시각(KST 1일 0시)을 UTC Date로. 사용량 화면의 프로젝트별 집계가 쓴다
export function usagePeriodStart(now: Date): Date {
	const kst = new Date(now.getTime() + KST_OFFSET_MS);
	return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), 1) - KST_OFFSET_MS);
}
