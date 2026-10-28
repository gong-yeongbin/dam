import { ApiProperty } from '@nestjs/swagger';

export class ProjectUsageDto {
	@ApiProperty({ example: 10 })
	project_id: number;

	@ApiProperty({ example: 'shop' })
	name: string;

	@ApiProperty({ description: '이번 달 이 프로젝트가 받아 저장한 이벤트 수. 보존 기간이 지나 지워진 것은 빠진다', example: 812 })
	event_count: number;
}

export class UsageDto {
	@ApiProperty({ description: '세는 달(yyyymm). 한국 시각 기준', example: '202610' })
	period: string;

	@ApiProperty({ description: '그 달의 시작(KST 1일 0시)', example: '2026-09-30T15:00:00.000Z' })
	period_start: Date;

	@ApiProperty({ enum: ['free', 'team', 'business'], example: 'team' })
	plan: 'free' | 'team' | 'business';

	@ApiProperty({ description: '플랜에 포함된 월 이벤트 수', example: 10000 })
	included: number;

	@ApiProperty({ description: '이번 달 조직 전체 사용량. 청구 기준(리플레이 포함, 거부된 요청 제외)', example: 1284 })
	used: number;

	@ApiProperty({ type: [ProjectUsageDto], description: '프로젝트별 조회용 수치. 합이 used와 다를 수 있다' })
	projects: ProjectUsageDto[];
}
