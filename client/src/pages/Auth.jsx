import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowRight, Check, Target, Timer, TrendingUp } from 'lucide-react';
import { useAuth } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/common';
import { errorMessage } from '@/lib/utils';
export default function Auth() {
  const { user, ready, authenticate, initError, init } = useAuth(),
    location = useLocation(),
    signup = location.pathname === '/signup',
    [error, setError] = useState(null),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const body = Object.fromEntries(new FormData(e.currentTarget));
    if (signup) body.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      await authenticate(signup ? 'signup' : 'login', body);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (!ready) return <LoadingState />;
  if (user)
    return (
      <Navigate
        to="/"
        replace
      />
    );
  return (
    <div className="auth-shell">
      <section className="auth-story">
        <Link
          to="/login"
          className="brand"
        >
          <span className="brand-mark">
            L<span />
          </span>
          LOCKIN<span className="brand-period">.</span>
        </Link>
        <div className="auth-story-body">
          <div className="eyebrow">
            <span />
            MAKE SPACE FOR WHAT MATTERS
          </div>
          <h1>
            Less noise.
            <br />
            More <em>momentum.</em>
          </h1>
          <p>
            Your goals deserve more than an open tab.
            <br />A clear plan. Deep focus. Progress that compounds.
          </p>
          <div
            className="auth-product-preview"
            aria-hidden="true"
          >
            <div className="auth-focus-preview">
              <span className="preview-label">
                <Timer size={13} /> FOCUS MODE
              </span>
              <div className="preview-orbit">
                <div>
                  <strong>
                    25<span>:</span>00
                  </strong>
                  <small>ONE THING AT A TIME</small>
                </div>
              </div>
              <div className="preview-focus-caption">
                <span /> Distractions off. Focus on.
              </div>
            </div>
            <div className="auth-plan-preview">
              <span className="preview-label">
                <Target size={13} /> THE DAILY PLAN
              </span>
              <div className="mini-task">
                <span className="task-check checked">
                  <Check size={13} />
                </span>
                <span>Set a clear intention</span>
              </div>
              <div className="mini-task">
                <span className="task-check checked">
                  <Check size={13} />
                </span>
                <span>Make meaningful progress</span>
              </div>
              <div className="mini-task">
                <span className="task-check" />
                <span>Build your next chapter</span>
              </div>
              <div className="preview-trend">
                <TrendingUp size={16} />
                <span>Consistency is your advantage.</span>
              </div>
            </div>
          </div>
          <div className="auth-features">
            <span>
              <Target size={15} />
              Plan your day
            </span>
            <span>
              <Timer size={15} />
              Find your focus
            </span>
            <span>
              <TrendingUp size={15} />
              See your progress
            </span>
          </div>
        </div>
        <div className="auth-bottom">
          BUILT FOR YOUR PROGRESS <span>✦</span> ONE DAY AT A TIME
        </div>
      </section>
      <section className="auth-form-side">
        <div className="auth-form-container">
          <span className="eyebrow">YOUR PERSONAL WORKSPACE</span>
          <h2>{signup ? 'Your next chapter starts here.' : 'Welcome back.'}</h2>
          <p>
            {signup
              ? 'A little intention today. A different tomorrow.'
              : 'Your next focused day starts here.'}
          </p>
          <form
            className="form-stack"
            onSubmit={submit}
            key={location.pathname}
          >
            {signup && (
              <>
                <div className="form-row">
                  <label>
                    First name
                    <input
                      name="firstName"
                      required
                      autoComplete="given-name"
                      maxLength={80}
                      placeholder="Alex"
                    />
                  </label>
                  <label>
                    Last name
                    <input
                      name="lastName"
                      required
                      autoComplete="family-name"
                      maxLength={80}
                      placeholder="Morgan"
                    />
                  </label>
                </div>
                <label>
                  Username
                  <input
                    name="username"
                    required
                    autoComplete="username"
                    pattern="[a-zA-Z0-9_]{3,30}"
                    maxLength={30}
                    placeholder="alexmorgan"
                  />
                </label>
              </>
            )}
            <label>
              Email
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                required
                autoComplete={signup ? 'new-password' : 'current-password'}
                minLength={signup ? 8 : 1}
                placeholder={signup ? 'At least 8 characters' : 'Your password'}
              />
            </label>
            {(error || initError) && (
              <ErrorState
                error={error || initError}
                retry={initError ? init : undefined}
              />
            )}
            <Button
              type="submit"
              disabled={busy}
            >
              {busy
                ? 'Getting things ready…'
                : signup
                  ? 'Create your workspace'
                  : 'Log in to your workspace'}
              <ArrowRight size={17} />
            </Button>
          </form>
          <div className="auth-switch">
            {signup ? 'Already have an account?' : 'New to LOCKIN?'}{' '}
            <Link
              to={signup ? '/login' : '/signup'}
              onClick={() => setError(null)}
            >
              {signup ? 'Log in' : 'Create an account'}
              <ArrowUpRightSmall />
            </Link>
          </div>
          <p className="auth-private">
            <span className="status-dot" />
            Your space. Your pace. Your progress.
          </p>
        </div>
      </section>
    </div>
  );
}
function ArrowUpRightSmall() {
  return <span aria-hidden="true">↗</span>;
}
