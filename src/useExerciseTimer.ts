import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CHIME_SOUND,
  exerciseStartSound,
  playSequential,
} from './publicAudio'

export type Duration = 15 | 30 | 60
export type Phase = 'idle' | 'exercise' | 'pause'
export type RunMode = 'single' | 'sequence'

const PAUSE_DURATION = 10
const EXERCISES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

export function useExerciseTimer(duration: Duration, autoPause: boolean) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [currentExercise, setCurrentExercise] = useState<number | null>(null)
  const [runMode, setRunMode] = useState<RunMode>('single')
  const [remainingSec, setRemainingSec] = useState(0)
  const [isPreparing, setIsPreparing] = useState(false)

  const sessionRef = useRef(0)
  const durationRef = useRef(duration)
  const autoPauseRef = useRef(autoPause)

  durationRef.current = duration
  autoPauseRef.current = autoPause

  const stop = useCallback(() => {
    sessionRef.current += 1
    setPhase('idle')
    setCurrentExercise(null)
    setRemainingSec(0)
    setIsPreparing(false)
  }, [])

  const beginExercise = useCallback(
    async (n: number, mode: RunMode, session: number) => {
      setRunMode(mode)
      setCurrentExercise(n)
      setPhase('exercise')
      setIsPreparing(true)
      setRemainingSec(0)

      await playSequential([exerciseStartSound(n), CHIME_SOUND])
      if (session !== sessionRef.current) return

      setIsPreparing(false)
      setRemainingSec(durationRef.current)
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
      const session = sessionRef.current + 1
      sessionRef.current = session
      void beginExercise(n, 'single', session)
    },
    [beginExercise],
  )

  const startSequence = useCallback(() => {
    const session = sessionRef.current + 1
    sessionRef.current = session
    void beginExercise(1, 'sequence', session)
  }, [beginExercise])

  useEffect(() => {
    if (phase === 'idle' || isPreparing || remainingSec <= 0) return

    const timer = window.setTimeout(() => {
      setRemainingSec((prev) => prev - 1)
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [phase, isPreparing, remainingSec])

  useEffect(() => {
    if (phase === 'idle' || isPreparing || remainingSec > 0) return
    if (currentExercise === null) return

    const session = sessionRef.current
    const n = currentExercise
    const mode = runMode

    if (phase === 'exercise') {
      void advanceAfterExercise(n, mode, session)
      return
    }

    if (phase === 'pause') {
      void advanceAfterPause(n, mode, session)
    }
  }, [
    phase,
    isPreparing,
    remainingSec,
    currentExercise,
    runMode,
    advanceAfterExercise,
    advanceAfterPause,
  ])

  return {
    phase,
    currentExercise,
    remainingSec,
    isPreparing,
    exercises: EXERCISES,
    startSingle,
    startSequence,
    stop,
    isActive: phase !== 'idle',
  }
}
