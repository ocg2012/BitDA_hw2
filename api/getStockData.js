export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允許 POST 請求' });
  }

  const { symbol, from, to } = req.body;

  try {
    // 1. 抓取歷史股價 (Chart Data)
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${from}&period2=${to}&interval=1d`;
    const chartResponse = await fetch(chartUrl);
    const chartResult = await chartResponse.json();

    if (!chartResponse.ok || !chartResult.chart.result) {
      throw new Error("無法獲取股價資料");
    }

    // 2. 抓取即時發行股數 (Summary Data)
    // modules=defaultKeyStatistics 包含了發行股數
    const summaryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=defaultKeyStatistics`;
    const summaryResponse = await fetch(summaryUrl);
    const summaryResult = await summaryResponse.json();
    
    let sharesOutstanding = null;
    if (summaryResponse.ok && summaryResult.quoteSummary.result) {
      sharesOutstanding = summaryResult.quoteSummary.result[0].defaultKeyStatistics.sharesOutstanding?.raw;
    }

    const chart = chartResult.chart.result[0];
    
    // 封裝結果
    const formattedData = {
      s: "ok",
      t: chart.timestamp,
      c: chart.indicators.quote[0].close,
      // 額外傳回這家公司的即時資訊
      info: {
        sharesOutstanding: sharesOutstanding,
        regularMarketPrice: chart.meta.regularMarketPrice
      }
    };

    return res.status(200).json(formattedData);
  } catch (err) {
    console.error("Yahoo API 處理錯誤:", err);
    return res.status(500).json({ error: '後端執行失敗', message: err.message });
  }
}