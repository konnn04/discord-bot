import { createEmoteCommand } from './_emote-factory';

export default createEmoteCommand(
  'wave',
  'wave',
  'Vẫy tay 👋',
  {
    self: '{user} vẫy tay 👋',
    target: '{user} vẫy tay chào {target} 👋',
  },
  0x1abc9c,
);
