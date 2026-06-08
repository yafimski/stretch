import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { EXERCISE_COUNT, EXERCISE_NUMBERS, playSequential } from "./publicAudio";
import { buildExerciseTimeline, type RepeatCount, type TimelineStage } from "./exerciseTimeline";
import { acquireScreenWakeLock, releaseScreenWakeLock } from "./screenWakeLock";

export type Duration = 10 | 20 | 40;
export type { RepeatCount } from "./exerciseTimeline";
export type RunMode = "single" | "sequence";

/** Default seconds per exercise; override per-number in UI. */
export const DEFAULT_EXERCISE_DURATIONS: Record<number, Duration> = {
  1: 20,
  2: 20,
  3: 20,
  4: 20,
  5: 40,
  6: 20,
  7: 10,
  8: 10,
  9: 40
};

/** Default repeat counts per exercise; can be changed from UI. */
const DEFAULT_REPEAT_OVERRIDES: Partial<Record<number, RepeatCount>> = {
  1: 2,
  2: 2,
  3: 2,
  4: 2,
  5: 1,
  6: 2,
  7: 2,
  8: 2,
  9: 1
};

export const DEFAULT_EXERCISE_REPEATS: Record<number, RepeatCount> = Object.fromEntries(
  EXERCISE_NUMBERS.map((n) => [n, DEFAULT_REPEAT_OVERRIDES[n] ?? 1])
) as Record<number, RepeatCount>;

