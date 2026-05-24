import { useState } from 'react'
import { exerciseImage } from './publicAudio'
import { useExerciseTimer, type Duration } from './useExerciseTimer'
import './App.css'

const DURATIONS: Duration[] = [15, 30, 60]

function App() {
  const [duration, setDuration] = useState<Duration>(30)
  const [autoPause, setAutoPause] = useState(false)

  const {
    phase,
    currentExercise,
    remainingSec,
    isPreparing,
    exercises,
    startSingle,
    startSequence,
    stop,
    isActive,
  } = useExerciseTimer(duration, autoPause)

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
