import { createEmoteCommand } from './_emote-factory';

export default createEmoteCommand(
  'kiss',
  'kiss',
  'Hôn ai đó 😘',
  {
    self: '{user} tự hôn mình 😘',
    target: '{user} hôn {target} 😘',
  },
  0xeb459e,
);
