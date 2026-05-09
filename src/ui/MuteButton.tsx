import { useEffect, useState } from 'react';
import { isMuted, playSfx, setMuted, subscribeMute } from './audio';

export function MuteButton() {
  const [muted, set] = useState(isMuted);

  useEffect(() => subscribeMute(set), []);

  const toggle = () => {
    const next = !muted;
    setMuted(next);
    if (!next) playSfx('click');
  };

  return (
    <button
      type="button"
      className="mute-btn"
      onClick={toggle}
      aria-label={muted ? 'Unmute' : 'Mute'}
      aria-pressed={muted}
    >
      {muted ? 'sound: off' : 'sound: on'}
    </button>
  );
}
