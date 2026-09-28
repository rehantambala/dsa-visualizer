/**
 * frontend/src/hooks/useSound.js
 *
 * Thin React wrapper around components/utils/audioEngine.js. Any component can
 * call `const { sounds } = useSound()` and fire `sounds.push()`, `sounds.compare(42)`,
 * etc. without prop-drilling. Components that render the mute/volume control also
 * get reactive `muted`/`volume` state kept in sync across every instance.
 */
import { useCallback, useEffect, useState } from "react";
import {
  sounds,
  isMuted,
  getVolume,
  setMuted,
  setVolume,
  toggleMuted,
  subscribeSoundSettings,
  primeAudio,
} from "../components/utils/audioEngine.js";

export function useSound() {
  const [muted, setMutedState] = useState(isMuted());
  const [volume, setVolumeState] = useState(getVolume());

  useEffect(
    () =>
      subscribeSoundSettings((settings) => {
        setMutedState(settings.muted);
        setVolumeState(settings.volume);
      }),
    []
  );

  const toggle = useCallback(() => {
    primeAudio();
    toggleMuted();
  }, []);

  const changeVolume = useCallback((v) => {
    primeAudio();
    setVolume(v);
  }, []);

  return { muted, volume, toggle, setVolume: changeVolume, sounds, primeAudio, setMuted };
}
