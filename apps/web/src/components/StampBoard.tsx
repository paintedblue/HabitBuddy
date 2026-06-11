import type { RoutineSession } from '@habit-buddy/shared';

export function StampBoard({ sessions }: { sessions: RoutineSession[] }) {
  const recent = sessions.slice(0, 7);
  return (
    <section className="stamp-board" aria-label="스탬프 보드">
      <div className="section-title">
        <p className="eyebrow">이번 주 스탬프</p>
        <strong>{recent.length}개 완료</strong>
      </div>
      <div className="stamps">
        {Array.from({ length: 7 }, (_, index) => (
          <span className={recent[index] ? 'stamp filled' : 'stamp'} key={index}>
            {recent[index] ? '★' : ''}
          </span>
        ))}
      </div>
    </section>
  );
}
