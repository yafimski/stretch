import { useState } from 'react'
import { exerciseImage } from './publicAudio'
import {
  DEFAULT_EXERCISE_DURATIONS,
  modalPreviewExercise,
  useExerciseTimer,
  type Duration,
  type Phase,
} from './useExerciseTimer'
import { useScreenWakeLock } from './useScreenWakeLock'
import './App.css'

const DURATIONS: Duration[] = [15, 30, 60]

function modalSecondsLabel(
  phase: Phase,
  isPreparing: boolean,
  remainingSec: number,
  currentExercise: number | null,
  exerciseDurations: Record<number, Duration>,
): number {
  if (currentExercise === null) return remainingSec

  const holdSecs = exerciseDurations[currentExercise] ?? 30

  if (phase === 'pause') return remainingSec
  if (phase === 'exercise' && isPreparing) return holdSecs
  if (phase === 'exercise' && !isPreparing && remainingSec > 0)
    return remainingSec
  if (phase === 'exercise' && !isPreparing) return holdSecs
  return remainingSec
}

function phaseLabel(phase: Phase, isPreparing: boolean): string {
  if (phase === 'pause') return 'Rest'
  if (isPreparing) return 'Starting'
  return 'Hold'
}

function App() {
  const [exerciseDurations, setExerciseDurations] = useState<
    Record<number, Duration>
  >(() => ({ ...DEFAULT_EXERCISE_DURATIONS }))
  const [autoPause, setAutoPause] = useState(true)

  const {
    phase,
    runMode,
    currentExercise,
    remainingSec,
    isPreparing,
    timerPaused,
    repeatAudioPlaying,
    exercises,
    startSingle,
    startSequence,
    stop,
    togglePause,
    isActive,
  } = useExerciseTimer(exerciseDurations, autoPause)

  const showTimerControls =
    !isPreparing &&
    !repeatAudioPlaying &&
    (phase === 'exercise' || phase === 'pause')

  const previewNum = modalPreviewExercise(phase, runMode, currentExercise)

  useScreenWakeLock(isActive)

  return (
    <div className="app">
      <header className="header">
        <button
          type="button"
          className="begin-btn"
          onClick={startSequence}
          disabled={isActive}
        >
          Begin
        </button>
      </header>

      <section className="grid" aria-label="Exercises">
        {exercises.map((n) => (
          <div key={n} className="grid-card">
            <button
              type="button"
              className="grid-card-main"
              onClick={() => startSingle(n)}
              aria-label={`Exercise ${n}`}
            >
              <img src={exerciseImage(n)} alt={`Exercise ${n}`} />
            </button>
            <div
              className="grid-card-durations"
              role="radiogroup"
              aria-label={`Hold duration for exercise ${n}`}
            >
              {DURATIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`duration-btn${exerciseDurations[n] === value ? ' duration-btn-active' : ''}`}
                  role="radio"
                  aria-checked={exerciseDurations[n] === value}
                  onClick={() =>
                    setExerciseDurations((prev) => ({ ...prev, [n]: value }))
                  }
                  disabled={isActive}
                >
                  {value}s
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="settings" aria-label="Settings">
        <label className={`auto-pause${autoPause ? ' auto-pause-on' : ''}`}>
          <span className="auto-pause-text">
            <span className="auto-pause-title">Auto pause</span>
            <span className="auto-pause-desc">15 second rest between exercises</span>
          </span>
          <span className="switch">
            <input
              type="checkbox"
              className="switch-input"
              checked={autoPause}
              onChange={(event) => setAutoPause(event.target.checked)}
              disabled={isActive}
            />
            <span className="switch-track" aria-hidden />
          </span>
        </label>
      </section>

      {isActive && currentExercise !== null && previewNum !== null && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <button
              type="button"
              className="modal-close"
              onClick={stop}
              aria-label="Close"
            >
              ×
            </button>

            {phase === 'pause' ? (
              <h2 className="modal-coming-up">Coming Up...</h2>
            ) : null}

            {showTimerControls ? (
              <button
                type="button"
                className="modal-play-pause"
                onClick={togglePause}
                aria-label={timerPaused ? 'Resume timer' : 'Pause timer'}
                title={timerPaused ? 'Resume' : 'Pause'}
              >
                {timerPaused ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
                  </svg>
                )}
              </button>
            ) : null}

            <p className="modal-countdown">
              {phaseLabel(phase, isPreparing)} ·{' '}
              {modalSecondsLabel(
                phase,
                isPreparing,
                remainingSec,
                currentExercise,
                exerciseDurations,
              )}
              s
            </p>

            <div className="modal-image-wrap">
              <img
                src={exerciseImage(previewNum)}
                alt={`Exercise ${previewNum}`}
                className="modal-image"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
