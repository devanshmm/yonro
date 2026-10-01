import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, CheckCheck, Clock3, ArrowUpRight, Plus, Target, ArrowRight } from 'lucide-react';
import { useAuth } from '@/stores/auth';
import { useProductivity } from '@/stores/productivity';
import { Button } from '@/components/ui/button';
import { StatCard, ProgressBar, LoadingState, ErrorState } from '@/components/common';
import { TaskList, QuickAdd, TaskEditor } from '@/components/TaskList';
import { FocusTimer } from '@/components/FocusTimer';
import { WeeklyChart } from '@/components/WeeklyChart';
import { minutes } from '@/lib/utils';
export default function Dashboard() {
  const user = useAuth((s) => s.user),
    { today, week, tasks, loading, error, refresh } = useProductivity(),
    [adding, setAdding] = useState(false);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} retry={refresh} />;
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: user.settings.timezone,
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(new Date()),
  );
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span />
            YOUR DAILY RESET
          </div>
          <h1>
            {greeting}, {user.firstName}
            <span className="text-primary">.</span>
          </h1>
          <p>A clear mind. A little intention. Let’s make today count.</p>
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus size={17} />
          New task
        </Button>
      </div>
      <div className="stat-grid">
        <StatCard
          label="Current streak"
          value={
            <>
              {today.currentStreak}
              <span>days</span>
            </>
          }
          detail="Keep showing up. It adds up."
          icon={Flame}
          accent
        />
        <StatCard
          label="Tasks completed"
          value={
            <>
              {today.completedTasks}
              <span>/ {today.plannedTasks}</span>
            </>
          }
          detail="One step closer to your goals."
          icon={CheckCheck}
        />
        <StatCard
          label="Focus time today"
          value={
            <>
              {Math.round(today.focusSeconds / 60)}
              <span>min</span>
            </>
          }
          detail="Time invested in what matters."
          icon={Clock3}
        />
      </div>
      <div className="dashboard-grid">
        <div className="dashboard-primary">
          <section className="panel progress-panel">
            <div>
              <span className="eyebrow">TODAY’S PROGRESS</span>
              <h2>
                {today.completionPercentage === 100 && today.plannedTasks
                  ? 'You showed up. You followed through.'
                  : today.completedTasks
                    ? 'You’re building momentum.'
                    : 'Every good day starts with a plan.'}
              </h2>
              <p>
                {today.completedTasks} of {today.plannedTasks} planned tasks completed
              </p>
              <ProgressBar value={today.completionPercentage} />
              <span className="progress-caption">
                {today.plannedTasks
                  ? `${today.plannedTasks - today.completedTasks} tasks to go. Keep your next step small.`
                  : 'Add a task below to get started.'}
              </span>
            </div>
            <div
              className="progress-circle"
              style={{ '--progress': `${today.completionPercentage}%` }}
            >
              <div>
                <strong>
                  {today.completionPercentage}
                  <small>%</small>
                </strong>
                <span>COMPLETE</span>
              </div>
            </div>
          </section>
          <section className="panel tasks-panel">
            <div className="panel-heading">
              <h2>
                Today’s tasks<span className="count-badge">{tasks.length}</span>
              </h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/tasks">
                  View all
                  <ArrowUpRight size={14} />
                </Link>
              </Button>
            </div>
            <QuickAdd />
            <TaskList tasks={tasks} />
            <div className="task-panel-footer">
              <span>
                <span className="status-dot" />
                Your day starts at {user.settings.dayStartTime}
              </span>
              <Link to="/settings">
                Customize
                <ArrowRight size={12} />
              </Link>
            </div>
          </section>
        </div>
        <div className="dashboard-secondary">
          <FocusTimer compact />
          <section className="panel weekly-panel">
            <div className="panel-heading">
              <h2>This week</h2>
              <Link to="/analytics" aria-label="Open analytics">
                <ArrowUpRight size={18} />
              </Link>
            </div>
            <div className="weekly-headline">
              <strong>{week.completionPercentage}%</strong>
              <span>of planned tasks completed</span>
            </div>
            <WeeklyChart week={week} />
            <div className="weekly-footer">
              <span>{week.completedTasks} tasks done</span>
              <span>{minutes(week.focusSeconds)} focused</span>
            </div>
          </section>
        </div>
      </div>
      <div className="daily-note">
        <Target size={18} />
        <span>You don’t need a perfect day. Just a purposeful one.</span>
        <span className="note-label">THE LOCKIN MINDSET</span>
      </div>
      <TaskEditor open={adding} onOpenChange={setAdding} />
    </>
  );
}
