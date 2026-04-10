export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { symbol, from, to } = req.body;

  try {
    // 1. 抓取 Yahoo Finance 歷史股價 (主要功能)
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${from}&period2=${to}&interval=1d`;
    const chartResponse = await fetch(chartUrl);
    const chartResult = await chartResponse.json();

    if (!chartResponse.ok || !chartResult.chart.result) {
      throw new Error("無法獲取歷史股價資料");
    }
    const chart = chartResult.chart.result[0];

    // 2. 動態抓取 Yahoo Finance 發行股數 (Quote)
    let sharesOutstanding = null;
    try {
      const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
      const quoteRes = await fetch(quoteUrl);
      const quoteData = await quoteRes.json();
      if (quoteData.quoteResponse?.result?.[0]?.sharesOutstanding) {
        sharesOutstanding = quoteData.quoteResponse.result[0].sharesOutstanding;
      }
    } catch (e) {
      console.error("Yahoo 股數抓取失敗:", e);
    }

    // 3. 動態抓取 CoinGecko 企業比特幣持倉量
    let btcHoldings = null;
    try {
      const cgRes = await fetch('https://api.coingecko.com/api/v3/companies/public_treasury/bitcoin');
      const cgData = await cgRes.json();
      // 在列表中尋找對應的股票代號
      const treasury = cgData.companies?.find(c => c.symbol.toLowerCase() === symbol.toLowerCase());
      if (treasury && treasury.total_holdings) {
        btcHoldings = treasury.total_holdings;
      }
    } catch (e) {
      console.error("CoinGecko 持倉抓取失敗:", e);
    }

    // 4. 統一打包傳回給前端
    const formattedData = {
      s: "ok",
      t: chart.timestamp,
      c: chart.indicators.quote[0].close,
      info: {
        sharesOutstanding: sharesOutstanding,
        btcHoldings: btcHoldings
      }
    };

    return res.status(200).json(formattedData);
  } catch (err) {
    console.error("API 處理發生例外:", err);
    return res.status(500).json({ error: '後端執行失敗', message: err.message });
  }
}