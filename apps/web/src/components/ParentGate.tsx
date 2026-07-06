import { useState } from 'react';

interface ParentGateProps {
  feedback: string;
  onConfirm: (value: string) => Promise<boolean>;
  onExtra: () => Promise<void>;
}

export function ParentGate({ feedback, onConfirm, onExtra }: ParentGateProps) {
  const [password, setPassword] = useState('');

  async function submit() {
    const ok = await onConfirm(password);
    if (!ok) setPassword('');
  }

  return (
    <section className="parent-gate">
      <div>
        <p className="eyebrow">부모 확인</p>
        <h2>루틴을 마쳤나요?</h2>
        <p>보호자 휴대폰 뒷 4자리를 입력해 주세요.</p>
      </div>
      <div className="gate-row">
        <input
          aria-label="부모 비밀번호"
          inputMode="numeric"
          maxLength={4}
          placeholder="4자리"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value.replace(/\D/g, '').slice(0, 4))}
        />
        <button className="primary" type="button" onClick={() => void submit()}>확인</button>
      </div>
      {feedback ? <p className="feedback">{feedback}</p> : null}
      <button className="ghost" type="button" onClick={() => void onExtra()}>30초 더 하기</button>
    </section>
  );
}
