import { createEmoteCommand } from './_emote-factory';

export default createEmoteCommand(
  'slap',
  'slap',
  'Tát ai đó 👋',
  {
    self: '{user} tự tát mình 👋',
    target: '{user} tát {target} 👋',
  },
  0xe74c3c,
);
