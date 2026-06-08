import { Fragment, useState } from "react";
import { exerciseImage } from "./publicAudio";
import {
  DEFAULT_EXERCISE_DURATIONS,
  DEFAULT_EXERCISE_REPEATS,
  modalPreviewExercise,
  useExerciseTimer,
  type Duration,
  type RepeatCount
} from "./useExerciseTimer";
import { useScreenWakeLock } from "./useScreenWakeLock";
import "./App.css";

const DURATIONS: Duration[] = [10, 20, 40];
const REPEAT_COUNTS: RepeatCount[] = [1, 2, 3, 4];

function App() {
  const [exerciseDurations, setExerciseDurations] = useState<Record<number, Duration>>(() => ({
    ...DEFAULT_EXERCISE_DURATIONS
  }));
  const [exerciseRepeats, setExerciseRepeats] = useState<Record<number, RepeatCount>>(() => ({
    ...DEFAULT_EXERCISE_REPEATS
  }));
  const [autoPause, setAutoPause] = useState(true);

  const {
    runMode,
    currentExercise,
    timelineStages,
    currentStageIndex,
    remainingSec,
    timerPaused,
    soundActive,
    exercises,
    startSingle,
    startSequence,
    stop,
    togglePause,
    isActive
  } = useExerciseTimer(exerciseDurations, exerciseRepeats, autoPause);

  const currentStage = timelineStages[currentStageIndex];
  const showTimerControls = isActive && !soundActive && remainingSec > 0;

  const previewNum = modalPreviewExercise(
    runMode,
    currentExercise,
    exercises.length,
    timelineStages,
    currentStageIndex
  );

  useScreenWakeLock(isActive);

  return (
    <div className="app">
      <header className="header">
        <button type="button" className="begin-btn" onClick={startSequence} disabled={isActive}>
          Begin
        </button>
      </header>

      <section className="grid" aria-label="Exercises">
        {exercises.map((n) => (
          <div key={n} className="grid-card">
            <button
              type="button"
              className="grid-card-repeat-pill"
              onClick={() =>
                setExerciseRepeats((prev) => {
                  const current = prev[n] ?? 1;
                  const idx = REPEAT_COUNTS.indexOf(current);
                  const next = REPEAT_COUNTS[(idx + 1) % REPEAT_COUNTS.length];
                  return { ...prev, [n]: next };
                })
              }
              aria-label={`Repeats for exercise ${n}: ${exerciseRepeats[n] ?? 1}. Tap to cycle`}
              title="Tap to cycle repeats"
            >
              {exerciseRepeats[n] ?? 1}x
            </button>
            <button
              type="button"
              className="grid-card-main"
              onClick={() => startSingle(n)}
              aria-label={`Exercise ${n}`}
            >
              <img src={exerciseImage(n)} alt={`Exercise ${n}`} />
            </button>
            <div className="grid-card-durations" role="radiogroup" aria-label={`Hold duration for exercise ${n}`}>
              {DURATIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`duration-btn${exerciseDurations[n] === value ? " duration-btn-active" : ""}`}
                  role="radio"
                  aria-checked={exerciseDurations[n] === value}
                  onClick={() => setExerciseDurations((prev) => ({ ...prev, [n]: value }))}
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
        <label className={`auto-pause${autoPause ? " auto-pause-on" : ""}`}>
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
            <button type="button" className="modal-close" onClick={stop} aria-label="Close">
              ×
            </button>

            {showTimerControls ? (
              <button
                type="button"
                className="modal-play-pause"
                onClick={togglePause}
                aria-label={timerPaused ? "Resume timer" : "Pause timer"}
                title={timerPaused ? "Resume" : "Pause"}
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

            <div className="modal-timeline" aria-label="Exercise flow">
              {timelineStages.map((stage, index) => (
                <Fragment key={stage.id}>
                  {index > 0 ? (
                    <span className="modal-timeline-arrow" aria-hidden>
                      →
                    </span>
                  ) : null}
                  <span
                    className={`modal-timeline-step${index === currentStageIndex ? " modal-timeline-step-active" : ""}${
                      index < currentStageIndex ? " modal-timeline-step-done" : ""
                    }`}
                  >
                    {stage.label}
                  </span>
                </Fragment>
              ))}
            </div>

            <p className="modal-timer" aria-live="polite">
              {remainingSec > 0 ? (
                <>
                  <span className="modal-timer-value">{remainingSec}</span>
                  <span className="modal-timer-unit">s</span>
                </>
              ) : soundActive ? (
                <span className="modal-timer-wait">…</span>
              ) : currentStage?.timerSec ? (
                <>
                  <span className="modal-timer-value">{currentStage.timerSec}</span>
                  <span className="modal-timer-unit">s</span>
                </>
              ) : null}
            </p>

            <div className="modal-image-wrap">
              <img src={exerciseImage(previewNum)} alt={`Exercise ${previewNum}`} className="modal-image" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

