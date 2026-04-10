export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { symbol, from, to } = req.body;
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    console.error("錯誤：找不到 FINNHUB_API_KEY 環境變數");
    return res.status(500).json({ error: '伺服器環境變數配置錯誤' });
  }

  try {
    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    // 檢查 Finnhub 的回應狀態
    if (!response.ok) {
      console.error("Finnhub 回傳錯誤碼:", response.status, data);
      return res.status(response.status).json({ 
        error: `Finnhub API 錯誤: ${data.error || '未知錯誤'}`,
        details: data
      });
    }

    if (data.s === "no_data") {
      return res.status(404).json({ error: '該時段內無股價資料' });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("API 處理發生例外:", err);
    return res.status(500).json({ error: '後端執行失敗', message: err.message });
  }
}