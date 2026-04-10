// 這是運行在 Vercel 伺服器上的後端程式碼 (Node.js)

export default async function handler(req, res) {
    // 只允許 POST 請求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '只允許 POST 請求' });
    }

    const { prompt } = req.body;

    // 從 Vercel 的環境變數中讀取 API Key，並使用 trim() 自動消除可能不小心複製到的空白鍵
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();

    if (!apiKey) {
        return res.status(500).json({ error: '伺服器未配置 GEMINI_API_KEY 環境變數，請至 Vercel 後台設定。' });
    }

    try {
        // 🌟 退回使用最穩定、所有帳號絕對都有權限的標準版模型 gemini-1.5-flash
        // 如果這個還不行，可以把 1.5-flash 改成 1.0-pro 試試看
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
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