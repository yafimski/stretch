import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import {
  CHIME_SOUND,
  EXERCISE_COUNT,
  EXERCISE_NUMBERS,
  REPEAT_SOUND,
  REST_SOUND,
  exerciseStartSound,
  playSequential,
} from './publicAudio'
import {
  acquireScreenWakeLock,
  releaseScreenWakeLock,
} from './screenWakeLock'

export type Duration = 10 | 20 | 40
export type RepeatCount = 1 | 2 | 3 | 4
export type Phase = 'idle' | 'exercise' | 'pause'
export type RunMode = 'single' | 'sequence'
export type PauseKind = 'between-repeats' | 'between-exercises' | null

const PAUSE_DURATION = 15
const REST_SOUND_TOTAL_SEC = 3
/** Min seconds between repeats (between holds of the same exercise). */
const REPEAT_PAUSE_SEC = 5
/** Default seconds per exercise; override per-number in UI. */
export const DEFAULT_EXERCISE_DURATIONS: Record<number, Duration> =
  Object.fromEntries(EXERCISE_NUMBERS.map((n) => [n, 20]))

function durationForExercise(
  map: Record<number, Duration>,
  n: number,
): Duration {
  return map[n] ?? 20
}

/** Default repeat counts per exercise; can be changed from UI. */
const DEFAULT_REPEAT_OVERRIDES: Partial<Record<number, RepeatCount>> = {
  1: 2,
  2: 2,
  3: 2,
  4: 2,
  5: 1,
  6: 2,
  7: 2,
}

export const DEFAULT_EXERCISE_REPEATS: Record<number, RepeatCount> =
  Object.fromEntries(
    EXERCISE_NUMBERS.map((n) => [n, DEFAULT_REPEAT_OVERRIDES[n] ?? 1]),
  ) as Record<number, RepeatCount>

