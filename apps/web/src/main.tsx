import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

class RootErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('HabitBuddy app crashed.', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="app-shell auth-shell">
        <section className="auth-card" aria-label="앱 오류">
          <div className="auth-brand">♪ 동요 친구</div>
          <h1>앱 화면을 불러오지 못했어요</h1>
          <p className="auth-copy">잠시 후 다시 시도해 주세요. 같은 문제가 반복되면 새로고침해 주세요.</p>
          <button className="auth-submit" type="button" onClick={() => window.location.reload()}>
            새로고침
          </button>
        </section>
      </main>
    );
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>
);
