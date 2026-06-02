import {
  BREAK_SOUND,
  CHIME_SOUND,
  REST_SOUND,
  REPEAT_SOUND,
  exerciseStartSound,
} from './publicAudio'
export type RepeatCount = 1 | 2 | 3 | 4
export type StageKind = 'number' | 'repeat' | 'break' | 'rest'

export type TimelineStage = {
  id: string
  label: string
  kind: StageKind
  audio: string[]
  /** Minimum seconds for the audio phase (timer frozen while active). */
  minSoundSec: number
  /** Countdown seconds after audio completes. */
  timerSec: number
  repeatIndex?: number
}

export function buildExerciseTimeline(
  exerciseNum: number,
  repeatCount: RepeatCount,
  holdSec: number,
  includeRest: boolean,
): TimelineStage[] {
  const stages: TimelineStage[] = []

  if (repeatCount === 1) {
    stages.push({
      id: 'number',
      label: String(exerciseNum),
      kind: 'number',
      audio: [CHIME_SOUND, exerciseStartSound(exerciseNum)],
      minSoundSec: 0,
      timerSec: holdSec,
    })
  } else {
    stages.push({
      id: 'number',
      label: String(exerciseNum),
      kind: 'number',
      audio: [CHIME_SOUND, exerciseStartSound(exerciseNum)],
      minSoundSec: 0,
      timerSec: 0,
    })

    stages.push({
      id: 'repeat-1',
      label: 'Repeat #1',
      kind: 'repeat',
      audio: [],
      minSoundSec: 0,
      timerSec: holdSec,
      repeatIndex: 1,
    })

    for (let repeatIndex = 2; repeatIndex <= repeatCount; repeatIndex += 1) {
      stages.push({
        id: `break-${repeatIndex - 1}`,
        label: 'Break',
        kind: 'break',
        audio: [BREAK_SOUND],
        minSoundSec: 0,
        timerSec: 5,
      })
      stages.push({
        id: `repeat-${repeatIndex}`,
        label: `Repeat #${repeatIndex}`,
        kind: 'repeat',
        audio: [REPEAT_SOUND],
        minSoundSec: 0,
        timerSec: holdSec,
        repeatIndex,
      })
    }
  }

  if (includeRest) {
    stages.push({
      id: 'rest',
      label: 'Rest',
      kind: 'rest',
      audio: [CHIME_SOUND, REST_SOUND],
      minSoundSec: 3,
      timerSec: 15,
    })
  }

  return stages
}
