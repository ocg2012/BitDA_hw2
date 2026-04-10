// 這是運行在 Vercel 伺服器上的後端程式碼 (Node.js)

export default async function handler(req, res) {
    // 只允許 POST 請求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '只允許 POST 請求' });
    }

    const { prompt } = req.body;

    // 從 Vercel 的環境變數中讀取 API Key，並自動消除空白鍵
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();

    if (!apiKey) {
        return res.status(500).json({ error: '伺服器未配置 GEMINI_API_KEY 環境變數。' });
    }

    try {
        // 🌟 終極退路：使用最基礎的 gemini-2.5-flash 模型，這個模型 100% 所有帳號都能用
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        // 將系統設定合併到 prompt 裡面，因為 gemini-2.5-flash 不支援 systemInstruction 參數
        const fullPrompt = "你是一個專業、客觀的加密貨幣與傳統金融市場分析師。\n\n" + prompt;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                // 只留下最基礎的 contents 結構
                contents: [{ parts: [{ text: fullPrompt }] }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText);
        }

        const data = await response.json();
        
        // 將 Google 算好的結果傳回給前端
        res.status(200).json(data);

    } catch (error) {
        console.error("後端執行錯誤:", error);
        res.status(500).json({ error: error.message });
    }
}