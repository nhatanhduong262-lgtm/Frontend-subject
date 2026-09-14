import { useEffect, useRef } from 'react';
import { addPlaytimeRecord } from '../lib/playerProgress';

export function usePlaytime(gameMeta) {
  const startTimeRef = useRef(Date.now());
  const lastSaveTimeRef = useRef(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
    lastSaveTimeRef.current = Date.now();

    const saveInterval = setInterval(() => {
      const now = Date.now();
      const elapsedSinceLastSave = Math.floor((now - lastSaveTimeRef.current) / 1000);
      if (elapsedSinceLastSave > 0) {
        addPlaytimeRecord(gameMeta, elapsedSinceLastSave);
        lastSaveTimeRef.current = now;
      }
    }, 10000); // Save every 10 seconds

    return () => {
      clearInterval(saveInterval);
      const now = Date.now();
      const elapsedSinceLastSave = Math.floor((now - lastSaveTimeRef.current) / 1000);
      if (elapsedSinceLastSave > 0) {
        addPlaytimeRecord(gameMeta, elapsedSinceLastSave);
      }
    };
  }, [gameMeta.title, gameMeta.genre, gameMeta.href]);
}
