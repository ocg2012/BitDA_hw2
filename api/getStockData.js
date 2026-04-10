export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { symbol, from, to } = req.body;

  try {
    // Yahoo Finance 的歷史數據介面 (不需要 API Key)
    // 注意：Yahoo 使用 interval (1d) 而非 resolution
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${from}&period2=${to}&interval=1d`;
    
    const response = await fetch(url);
    const result = await response.json();

    if (!response.ok || !result.chart.result) {
      return res.status(response.status).json({ 
        error: "Yahoo Finance 抓取失敗", 
        details: result.chart?.error || "未知錯誤" 
      });
    }

    const chart = result.chart.result[0];
    
    // 轉換格式以相容你原本的 Finnhub 前端邏輯
    // Finnhub 格式是 { s: "ok", t: [], c: [] }
    const formattedData = {
      s: "ok",
      t: chart.timestamp,
      c: chart.indicators.quote[0].close
    };

    return res.status(200).json(formattedData);
  } catch (err) {
    console.error("Yahoo API 處理發生例外:", err);
    return res.status(500).json({ error: '後端執行失敗', message: err.message });
  }
}