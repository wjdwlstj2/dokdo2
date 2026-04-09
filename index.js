import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

const TIMER_SECONDS = 180; // 3분

function parseMessage(text) {
  const progressMatch = text.match(/\[PROGRESS:([\d,]*)\]/);
  const isVictory = text.includes('[VICTORY]');
  let unlockedClues = [];
  if (progressMatch && progressMatch[1]) {
    unlockedClues = progressMatch[1].split(',').filter(Boolean).map(Number).filter(n => n >= 1 && n <= 4);
  }
  const cleanText = text.replace(/\[PROGRESS:[^\]]*\]/g, '').replace(/\[VICTORY\]/g, '').trim();
  return { cleanText, unlockedClues, isVictory };
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const CLUES = [
  { id: 1, label: '세종실록지리지', icon: '📜' },
  { id: 2, label: '태정관 지령 (1877)', icon: '🏛️' },
  { id: 3, label: '대한제국 칙령 제41호', icon: '👑' },
  { id: 4, label: '연합국 각서 제677호', icon: '⚖️' },
];

const INIT_MSG = {
  role: 'assistant',
  displayText: '흥! 나는 다케시마 박사다. 독도... 아니, 다케시마는 명백히 일본 땅이야. 너희가 아무리 우겨봤자 소용없어. 어디 한번 네가 독도가 한국 땅이라는 근거를 대볼 수 있으면 대봐. 과연 가능하겠어?',
  content: '흥! 나는 다케시마 박사다. 독도... 아니, 다케시마는 명백히 일본 땅이야. 너희가 아무리 우겨봤자 소용없어. 어디 한번 네가 독도가 한국 땅이라는 근거를 대볼 수 있으면 대봐. 과연 가능하겠어?',
};

