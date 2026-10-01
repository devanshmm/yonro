import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, ArrowUpRight, CheckCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFocus, elapsed } from '@/stores/focus';
import { useAuth } from '@/stores/auth';
import { Button } from './ui/button';
import { ErrorState } from './common';
export function useTimerClock() {
  useEffect(() => {
    const id = setInterval(() => {
      const state = useFocus.getState();
      if (
        state.ownerId === useAuth.getState().user?.id &&
        state.phase === 'running' &&
        elapsed(state) >= state.targetSeconds * 1000
      )
        void state.complete();
    }, 250);
    return () => clearInterval(id);
  }, []);
}
export function FocusTimer({ compact = false }) {
  const timer = useFocus(),
    [now, setNow] = useState(Date.now()),
    [custom, setCustom] = useState(45),
    [showCustom, setShowCustom] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const remaining = Math.max(
    0,
    Math.ceil((timer.targetSeconds * 1000 - elapsed(timer, now)) / 1000),
  );
  const progress = Math.min(100, (elapsed(timer, now) / (timer.targetSeconds * 1000)) * 100);
  function reset() {
    if (
      (timer.phase === 'running' || timer.phase === 'paused' || timer.pending) &&
      !confirm(
        timer.pending
          ? 'Discard this unsaved session?'
          : 'Reset this focus session? Your progress will not be saved.',
      )
    )
      return;
    timer.reset();
  }
  return (
    <section className={`panel focus-panel ${compact ? 'compact' : ''}`}>
      <div className="panel-heading">
        <h2>{compact ? 'Time to lock in' : 'Your focus, uninterrupted.'}</h2>
        {compact && (
          <Link
            to="/focus"
            aria-label="Open focus timer"
          >
            <ArrowUpRight size={18} />
          </Link>
        )}
      </div>
      <p className="text-muted-foreground text-sm">
        One thing at a time. That’s where progress starts.
      </p>
      <div
        className="timer-ring"
        style={{ '--progress': `${progress}%` }}
      >
        <div>
          <span
            className="timer-number"
            aria-live="off"
          >
            {String(Math.floor(remaining / 60)).padStart(2, '0')}
            <b>:</b>
            {String(remaining % 60).padStart(2, '0')}
          </span>
          <span className="timer-state">
            {timer.phase === 'idle'
              ? 'READY WHEN YOU ARE'
              : timer.phase === 'running'
                ? 'STAY IN THE MOMENT'
                : timer.phase === 'paused'
                  ? 'TAKE A BREATH'
                  : timer.phase === 'saving'
                    ? 'SAVING YOUR SESSION'
                    : timer.pending
                      ? 'READY TO SAVE'
                      : 'SESSION COMPLETE'}
          </span>
        </div>
      </div>
      <div className="presets">
        {[25, 50, 90].map((m) => (
          <button
            key={m}
            disabled={timer.phase !== 'idle'}
            onClick={() => {
              timer.preset(m * 60);
              setShowCustom(false);
            }}
            className={timer.targetSeconds === m * 60 && !showCustom ? 'selected' : ''}
          >
            {m} min
          </button>
        ))}
        <button
          disabled={timer.phase !== 'idle'}
          className={showCustom ? 'selected' : ''}
          onClick={() => setShowCustom(true)}
        >
          Custom
        </button>
      </div>
      {showCustom && (
        <label className="custom-time">
          Minutes
          <input
            type="number"
            min={1}
            max={360}
            value={custom}
            onChange={(e) => {
              const n = Number(e.target.value);
              setCustom(e.target.value);
              if (Number.isInteger(n) && n >= 1 && n <= 360) timer.preset(n * 60);
            }}
            disabled={timer.phase !== 'idle'}
          />
        </label>
      )}
      <div className="timer-controls">
        {timer.phase === 'running' ? (
          <Button
            onClick={timer.pause}
            variant="secondary"
          >
            <Pause size={16} />
            Pause session
          </Button>
        ) : timer.phase === 'idle' || timer.phase === 'paused' ? (
          <Button onClick={timer.start}>
            <Play
              size={16}
              fill="currentColor"
            />
            {timer.phase === 'paused' ? 'Resume session' : 'Start focus'}
          </Button>
        ) : timer.pending ? (
          <Button
            onClick={timer.save}
            disabled={timer.phase === 'saving'}
          >
            {timer.phase === 'saving' ? 'Saving…' : 'Save session'}
          </Button>
        ) : (
          <Button onClick={timer.reset}>
            <CheckCheck size={16} />
            Start another
          </Button>
        )}
        <Button
          variant="secondary"
          size="icon"
          aria-label="Reset timer"
          onClick={reset}
          disabled={timer.phase === 'saving'}
        >
          <RotateCcw size={16} />
        </Button>
      </div>
      {timer.error && <ErrorState error={timer.error} />}
      <div className="focus-footer">
        <span className="status-dot" />
        {timer.phase === 'complete' && !timer.pending
          ? 'Nice work. Your session has been saved.'
          : 'Less distraction. More intention.'}
      </div>
    </section>
  );
}
