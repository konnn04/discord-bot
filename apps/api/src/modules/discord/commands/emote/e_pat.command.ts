import { createEmoteCommand } from './_emote-factory';

export default createEmoteCommand(
  'pat',
  'pat',
  'Xoa đầu ai đó 🥰',
  {
    self: '{user} tự xoa đầu mình 🥰',
    target: '{user} xoa đầu {target} 🥰',
  },
  0x57f287,
);
