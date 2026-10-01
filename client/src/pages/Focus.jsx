import { Timer, Headphones, CheckCheck } from 'lucide-react';
import { useProductivity } from '@/stores/productivity';
import { FocusTimer } from '@/components/FocusTimer';
import { EmptyState, ErrorState, LoadingState } from '@/components/common';
import { minutes, dateLabel } from '@/lib/utils';
export default function Focus() {
  const { sessions, loading, error, refresh } = useProductivity();
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">PROTECT YOUR ATTENTION</div>
          <h1>
            Make room for deep work<span className="text-primary">.</span>
          </h1>
          <p>Pick one thing. Set your time. Be here, fully.</p>
        </div>
        <Headphones
          className="heading-icon"
          size={32}
        />
      </div>
      <div className="focus-page-grid">
        <FocusTimer />
        <div>
          <section className="panel focus-guide">
            <span className="eyebrow">YOUR FOCUS RITUAL</span>
            <h2>A small reset before you start.</h2>
            {[
              'Choose one task to give your attention to.',
              'Close the extra tabs. Silence your phone.',
              'Take a breath. Start before you feel ready.',
            ].map((text, i) => (
              <div key={text}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                <p>{text}</p>
              </div>
            ))}
            <p className="muted-note">
              Pauses are excluded from focus time. Sessions are saved when the timer finishes, and
              belong to the productivity day they started.
            </p>
          </section>
          <section className="panel mt-5">
            <div className="panel-heading">
              <h2>Recent sessions</h2>
              <Timer size={17} />
            </div>
            {loading ? (
              <LoadingState />
            ) : error ? (
              <ErrorState
                error={error}
                retry={refresh}
              />
            ) : !sessions.length ? (
              <EmptyState
                title="Your next session starts here."
                description="Finish a focus session and see it here."
              />
            ) : (
              <div className="session-list">
                {sessions.slice(0, 8).map((s) => (
                  <div key={s.id}>
                    <span className="session-icon">
                      <CheckCheck size={17} />
                    </span>
                    <div>
                      <strong>Focused work</strong>
                      <span>
                        {dateLabel(s.productivityDate, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <b>{minutes(s.durationSeconds)}</b>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