export function useExerciseTimer(
  exerciseDurations: Record<number, Duration>,
  exerciseRepeats: Record<number, RepeatCount>,
  autoPause: boolean
) {
  const [currentExercise, setCurrentExercise] = useState<number | null>(null);
  const [runMode, setRunMode] = useState<RunMode>("single");
  const [timelineStages, setTimelineStages] = useState<TimelineStage[]>([]);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [remainingSec, setRemainingSec] = useState(0);
  const [timerPaused, setTimerPaused] = useState(false);
  const [soundActive, setSoundActive] = useState(false);

  const sessionRef = useRef(0);
  const exerciseDurationsRef = useRef(exerciseDurations);
  const exerciseRepeatsRef = useRef(exerciseRepeats);
  const autoPauseRef = useRef(autoPause);
  const timerPausedRef = useRef(timerPaused);
  const stageEnterLockRef = useRef(false);
  const stageCompleteLockRef = useRef(false);
  /** False until remainingSec has been set for the current timed stage. */
  const timerReadyRef = useRef(false);
  const timelineStagesRef = useRef<TimelineStage[]>([]);
  const currentStageIndexRef = useRef(0);
  const runModeRef = useRef<RunMode>("single");
  const currentExerciseRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    exerciseDurationsRef.current = exerciseDurations;
    exerciseRepeatsRef.current = exerciseRepeats;
    autoPauseRef.current = autoPause;
    timerPausedRef.current = timerPaused;
    timelineStagesRef.current = timelineStages;
    currentStageIndexRef.current = currentStageIndex;
    runModeRef.current = runMode;
    currentExerciseRef.current = currentExercise;
  }, [
    exerciseDurations,
    exerciseRepeats,
    autoPause,
    timerPaused,
    timelineStages,
    currentStageIndex,
    runMode,
    currentExercise
  ]);

  const isActive = currentExercise !== null;

  const stop = useCallback(() => {
    void releaseScreenWakeLock();
    sessionRef.current += 1;
    stageEnterLockRef.current = false;
    stageCompleteLockRef.current = false;
    timerReadyRef.current = false;
    setCurrentExercise(null);
    setTimelineStages([]);
    setCurrentStageIndex(0);
    setRemainingSec(0);
    setTimerPaused(false);
    setSoundActive(false);
  }, []);

  const togglePause = useCallback(() => {
    setTimerPaused((p) => !p);
  }, []);

  const playWithTimerPause = useCallback(async (urls: string[], minDurationSec = 0) => {
    if (urls.length === 0 && minDurationSec <= 0) return;

    setSoundActive(true);
    try {
      const startedAt = Date.now();
      if (urls.length > 0) {
        await playSequential(urls);
      }
      const minDurationMs = minDurationSec * 1000;
      const waitMs = minDurationMs - (Date.now() - startedAt);
      if (waitMs > 0) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, waitMs));
      }
    } finally {
      setSoundActive(false);
    }
  }, []);

  const startExercise = useCallback((n: number, mode: RunMode) => {
    const holdSec = DEFAULT_EXERCISE_DURATIONS[n];
    const repeats = exerciseRepeatsRef.current[n] ?? 1;
    const includeRest = autoPauseRef.current;
    const stages = buildExerciseTimeline(n, repeats, holdSec, includeRest);

    stageEnterLockRef.current = false;
    stageCompleteLockRef.current = false;
    timerReadyRef.current = false;
    setRunMode(mode);
    setCurrentExercise(n);
    setTimelineStages(stages);
    setCurrentStageIndex(0);
    setRemainingSec(0);
    setTimerPaused(false);
  }, []);

  const finishExercise = useCallback(
    (n: number, mode: RunMode) => {
      if (mode === "sequence" && n < EXERCISE_COUNT) {
        startExercise(n + 1, mode);
        return;
      }
      stop();
    },
    [startExercise, stop]
  );

  const advanceStage = useCallback(() => {
    const stages = timelineStagesRef.current;
    const nextIndex = currentStageIndexRef.current + 1;

    if (nextIndex >= stages.length) {
      const n = currentExerciseRef.current;
      if (n === null) return;
      finishExercise(n, runModeRef.current);
      return;
    }

    stageEnterLockRef.current = false;
    stageCompleteLockRef.current = false;
    timerReadyRef.current = false;
    setCurrentStageIndex(nextIndex);
    setRemainingSec(0);
  }, [finishExercise]);

  useEffect(() => {
    if (remainingSec > 0) {
      timerReadyRef.current = true;
    }
  }, [remainingSec, currentStageIndex]);

  const startSingle = useCallback(
    (n: number) => {
      void acquireScreenWakeLock();
      const session = sessionRef.current + 1;
      sessionRef.current = session;
      startExercise(n, "single");
    },
    [startExercise]
  );

  const startSequence = useCallback(() => {
    if (EXERCISE_COUNT < 1) return;
    void acquireScreenWakeLock();
    const session = sessionRef.current + 1;
    sessionRef.current = session;
    startExercise(1, "sequence");
  }, [startExercise]);

  useEffect(() => {
    if (!isActive || timelineStages.length === 0) return;

    const stage = timelineStages[currentStageIndex];
    if (!stage) return;
    if (stageEnterLockRef.current) return;
    stageEnterLockRef.current = true;

    const session = sessionRef.current;

    void (async () => {
      const hasAudio = stage.audio.length > 0;
      const hasSoundWindow = stage.minSoundSec > 0;
      if (hasAudio || hasSoundWindow) {
        await playWithTimerPause(stage.audio, stage.minSoundSec);
      }

      if (session !== sessionRef.current) {
        stageEnterLockRef.current = false;
        return;
      }

      if (stage.timerSec > 0) {
        setRemainingSec(stage.timerSec);
        stageEnterLockRef.current = false;
        return;
      }

      stageEnterLockRef.current = false;
      stageCompleteLockRef.current = false;
      advanceStage();
    })();
  }, [advanceStage, currentStageIndex, isActive, playWithTimerPause, timelineStages]);

  useEffect(() => {
    if (!isActive || remainingSec <= 0 || timerPaused || soundActive) return;

    const timer = window.setTimeout(() => {
      setRemainingSec((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [isActive, remainingSec, timerPaused, soundActive]);

  useEffect(() => {
    if (!isActive || remainingSec !== 0 || timerPaused || soundActive) return;
    if (timelineStages.length === 0) return;

    const stage = timelineStages[currentStageIndex];
    if (!stage || stage.timerSec <= 0) return;
    if (!timerReadyRef.current) return;
    if (stageEnterLockRef.current) return;
    if (stageCompleteLockRef.current) return;
    stageCompleteLockRef.current = true;
    timerReadyRef.current = false;

    advanceStage();
  }, [advanceStage, currentStageIndex, isActive, remainingSec, soundActive, timerPaused, timelineStages]);

  return {
    currentExercise,
    runMode,
    timelineStages,
    currentStageIndex,
    remainingSec,
    timerPaused,
    soundActive,
    exercises: EXERCISE_NUMBERS,
    startSingle,
    startSequence,
    stop,
    togglePause,
    isActive
  };
}

export function modalPreviewExercise(
  runMode: RunMode,
  currentExercise: number | null,
  exerciseCount: number,
  timelineStages: TimelineStage[],
  currentStageIndex: number
): number | null {
  if (currentExercise === null) return null;

  const stage = timelineStages[currentStageIndex];
  if (stage?.kind === "rest" && runMode === "sequence" && currentExercise < exerciseCount) {
    return currentExercise + 1;
  }

  return currentExercise;
}
