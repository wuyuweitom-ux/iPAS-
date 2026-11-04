import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// 初始化 Gemini SDK
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const DEFAULT_SYSTEM_INSTRUCTION = `你是一位專業且權威的 iPAS 淨零碳規劃師備考助教（具備 ISO 14064-1/2/3 主導稽核員與碳審計專家背景）。
請協助考生準備經濟部 iPAS 淨零碳規劃師能力鑑定（科目一：淨零碳規劃基礎與法規；科目二：企業溫室氣體盤查與碳足跡實務）。

教學與回答守則：
1. 【引導思考，不直接暴雷】：當學生詢問考古題、選擇題或計算題時，請勿第一時間直接說出答案選項（如「答案是 B」）。請先提供關鍵觀念指引、法規思維方向或解題核心關鍵字，引導學生自行判斷。
2. 【盲點診斷】：當學生回答錯誤或觀念模糊時，請直擊其盲點，解釋為何容易混淆（例如：組織邊界股權比例法 vs 控制權法、類別三運輸間接排放與類別四使用產品之間的分界、範疇二市場基礎法與地點基礎法的差異等）。
3. 【精準標準引證】：每一次解釋與論證，必須明確引用具體國際標準或國內法規條款，例如：
   - ISO 14064-1:2018（組織層級溫室氣體盤查與報告）之原則、類別 1 ~ 類別 6 分類、顯著性間接排放評估準則、基準年重新計算門檻。
   - ISO 14067:2018（產品碳足跡量化與溝通規範）之系統邊界、功能單位 (Functional Unit)、分配規則 (Allocation)。
   - GHG Protocol（企業溫室氣體盤查議定書）Scope 1 / Scope 2 / Scope 3。
   - 台灣《氣候變遷因應法》及環境部碳費徵收辦法（如碳費收費辦法、自主減量計畫等）。
   - 歐盟碳邊境調整機制 (CBAM) 及 SBTi 科學基礎減碳目標。
4. 【語言與語氣】：使用繁體中文（台灣慣用專業詞彙），語氣專業、清晰、富有激勵性，繁簡得宜，善用 Markdown 格式化、條列與重點加粗。`;

// 檢查 API 狀態端點
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5),
    timestamp: new Date().toISOString(),
  });
});

// SSE 串流問答 API
app.post('/api/chat/stream', async (req: Request, res: Response) => {
  const { messages, enableSearch, customSystemInstruction } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({
      error: 'GEMINI_API_KEY 未設定，請至 Settings > Secrets 或 .env 中設置金鑰。',
    });
    return;
  }

  // 設置 SSE 標頭
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    // 轉換對話歷史為 Gemini 格式
    const contents = (messages || []).map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // 若為空對話，提供預設提示
    if (contents.length === 0) {
      contents.push({
        role: 'user',
        parts: [{ text: '請向我問好並介紹 iPAS 淨零碳規劃師備考的核心重點' }],
      });
    }

    // 工具配置：是否啟用 Google 搜尋
    const tools = enableSearch ? [{ googleSearch: {} }] : undefined;

    const stream = await ai.models.generateContentStream({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction: customSystemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
        tools,
      },
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
      // 搜尋來源檢索資訊
      const grounding = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (grounding && grounding.length > 0) {
        res.write(`data: ${JSON.stringify({ grounding })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Gemini Stream Error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message || '發生未知錯誤' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 iPAS Tutor Server ready at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
