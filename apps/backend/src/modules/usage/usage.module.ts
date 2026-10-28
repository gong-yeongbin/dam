import { Module } from '@nestjs/common';
import { IngressModule } from '@/modules/ingress/ingress.module';
import { PrismaUsageRepository } from './adapters/prisma-usage.repository';
import { USAGE_REPOSITORY } from './ports/usage.repository';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';

// 인그레스가 세는 카운터를 그대로 읽는다(IngressModule이 INGRESS_COUNTERS를 export)
@Module({
	imports: [IngressModule],
	controllers: [UsageController],
	providers: [UsageService, { provide: USAGE_REPOSITORY, useClass: PrismaUsageRepository }],
})
export class UsageModule {}
