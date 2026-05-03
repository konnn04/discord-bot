import { createEmoteCommand } from './_emote-factory';

export default createEmoteCommand(
  'punch',
  'punch',
  'Đấm ai đó 🤜',
  {
    self: '{user} tự đấm mình 🤜',
    target: '{user} đấm {target} 🤜',
  },
  0x1abc9c,
);
