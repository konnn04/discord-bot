import { createEmoteCommand } from './_emote-factory';

export default createEmoteCommand(
  'poke',
  'poke',
  'Chọc ai đó 👉',
  {
    self: '{user} tự chọc mình 👉',
    target: '{user} chọc {target} 👉',
  },
  0xf39c12,
);