export function useExerciseTimer(
  exerciseDurations: Record<number, Duration>,
  exerciseRepeats: Record<number, RepeatCount>,
  autoPause: boolean,
) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [currentExercise, setCurrentExercise] = useState<number | null>(null)
  const [runMode, setRunMode] = useState<RunMode>('single')
  const [remainingSec, setRemainingSec] = useState(0)
  const [isPreparing, setIsPreparing] = useState(false)
  const [timerPaused, setTimerPaused] = useState(false)
  const [repeatAudioPlaying, setRepeatAudioPlaying] = useState(false)
  const [soundActive, setSoundActive] = useState(false)
  const [pauseKind, setPauseKind] = useState<PauseKind>(null)

  const sessionRef = useRef(0)
  const exerciseDurationsRef = useRef(exerciseDurations)
  const exerciseRepeatsRef = useRef(exerciseRepeats)
  const autoPauseRef = useRef(autoPause)
  const completedHoldsInSegmentRef = useRef(0)
  const timerPausedRef = useRef(timerPaused)

  /** Prevents Strict Mode / double-invoke from decrementing repeats twice */
  const completionLockExerciseRef = useRef(false)
  const completionLockPauseRef = useRef(false)

  useLayoutEffect(() => {
    exerciseDurationsRef.current = exerciseDurations
    exerciseRepeatsRef.current = exerciseRepeats
    autoPauseRef.current = autoPause
    timerPausedRef.current = timerPaused
  }, [exerciseDurations, exerciseRepeats, autoPause, timerPaused])

  const stop = useCallback(() => {
    void releaseScreenWakeLock()
    sessionRef.current += 1
    completionLockExerciseRef.current = false
    completionLockPauseRef.current = false
    setPhase('idle')
    setCurrentExercise(null)
    setRemainingSec(0)
    setIsPreparing(false)
    setTimerPaused(false)
    setRepeatAudioPlaying(false)
    setSoundActive(false)
    setPauseKind(null)
    completedHoldsInSegmentRef.current = 0
  }, [])

  const togglePause = useCallback(() => {
    setTimerPaused((p) => !p)
  }, [])

  const playWithTimerPause = useCallback(
    async (urls: string[], minDurationSec = 0) => {
      setSoundActive(true)
      try {
        const startedAt = Date.now()
        await playSequential(urls)
        const minDurationMs = minDurationSec * 1000
        const waitMs = minDurationMs - (Date.now() - startedAt)
        if (waitMs > 0) {
          await new Promise<void>((resolve) =>
            window.setTimeout(resolve, waitMs),
          )
        }
      } finally {
        setSoundActive(false)
      }
    },
    [],
  )

  const beginExercise = useCallback(
    async (
      n: number,
      mode: RunMode,
      session: number,
      includeExercisePrompt = true,
    ) => {
      completionLockExerciseRef.current = false
      completionLockPauseRef.current = false
      setRunMode(mode)
      setCurrentExercise(n)
      setPhase('exercise')
      setIsPreparing(true)
      setRemainingSec(0)
      setTimerPaused(false)
      completedHoldsInSegmentRef.current = 0

      if (includeExercisePrompt) {
        await playWithTimerPause([exerciseStartSound(n), CHIME_SOUND])
      } else {
        await playWithTimerPause([CHIME_SOUND])
      }
      if (session !== sessionRef.current) return

      setIsPreparing(false)
      setRemainingSec(durationForExercise(exerciseDurationsRef.current, n))
    },
    [playWithTimerPause],
  )

  const advanceAfterExercise = useCallback(
    async (n: number, mode: RunMode, session: number) => {
      await playWithTimerPause([CHIME_SOUND])
      if (session !== sessionRef.current) return

      if (autoPauseRef.current) {
        await playWithTimerPause([REST_SOUND], REST_SOUND_TOTAL_SEC)
        if (session !== sessionRef.current) return
        setPauseKind('between-exercises')
        setPhase('pause')
        setRemainingSec(PAUSE_DURATION)
        return
      }

      if (mode === 'sequence' && n < EXERCISE_COUNT) {
        await beginExercise(n + 1, mode, session)
        return
      }

      stop()
    },
    [beginExercise, playWithTimerPause, stop],
  )

  const advanceAfterPause = useCallback(
    async (
      n: number,
      mode: RunMode,
      session: number,
      currentPauseKind: PauseKind,
    ) => {
      completionLockExerciseRef.current = false
      setPauseKind(null)

      if (currentPauseKind === 'between-repeats') {
        setPhase('exercise')
        setRemainingSec(durationForExercise(exerciseDurationsRef.current, n))
        return
      }

      if (mode === 'sequence' && n < EXERCISE_COUNT) {
        await beginExercise(n + 1, mode, session, false)
        return
      }

      stop()
    },
    [beginExercise, stop],
  )

  const startSingle = useCallback(
    (n: number) => {
      void acquireScreenWakeLock()
      const session = sessionRef.current + 1
      sessionRef.current = session
      void beginExercise(n, 'single', session)
    },
    [beginExercise],
  )

  const startSequence = useCallback(() => {
    if (EXERCISE_COUNT < 1) return
    void acquireScreenWakeLock()
    const session = sessionRef.current + 1
    sessionRef.current = session
    void beginExercise(1, 'sequence', session)
  }, [beginExercise])

  useEffect(() => {
    if (
      phase === 'idle' ||
      isPreparing ||
      remainingSec <= 0 ||
      timerPaused ||
      repeatAudioPlaying ||
      soundActive
    )
      return

    const timer = window.setTimeout(() => {
      setRemainingSec((prev) => prev - 1)
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [
    phase,
    isPreparing,
    remainingSec,
    timerPaused,
    repeatAudioPlaying,
    soundActive,
  ])

  useEffect(() => {
    if (
      phase !== 'exercise' ||
      isPreparing ||
      timerPaused ||
      soundActive ||
      remainingSec !== 0 ||
      currentExercise === null
    )
      return

    if (completionLockExerciseRef.current) return
    completionLockExerciseRef.current = true

    const session = sessionRef.current
    const n = currentExercise
    const mode = runMode
    completedHoldsInSegmentRef.current += 1
    const completedHolds = completedHoldsInSegmentRef.current
    const targetRepeats = exerciseRepeatsRef.current[n] ?? 1

    void (async () => {
      if (completedHolds < targetRepeats) {
        setRepeatAudioPlaying(true)
        try {
          await playWithTimerPause([REPEAT_SOUND])
        } finally {
          setRepeatAudioPlaying(false)
        }
        completionLockExerciseRef.current = false
        if (
          session !== sessionRef.current ||
          timerPausedRef.current
        ) {
          return
        }
        setPauseKind('between-repeats')
        setPhase('pause')
        setRemainingSec(REPEAT_PAUSE_SEC)
        return
      }

      await advanceAfterExercise(n, mode, session)
      completionLockExerciseRef.current = false
    })()
  }, [
    phase,
    isPreparing,
    remainingSec,
    timerPaused,
    soundActive,
    currentExercise,
    runMode,
    advanceAfterExercise,
    playWithTimerPause,
  ])

  useEffect(() => {
    if (phase !== 'pause' || timerPaused || soundActive || remainingSec !== 0)
      return
    if (currentExercise === null) return

    if (completionLockPauseRef.current) return
    completionLockPauseRef.current = true

    const session = sessionRef.current
    const n = currentExercise
    const mode = runMode
    const currentPauseKind = pauseKind

    void advanceAfterPause(n, mode, session, currentPauseKind).finally(() => {
      completionLockPauseRef.current = false
    })
  }, [
    phase,
    timerPaused,
    soundActive,
    remainingSec,
    currentExercise,
    runMode,
    pauseKind,
    advanceAfterPause,
  ])

  return {
    phase,
    currentExercise,
    runMode,
    remainingSec,
    isPreparing,
    timerPaused,
    repeatAudioPlaying,
    pauseKind,
    exercises: EXERCISE_NUMBERS,
    startSingle,
    startSequence,
    stop,
    togglePause,
    isActive: phase !== 'idle',
  }
}

export function modalPreviewExercise(
  phase: Phase,
  runMode: RunMode,
  currentExercise: number | null,
  exerciseCount: number,
  pauseKind: PauseKind,
): number | null {
  if (currentExercise === null) return null
  if (
    phase === 'pause' &&
    pauseKind === 'between-exercises' &&
    runMode === 'sequence' &&
    currentExercise < exerciseCount
  )
    return currentExercise + 1
  return currentExercise
}
