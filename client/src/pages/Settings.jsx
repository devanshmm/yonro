import { useState } from 'react';
import { Clock3, ShieldCheck, Check } from 'lucide-react';
import { useAuth } from '@/stores/auth';
import { useProductivity } from '@/stores/productivity';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/common';
import { errorMessage } from '@/lib/utils';
export default function Settings() {
  const user = useAuth((s) => s.user),
    update = useAuth((s) => s.updateSettings),
    [error, setError] = useState(null),
    [saved, setSaved] = useState(false),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    const form = e.currentTarget,
      body = Object.fromEntries(new FormData(form));
    ['showActivity', 'showFocusTime', 'showStreak'].forEach((key) => {
      body[key] = form.elements[key].checked;
    });
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await update(body);
      await useProductivity.getState().refresh();
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const zones = Array.from(
    new Set([
      'UTC',
      user.settings.timezone,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...(Intl.supportedValuesOf?.('timeZone') || [
        'Asia/Kolkata',
        'America/New_York',
        'Europe/London',
      ]),
    ]),
  ).sort();
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MAKE THIS SPACE YOURS</div>
          <h1>
            Your rhythm. Your rules<span className="text-primary">.</span>
          </h1>
          <p>A workspace that fits the way you work.</p>
        </div>
      </div>
      <form className="settings-form form-stack" onSubmit={submit}>
        <section className="panel">
          <div className="section-title">
            <Clock3 size={21} />
            <div>
              <h2>Your productivity day</h2>
              <p>Great work doesn’t always follow the clock.</p>
            </div>
          </div>
          <div className="form-row">
            <label>
              Your day starts at
              <input
                name="dayStartTime"
                type="time"
                defaultValue={user.settings.dayStartTime}
                required
              />
            </label>
            <label>
              Timezone
              <select aria-label="Timezone" name="timezone" defaultValue={user.settings.timezone}>
                {zones.map((zone) => (
                  <option key={zone}>{zone}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="info-note">
            With a 04:00 start, work before 04:00 belongs to the previous day. Existing tasks and
            focus sessions keep their assigned dates when you change these settings.
          </div>
        </section>
        <section className="panel">
          <div className="section-title">
            <ShieldCheck size={21} />
            <div>
              <h2>Privacy preferences</h2>
              <p>Saved for future social features. Your workspace is personal in Phase 1.</p>
            </div>
          </div>
          <label>
            Profile visibility
            <select
              aria-label="Profile visibility"
              name="profileVisibility"
              defaultValue={user.settings.profileVisibility}
            >
              <option value="PRIVATE">Private</option>
              <option value="PUBLIC">Public</option>
            </select>
          </label>
          {[
            ['showActivity', 'Show activity'],
            ['showFocusTime', 'Show focus time'],
            ['showStreak', 'Show current streak'],
          ].map(([key, label]) => (
            <label className="switch-row" key={key}>
              <span>{label}</span>
              <input type="checkbox" name={key} defaultChecked={user.settings[key]} />
            </label>
          ))}
        </section>
        {error && <ErrorState error={error} />}
        <div className="settings-save">
          {saved && (
            <span role="status">
              <Check size={16} />
              Preferences saved
            </span>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save preferences'}
          </Button>
        </div>
      </form>
    </>
  );
}
