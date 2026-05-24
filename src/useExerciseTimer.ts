import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import {
  CHIME_SOUND,
  REPEAT_SOUND,
  REST_SOUND,
  exerciseStartSound,
  playSequential,
} from './publicAudio'
import {
  acquireScreenWakeLock,
  releaseScreenWakeLock,
} from './screenWakeLock'

export type Duration = 15 | 30 | 60
export type Phase = 'idle' | 'exercise' | 'pause'
export type RunMode = 'single' | 'sequence'

const PAUSE_DURATION = 10
const EXERCISES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

/** Default seconds per exercise; override per-number in UI. */
export const DEFAULT_EXERCISE_DURATIONS: Record<number, Duration> = {
  1: 30,
  2: 15,
  3: 15,
  4: 15,
  5: 15,
  6: 60,
  7: 15,
  8: 15,
  9: 60,
}

function durationForExercise(
  map: Record<number, Duration>,
  n: number,
): Duration {
  return map[n] ?? 30
}

/** Holds per segment before rest / next exercise */
const REPEATS_FOR_EXERCISE: Partial<Record<number, number>> = {
  2: 4,
  3: 4,
  4: 4,
  5: 4,
  7: 4,
  8: 4,
}

function repeatsForExercise(n: number): number {
  return REPEATS_FOR_EXERCISE[n] ?? 1
}

export function useExerciseTimer(
  exerciseDurations: Record<number, Duration>,
  autoPause: boolean,
) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [currentExercise, setCurrentExercise] = useState<number | null>(null)
  const [runMode, setRunMode] = useState<RunMode>('single')
  const [remainingSec, setRemainingSec] = useState(0)
  const [isPreparing, setIsPreparing] = useState(false)
  const [timerPaused, setTimerPaused] = useState(false)
  const [repeatAudioPlaying, setRepeatAudioPlaying] = useState(false)

  const sessionRef = useRef(0)
  const exerciseDurationsRef = useRef(exerciseDurations)
  const autoPauseRef = useRef(autoPause)
  const holdsLeftInSegmentRef = useRef(1)
  const timerPausedRef = useRef(timerPaused)

  /** Prevents Strict Mode / double-invoke from decrementing repeats twice */
  const completionLockExerciseRef = useRef(false)
  const completionLockPauseRef = useRef(false)

  useLayoutEffect(() => {
    exerciseDurationsRef.current = exerciseDurations
    autoPauseRef.current = autoPause
    timerPausedRef.current = timerPaused
  }, [exerciseDurations, autoPause, timerPaused])

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
    holdsLeftInSegmentRef.current = 1
  }, [])

  const togglePause = useCallback(() => {
    setTimerPaused((p) => !p)
  }, [])

  const beginExercise = useCallback(
    async (n: number, mode: RunMode, session: number) => {
      completionLockExerciseRef.current = false
      completionLockPauseRef.current = false
      setRunMode(mode)
      setCurrentExercise(n)
      setPhase('exercise')
      setIsPreparing(true)
      setRemainingSec(0)
      setTimerPaused(false)
      holdsLeftInSegmentRef.current = repeatsForExercise(n)

      await playSequential([exerciseStartSound(n), CHIME_SOUND])
      if (session !== sessionRef.current) return

      setIsPreparing(false)
      setRemainingSec(durationForExercise(exerciseDurationsRef.current, n))
    },
    [],
  )

  const advanceAfterExercise = useCallback(
    async (n: number, mode: RunMode, session: number) => {
      await playSequential([CHIME_SOUND])
      if (session !== sessionRef.current) return

      if (autoPauseRef.current) {
        setPhase('pause')
        setRemainingSec(PAUSE_DURATION)
        void playSequential([REST_SOUND])
        return
      }

      if (mode === 'sequence' && n < 9) {
        await beginExercise(n + 1, mode, session)
        return
      }

      stop()
    },
    [beginExercise, stop],
  )

  const advanceAfterPause = useCallback(
    async (n: number, mode: RunMode, session: number) => {
      completionLockExerciseRef.current = false
      if (mode === 'sequence' && n < 9) {
        await beginExercise(n + 1, mode, session)
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
      repeatAudioPlaying
    )
      return

    const timer = window.setTimeout(() => {
      setRemainingSec((prev) => prev - 1)
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [phase, isPreparing, remainingSec, timerPaused, repeatAudioPlaying])

  useEffect(() => {
    if (
      phase !== 'exercise' ||
      isPreparing ||
      timerPaused ||
      remainingSec !== 0 ||
      currentExercise === null
    )
      return

    if (completionLockExerciseRef.current) return
    completionLockExerciseRef.current = true

    const session = sessionRef.current
    const n = currentExercise
    const mode = runMode
    holdsLeftInSegmentRef.current -= 1
    const holdsLeftNow = holdsLeftInSegmentRef.current

    void (async () => {
      if (holdsLeftNow > 0) {
        setRepeatAudioPlaying(true)
        try {
          await playSequential([REPEAT_SOUND])
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
        setRemainingSec(
          durationForExercise(exerciseDurationsRef.current, n),
        )
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
    currentExercise,
    runMode,
    advanceAfterExercise,
  ])

  useEffect(() => {
    if (phase !== 'pause' || timerPaused || remainingSec !== 0) return
    if (currentExercise === null) return

    if (completionLockPauseRef.current) return
    completionLockPauseRef.current = true

    const session = sessionRef.current
    const n = currentExercise
    const mode = runMode

    void advanceAfterPause(n, mode, session).finally(() => {
      completionLockPauseRef.current = false
    })
  }, [
    phase,
    timerPaused,
    remainingSec,
    currentExercise,
    runMode,
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
    exercises: EXERCISES,
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
): number | null {
  if (currentExercise === null) return null
  if (phase === 'pause' && runMode === 'sequence' && currentExercise < 9)
    return currentExercise + 1
  return currentExercise
}
