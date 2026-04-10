// 這是運行在 Vercel 伺服器上的後端程式碼 (Node.js)
// 它的功用是：安全地讀取環境變數中的 API Key，代替前端去呼叫 Gemini API

export default async function handler(req, res) {
    // 只允許 POST 請求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '只允許 POST 請求' });
    }

    const { prompt } = req.body;

    // 🏆 安全核心：從 Vercel 的環境變數中讀取 API Key (前端絕對看不到這個)
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: '伺服器未配置 GEMINI_API_KEY 環境變數' });
    }

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
        
        // 將前端傳來的 prompt 組合起來，發送給 Google 的 Gemini 伺服器
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                systemInstruction: { parts: [{ text: "你是一個專業、客觀的加密貨幣與傳統金融市場分析師。" }] }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Google API 回應錯誤: ${errorText}`);
        }

        const data = await response.json();
        
        // 將 Google 算好的結果原封不動傳回給前端
        res.status(200).json(data);

    } catch (error) {
        console.error("後端執行錯誤:", error);
        res.status(500).json({ error: error.message });
    }
}