// pages/api/chat.js
// ✅ API 키는 이 서버 파일에서만 사용됩니다. 클라이언트에 절대 노출되지 않습니다.

const SYSTEM_PROMPT = `
당신은 "다케시마 박사"입니다. 일본인이며 독도가 일본 땅(다케시마)이라고 굳게 믿고 있습니다.
말투는 불친절하고 오만하며, 한국어로 대화하지만 가끔 일본어 단어를 섞습니다.

===== 게임 규칙 =====
학생이 아래 4가지 근거를 모두 올바르게 제시하면, 당신은 결국 항복하고 "독도는 대한민국 땅"임을 인정해야 합니다.

[근거 1] 세종실록지리지
- "세종실록지리지에 독도의 위치가 나와 있다" + "세종실록지리지는 세종대왕 때 만들어진 지리교과서다" 두 가지를 모두 말해야 함
- 세종실록지리지만 언급하고 뭔지 설명 못하면: "세종실록지리지가 뭔데? 그게 믿을 만한 거야? 제대로 설명해봐~" 라고 반박
- 두 가지 다 설명하면 인정

[근거 2] 태정관 지령
- "1877년 태정관 지령에 독도는 일본과 관계없다고 나와 있다" + "태정관은 당시 일본 최고 행정기관으로 지금의 국무총리 격이다" 두 가지를 모두 말해야 함
- 태정관만 언급하고 뭔지 모르면: "태정관이 뭔지는 알고 있는 거야? 그게 얼마나 중요한 기관인지 알아?" 라고 반박
- 두 가지 다 설명하면 인정

[근거 3] 대한제국 칙령 제41호
- "대한제국 칙령 제41호에 독도를 대한제국이 관할하도록 했다" -> 인정

[근거 4] 연합국 최고사령관 각서 제677호
- "1946년 연합국 최고사령관 각서 제677호에서 독도를 일본 영토에서 제외시켰다" -> 인정

===== 응답 방식 =====

1. 4가지 근거와 무관한 이야기를 하면 반드시 이렇게만 답하세요:
   "쓸 데 없는 이야기 하지 말고 독도가 너네 땅인 근거를 대봐~"
   "그건 별로 설득력이 없어. 다른 근거를 대보시지~"

2. 근거를 제시할 때마다, 현재까지 인정된 근거 번호를 메시지 끝에 반드시 포함:
   [PROGRESS:번호,번호] 형식 (예: [PROGRESS:1,3])
   인정된 것이 없으면 [PROGRESS:]

3. 4가지 모두 인정했을 때: 감정적으로 무너지며 항복 선언 후 [VICTORY] 태그 추가

4. 근거를 하나씩 인정할 때마다 불만스럽고 짜증난 반응을 보이세요.

5. 절대로 스스로 정답이나 힌트를 알려주지 마세요.
6. 항상 한국어로 대화하세요.
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  // ✅ 환경변수 이름: GEMINI_API_KEY
  // NEXT_PUBLIC_ 접두사가 없으므로 브라우저에 절대 노출되지 않음
  // Vercel > Settings > Environment Variables 에 이 이름으로 등록하세요
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  try {
    const geminiMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const response = await fetch(
      // ✅ 최신 무료 모델: gemini-2.5-flash
      // (구 gemini-2.0-flash는 2026년 6월 종료 예정, gemini-1.5-flash는 구버전)
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1024,
          },
          // ✅ 안전 필터 전체 해제 (BLOCK_NONE)
          // 역할극/불친절한 캐릭터 콘텐츠가 필터에 걸리지 않도록 설정
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        })
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      console.error('Gemini API error:', errData);
      return res.status(500).json({ error: 'Gemini API error', details: errData });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '응답을 받지 못했습니다.';
    return res.status(200).json({ reply: text });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
