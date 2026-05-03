import { createEmoteCommand } from './_emote-factory';

export default createEmoteCommand(
  'bite',
  'bite',
  'Cắn ai đó 😈',
  {
    self: '{user} tự cắn mình 😈',
    target: '{user} cắn {target} 😈',
  },
  0xed4245,
);
