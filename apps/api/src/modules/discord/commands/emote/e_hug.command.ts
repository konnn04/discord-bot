import { createEmoteCommand } from './_emote-factory';

export default createEmoteCommand(
  'hug',
  'hug',
  'Ôm ai đó 🤗',
  {
    self: '{user} tự ôm mình 🤗',
    target: '{user} ôm {target} 🤗',
  },
  0xfee75c,
);
