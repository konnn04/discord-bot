import { Module } from '@nestjs/common';
import { MichosgcService } from './michosgc.service';

@Module({
  providers: [MichosgcService],
  exports: [MichosgcService],
})
export class MichosgcModule {}
