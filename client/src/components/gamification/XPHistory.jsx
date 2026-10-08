import { useState, useCallback } from 'react';
import { ArrowUpRight, ArrowLeft, ArrowRight } from 'lucide-react';
import { useResource } from '@/hooks/useResource';
import { fetchXPHistory } from '@/services/gamificationApi';
import { ResourceStatus } from '@/components/ResourceStatus';
import { EmptyState } from '@/components/common';
import { Button } from '@/components/ui/button';

export function XPHistory() {
  const [cursors, setCursors] = useState([null]);
  const cursor = cursors.at(-1);
  const loader = useCallback(() => fetchXPHistory(cursor), [cursor]);
  const resource = useResource(`xp-history:${cursor ?? 'first'}`, loader);
  const data = resource.data;
  return (
    <section className="panel xp-history-panel">
      <div className="panel-heading">
        <h2>Your XP trail</h2>
        <span className="form-help">Every reward has a reason.</span>
      </div>
      <ResourceStatus
        resource={resource}
        message="Loading XP history…"
      />
      {data && !resource.error && (
        <>
          {data.transactions.length ? (
            <ol className="xp-history-list">
              {data.transactions.map((entry) => (
                <li key={entry.id}>
                  <div className="xp-coin">
                    <ArrowUpRight size={18} />
                  </div>
                  <div>
                    <strong>{entry.description}</strong>
                    <time dateTime={entry.createdAt}>
                      {new Date(entry.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}{' '}
                      · Productivity day {entry.productivityDate}
                    </time>
                  </div>
                  <span>+{entry.amount} XP</span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              title="Complete your first task to start earning XP."
              description="Your progress is yours to build, one meaningful action at a time."
            />
          )}
          <div className="history-pagination">
            <Button
              variant="secondary"
              disabled={cursors.length === 1}
              onClick={() => setCursors(cursors.slice(0, -1))}
            >
              <ArrowLeft size={14} /> Newer
            </Button>
            <span>Page {cursors.length}</span>
            <Button
              variant="secondary"
              disabled={!data.nextCursor}
              onClick={() => setCursors([...cursors, data.nextCursor])}
            >
              Older <ArrowRight size={14} />
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
