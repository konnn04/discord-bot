import { Module, Global } from '@nestjs/common';
import { XpBufferService } from './services/xp-buffer/xp-buffer.service';

@Global()
@Module({
  providers: [XpBufferService],
  exports: [XpBufferService],
})
export class XpModule {}
