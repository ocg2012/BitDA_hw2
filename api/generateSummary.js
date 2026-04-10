// 這是運行在 Vercel 伺服器上的後端程式碼 (Node.js)

export default async function handler(req, res) {
    // 只允許 POST 請求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '只允許 POST 請求' });
    }

    const { prompt } = req.body;

    // 從 Vercel 的環境變數中讀取 API Key
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: '伺服器未配置 GEMINI_API_KEY 環境變數' });
    }

    try {
        // 🌟 修改這裡：換成帶有 -latest 後綴的穩定模型名稱
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
        
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
        
        res.status(200).json(data);

    } catch (error) {
        console.error("後端執行錯誤:", error);
        res.status(500).json({ error: error.message });
    }
}