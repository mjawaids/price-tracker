import { useEffect, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { HELP_BY_ID, HELP_TOPICS } from '../../lib/help';
import { Icon, Sheet } from '../ui';

/** Help topics (Profile → Help, and "?" buttons that open one topic directly). */
export default function HelpSheet() {
  const app = useApp();
  const open = app.sheet === 'help';
  const [topicId, setTopicId] = useState<string | null>(null);

  useEffect(() => {
    if (open) setTopicId(app.sheetTopic && HELP_BY_ID.has(app.sheetTopic) ? app.sheetTopic : null);
  }, [open, app.sheetTopic]);

  const topic = topicId ? HELP_BY_ID.get(topicId) : undefined;
  const close = () => app.openSheet(null);

  return (
    <Sheet open={open} onClose={close} title={topic ? topic.title : 'Help'}>
      {topic ? (
        <div className="flex flex-col gap-3 animate-sl-fade">
          {topic.body.map((p, i) => (
            <p key={i} className="m-0 text-[15px] leading-relaxed">
              {p}
            </p>
          ))}
          <button
            type="button"
            onClick={() => setTopicId(null)}
            className="self-start inline-flex items-center gap-1.5 font-bold text-[14px] text-accent-ink mt-1"
            style={{ minHeight: 44 }}
          >
            <Icon name="chevL" size={16} stroke={2.4} />
            All help topics
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {HELP_TOPICS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTopicId(t.id)}
              className="flex items-center gap-3 text-left bg-surface rounded-[16px] shadow-[inset_0_0_0_1.5px_var(--line)]"
              style={{ padding: '12px 14px', minHeight: 60 }}
            >
              <span className="grid place-items-center rounded-[11px] bg-accent-wash text-accent-ink shrink-0" style={{ width: 36, height: 36 }}>
                <Icon name={t.icon} size={18} stroke={2.2} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-[15px]">{t.title}</span>
                <span className="block text-[12.5px] text-ink-soft truncate">{t.summary}</span>
              </span>
              <Icon name="chevR" size={17} stroke={2.2} color="var(--ink-soft)" />
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}
