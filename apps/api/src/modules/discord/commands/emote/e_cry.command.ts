import { createEmoteCommand } from './_emote-factory';

export default createEmoteCommand(
  'cry',
  'cry',
  'Khóc 😢',
  {
    self: '{user} đang khóc 😢',
    target: '{user} khóc vì {target} 😢',
  },
  0x3498db,
);
