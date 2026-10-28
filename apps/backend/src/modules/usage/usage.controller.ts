import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/auth/decorators';
import { OrgIdParamDto } from '@/common/http/params';
import { UsageDto } from './dto/usage.dto';
import { UsageService } from './usage.service';

@ApiTags('usage')
@Controller('orgs/:orgId/usage')
export class UsageController {
	constructor(private readonly usage: UsageService) {}

	@Roles('member')
	@Get()
	@ApiOperation({ summary: '이번 달(KST) 조직 사용량과 포함량, 프로젝트별 이벤트 수를 조회한다' })
	@ApiResponse({ status: 200, type: UsageDto })
	@ApiResponse({ status: 404, description: 'organization_not_found — 없거나 소속이 아님' })
	get(@Param() { orgId }: OrgIdParamDto): Promise<UsageDto> {
		return this.usage.get(orgId);
	}
}
