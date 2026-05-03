import { Test, TestingModule } from '@nestjs/testing';
import { XpBufferService } from './xp-buffer.service';

describe('XpBufferService', () => {
  let service: XpBufferService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [XpBufferService],
    }).compile();

    service = module.get<XpBufferService>(XpBufferService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
