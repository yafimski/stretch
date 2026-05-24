/**
 * Screen Wake Lock (Chrome / Chromium, e.g. Android). Safe no-op if unsupported or denied.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
 */

let sentinel: WakeLockSentinel | null = null

export async function acquireScreenWakeLock(): Promise<void> {
  if (!navigator.wakeLock) return

  try {
    if (sentinel && !sentinel.released) return
    sentinel = null

    const lock = await navigator.wakeLock.request('screen')
    sentinel = lock
    lock.addEventListener('release', () => {
      if (sentinel === lock) sentinel = null
    })
  } catch {
    sentinel = null
  }
}

export async function releaseScreenWakeLock(): Promise<void> {
  const lock = sentinel
  sentinel = null
  if (lock && !lock.released) {
    try {
      await lock.release()
    } catch {
      //
    }
  }
}
