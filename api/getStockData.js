export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '只允許 POST 請求' });
    }

    const { symbol, from, to } = req.body;
    
    // 安全讀取 Finnhub API Key
    const apiKey = (process.env.FINNHUB_API_KEY || '').trim();

    if (!apiKey) {
        return res.status(500).json({ error: '伺服器未配置 FINNHUB_API_KEY。' });
    }

    try {
        // 呼叫 Finnhub 的歷史 K 線 API (Resolution D 代表 Daily 每日)
        const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${apiKey}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('無法從 Finnhub 獲取資料');
        }

        const data = await response.json();
        res.status(200).json(data);

    } catch (error) {
        console.error("Finnhub API 錯誤:", error);
        res.status(500).json({ error: error.message });
    }
}