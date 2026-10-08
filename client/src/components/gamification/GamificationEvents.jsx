import { useEffect, useState } from 'react';
import { Check, ArrowUpRight, X } from 'lucide-react';
import { useAuth } from '@/stores/auth';
import { useResource } from '@/hooks/useResource';
import { fetchGamification } from '@/services/gamificationApi';

const seenRewards = new Map();

export function GamificationEvents() {
  const ownerId = useAuth((state) => state.user?.id);
  const resource = useResource('gamification', fetchGamification);
  const [notice, setNotice] = useState(null);
  useEffect(() => {
    if (!ownerId || !resource.data) return;
    const previous = seenRewards.get(ownerId);
    const data = resource.data;
    const unlocked = data.achievements.filter((achievement) => achievement.unlocked);
    const current = { level: data.level, keys: unlocked.map((achievement) => achievement.key) };
    // The first load establishes a baseline. Only a later transition celebrates.
    if (previous) {
      const fresh = unlocked.find((achievement) => !previous.keys.includes(achievement.key));
      if (data.level > previous.level)
        setNotice({
          title: `Level up! Level ${data.level}`,
          detail: `${data.levelName} · Look how far you have come.`,
          levelUp: true,
        });
      else if (fresh)
        setNotice({ title: 'Achievement unlocked', detail: fresh.name, levelUp: false });
    }
    seenRewards.set(ownerId, current);
  }, [ownerId, resource.data]);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(null), 6500);
    return () => clearTimeout(timeout);
  }, [notice]);
  if (!notice) return null;
  return (
    <div
      className="reward-toast"
      role="status"
    >
      <div className="toast-emblem">
        {notice.levelUp ? <ArrowUpRight size={20} /> : <Check size={20} />}
      </div>
      <div>
        <strong>{notice.title}</strong>
        <span>{notice.detail}</span>
      </div>
      <button
        aria-label="Dismiss reward"
        onClick={() => setNotice(null)}
      >
        <X size={17} />
      </button>
    </div>
  );
}