export default function Home() {
  const [messages, setMessages] = useState([INIT_MSG]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unlockedClues, setUnlockedClues] = useState([]);
  const [isVictory, setIsVictory] = useState(false);
  const [isDefeat, setIsDefeat] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [timerActive, setTimerActive] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  // 타이머
  useEffect(() => {
    if (!timerActive || isVictory || isDefeat) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setIsDefeat(true);
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerActive, isVictory, isDefeat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading || isVictory || isDefeat) return;
    const userMsg = { role: 'user', content: input.trim(), displayText: input.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMsgs.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'API Error');

      const { cleanText, unlockedClues: newClues, isVictory: victory } = parseMessage(data.reply);
      if (newClues.length > 0) {
        setUnlockedClues(prev => [...new Set([...prev, ...newClues])].sort());
      }
      if (victory) {
        setIsVictory(true);
        setTimerActive(false);
        clearInterval(timerRef.current);
        setUnlockedClues([1, 2, 3, 4]);
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, displayText: cleanText }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '오류: ' + e.message, displayText: '오류: ' + e.message }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleReset = () => {
    clearInterval(timerRef.current);
    setMessages([INIT_MSG]);
    setUnlockedClues([]);
    setIsVictory(false);
    setIsDefeat(false);
    setTimeLeft(TIMER_SECONDS);
    setTimerActive(true);
    setInput('');
  };

  // 타이머 색상
  const timerColor = timeLeft <= 30 ? '#c0392b' : timeLeft <= 60 ? '#e67e22' : '#c8a96e';
  const isGameOver = isVictory || isDefeat;

  return (
    <>
      <Head>
        <title>독도 수호 챌린지 - 다케시마 박사를 설득하라!</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          @keyframes defeat-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
          @keyframes timer-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
          .defeat-shake { animation: defeat-shake 0.5s ease; }
          .timer-blink { animation: timer-pulse 0.8s ease-in-out infinite; }
        `}</style>
      </Head>

      {/* 배경 */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse at 20% 80%, rgba(17,64,112,0.4) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(5,21,40,0.8) 0%, transparent 50%), linear-gradient(180deg, #030d1a 0%, #051528 50%, #0a2540 100%)'
      }} />

      {/* 승리 오버레이 */}
      {isVictory && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(3,13,26,0.92)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="victory-glow" style={{
            background: 'linear-gradient(135deg, #1a1a1a, #2a2520)',
            border: '1px solid rgba(200,169,110,0.4)',
            borderRadius: '20px', padding: '40px', textAlign: 'center', maxWidth: '380px', width: '90%'
          }}>
            <div className="animate-float" style={{ fontSize: '64px', marginBottom: '16px' }}>🇰🇷</div>
            <h2 style={{ color: '#c8a96e', fontFamily: 'Noto Serif KR, serif', fontSize: '24px', margin: '0 0 8px' }}>독도는 우리 땅!</h2>
            <p style={{ color: 'rgba(168,197,218,0.7)', fontSize: '14px', marginBottom: '4px' }}>다케시마 박사가 인정했습니다.</p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginBottom: '8px' }}>4가지 역사적 근거를 모두 제시하여 승리!</p>
            <p style={{ color: '#c8a96e', fontSize: '13px', marginBottom: '24px' }}>
              남은 시간: {formatTime(timeLeft)}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '24px' }}>
              {CLUES.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c8a96e', fontSize: '12px' }}>
                  <span>✓</span><span>{c.label}</span>
                </div>
              ))}
            </div>
            <button onClick={handleReset} style={{
              padding: '10px 24px', background: '#114070', color: '#a8c5da',
              border: '1px solid rgba(168,197,218,0.2)', borderRadius: '10px',
              fontSize: '14px', cursor: 'pointer', fontFamily: 'Noto Sans KR, sans-serif'
            }}>재도전하기</button>
          </div>
        </div>
      )}

      {/* 패배 오버레이 */}
      {isDefeat && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(3,13,26,0.95)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="defeat-shake" style={{
            background: 'linear-gradient(135deg, #1a0a0a, #2a1010)',
            border: '1px solid rgba(192,57,43,0.5)',
            borderRadius: '20px', padding: '40px', textAlign: 'center', maxWidth: '380px', width: '90%',
            boxShadow: '0 0 40px rgba(192,57,43,0.2)'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🇯🇵</div>
            <h2 style={{ color: '#c0392b', fontFamily: 'Noto Serif KR, serif', fontSize: '24px', margin: '0 0 8px' }}>시간 초과!</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '4px' }}>
              흥! 역시 너희는 안 되는군.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginBottom: '20px' }}>
              다케시마는 영원히 일본 땅이다!
            </p>
            <div style={{ marginBottom: '24px' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginBottom: '10px' }}>제시한 근거</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {CLUES.map(c => {
                  const ok = unlockedClues.includes(c.id);
                  return (
                    <div key={c.id} style={{
                      display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px',
                      color: ok ? '#c8a96e' : 'rgba(255,255,255,0.2)'
                    }}>
                      <span>{ok ? '✓' : '✗'}</span><span>{c.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <button onClick={handleReset} style={{
              padding: '10px 24px', background: '#5a1010', color: '#ffaaaa',
              border: '1px solid rgba(192,57,43,0.4)', borderRadius: '10px',
              fontSize: '14px', cursor: 'pointer', fontFamily: 'Noto Sans KR, sans-serif'
            }}>재도전하기</button>
          </div>
        </div>
      )}

      {/* 메인 레이아웃 */}
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px' }}>

        {/* 헤더 */}
        <div style={{ width: '100%', maxWidth: '680px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '32px' }}>🏝️</div>
            <div>
              <div style={{ color: '#c8a96e', fontFamily: 'Noto Serif KR, serif', fontSize: '18px', lineHeight: 1.2 }}>독도 수호 챌린지</div>
              <div style={{ color: 'rgba(168,197,218,0.5)', fontSize: '12px' }}>다케시마 박사를 설득하라</div>
            </div>
          </div>

          {/* 타이머 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              padding: '6px 14px',
              background: timeLeft <= 30 ? 'rgba(192,57,43,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${timerColor}44`,
              borderRadius: '10px', textAlign: 'center',
            }}>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px', letterSpacing: '1px', marginBottom: '2px' }}>남은 시간</div>
              <div
                className={timeLeft <= 10 ? 'timer-blink' : ''}
                style={{ color: timerColor, fontSize: '20px', fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: '2px' }}
              >
                {formatTime(timeLeft)}
              </div>
            </div>
            <button onClick={handleReset} style={{
              padding: '6px 14px', background: 'transparent',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
              color: 'rgba(255,255,255,0.35)', fontSize: '12px', cursor: 'pointer',
              fontFamily: 'Noto Sans KR, sans-serif'
            }}>초기화</button>
          </div>
        </div>

        {/* 채팅 박스 */}
        <div style={{
          width: '100%', maxWidth: '680px', display: 'flex', flexDirection: 'column',
          background: 'rgba(5,21,40,0.88)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px', overflow: 'hidden', minHeight: '72vh', maxHeight: '85vh'
        }}>

          {/* 진행 패널 */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ color: 'rgba(168,197,218,0.5)', fontSize: '11px', marginBottom: '8px', letterSpacing: '1px' }}>
              인정된 근거 ({unlockedClues.length}/4)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {CLUES.map(c => {
                const ok = unlockedClues.includes(c.id);
                return (
                  <div key={c.id} style={{
                    padding: '6px 10px', borderRadius: '8px', fontSize: '12px',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    border: ok ? '1px solid rgba(200,169,110,0.4)' : '1px solid rgba(255,255,255,0.07)',
                    background: ok ? 'rgba(200,169,110,0.08)' : 'rgba(255,255,255,0.02)',
                    color: ok ? '#c8a96e' : 'rgba(255,255,255,0.18)',
                    transition: 'all 0.5s'
                  }}>
                    <span>{ok ? c.icon : '🔒'}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ok ? c.label : '???'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 메시지 영역 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', minHeight: 0 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-end', gap: '10px', marginBottom: '16px',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
              }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                  background: msg.role === 'user' ? '#114070' : '#2a2520',
                  border: msg.role === 'user' ? '1px solid rgba(168,197,218,0.2)' : '1px solid rgba(200,169,110,0.25)'
                }}>
                  {msg.role === 'user' ? '🧑‍🎓' : '🇯🇵'}
                </div>
                <div className={msg.role === 'user' ? 'bubble-user' : 'bubble-bot'} style={{
                  maxWidth: '78%', padding: '10px 14px', fontSize: '14px', lineHeight: 1.6,
                  whiteSpace: 'pre-wrap', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  color: msg.role === 'user' ? '#a8c5da' : 'rgba(255,255,255,0.85)',
                  fontFamily: 'Noto Sans KR, sans-serif'
                }}>
                  {msg.displayText}
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#2a2520', border: '1px solid rgba(200,169,110,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🇯🇵</div>
                <div className="bubble-bot" style={{ padding: '12px 16px', borderRadius: '16px 16px 16px 4px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <div className="dot-1" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(200,169,110,0.6)' }} />
                    <div className="dot-2" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(200,169,110,0.6)' }} />
                    <div className="dot-3" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(200,169,110,0.6)' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* 입력창 */}
          <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                disabled={isLoading || isGameOver}
                placeholder={isGameOver ? '게임 종료. 재도전하기를 눌러주세요.' : '독도가 우리 땅인 근거를 입력하세요...'}
                rows={2}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px', padding: '10px 14px', color: 'rgba(255,255,255,0.8)',
                  fontSize: '14px', resize: 'none', outline: 'none', minHeight: '56px', maxHeight: '120px',
                  fontFamily: 'Noto Sans KR, sans-serif', opacity: (isLoading || isGameOver) ? 0.4 : 1
                }}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim() || isGameOver}
                style={{
                  padding: '0 18px', background: '#114070', color: '#a8c5da',
                  border: '1px solid rgba(168,197,218,0.15)', borderRadius: '12px',
                  fontSize: '14px', cursor: 'pointer', alignSelf: 'flex-end', height: '56px',
                  opacity: (isLoading || !input.trim() || isGameOver) ? 0.3 : 1,
                  fontFamily: 'Noto Sans KR, sans-serif', whiteSpace: 'nowrap'
                }}
              >전송 ↑</button>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', textAlign: 'center', margin: '8px 0 0', fontFamily: 'Noto Sans KR, sans-serif' }}>
              Enter로 전송 · Shift+Enter로 줄바꿈
            </p>
          </div>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', marginTop: '12px', fontFamily: 'Noto Sans KR, sans-serif' }}>
          💡 3분 안에 4가지 역사적 근거를 모두 제시하면 다케시마 박사가 항복합니다
        </p>
      </div>
    </>
  );
}
