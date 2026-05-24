import { useEffect } from 'react'
import { acquireScreenWakeLock, releaseScreenWakeLock } from './screenWakeLock'

/** Keeps the screen on during an active stretch session (Chrome/Android). */
export function useScreenWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) void releaseScreenWakeLock()
    else void acquireScreenWakeLock()
  }, [active])

  useEffect(() => {
    const onVisibility = (): void => {
      if (document.visibilityState === 'visible' && active)
        void acquireScreenWakeLock()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [active])
}
