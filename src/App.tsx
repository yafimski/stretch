import { useState } from 'react'
import { exerciseImage } from './publicAudio'
import { useExerciseTimer, type Duration } from './useExerciseTimer'
import { useScreenWakeLock } from './useScreenWakeLock'
import './App.css'

const DURATIONS: Duration[] = [15, 30, 60]

function App() {
  const [duration, setDuration] = useState<Duration>(30)
  const [autoPause, setAutoPause] = useState(true)

  const {
    phase,
    currentExercise,
    remainingSec,
    isPreparing,
    timerPaused,
    exercises,
    startSingle,
    startSequence,
    stop,
    togglePause,
    isActive,
  } = useExerciseTimer(duration, autoPause)

  const showTimerControls =
    !isPreparing && (phase === 'exercise' || phase === 'pause')

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
          <button
            key={n}
            type="button"
            className="grid-card"
            onClick={() => startSingle(n)}
            aria-label={`Exercise ${n}`}
          >
            <img src={exerciseImage(n)} alt={`Exercise ${n}`} />
          </button>
        ))}
      </section>

      <section className="settings" aria-label="Settings">
        <div
          className="duration-picker"
          role="radiogroup"
          aria-label="Hold duration"
        >
          {DURATIONS.map((value) => (
            <button
              key={value}
              type="button"
              className={`duration-btn${duration === value ? ' duration-btn-active' : ''}`}
              role="radio"
              aria-checked={duration === value}
              onClick={() => setDuration(value)}
              disabled={isActive}
            >
              {value}s
            </button>
          ))}
        </div>

        <label className={`auto-pause${autoPause ? ' auto-pause-on' : ''}`}>
          <span className="auto-pause-text">
            <span className="auto-pause-title">Auto pause</span>
            <span className="auto-pause-desc">10 second rest between exercises</span>
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

      {isActive && currentExercise !== null && (
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
              {phase === 'pause' ? 'Rest' : isPreparing ? 'Starting' : 'Hold'} ·{' '}
              {phase === 'pause' || !isPreparing ? remainingSec : duration}s
            </p>

            <div className="modal-image-wrap">
              <img
                src={exerciseImage(currentExercise)}
                alt={`Exercise ${currentExercise}`}
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
