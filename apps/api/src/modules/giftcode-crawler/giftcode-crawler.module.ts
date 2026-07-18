import { Module } from '@nestjs/common';
import { GiftcodeCrawlerService } from './giftcode-crawler.service';

@Module({
  providers: [GiftcodeCrawlerService],
  exports: [GiftcodeCrawlerService],
})
export class GiftcodeCrawlerModule {}
