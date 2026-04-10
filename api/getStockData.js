export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { symbol, from, to } = req.body;

  // 加上 User-Agent 偽裝成正常瀏覽器，避免被 Yahoo 擋下
  const fetchOptions = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  };

  try {
    // 1. 抓取 Yahoo Finance 歷史股價
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${from}&period2=${to}&interval=1d`;
    const chartResponse = await fetch(chartUrl, fetchOptions);
    const chartResult = await chartResponse.json();

    if (!chartResponse.ok || !chartResult.chart.result) {
      throw new Error("無法獲取歷史股價資料");
    }
    const chart = chartResult.chart.result[0];

    // 2. 動態抓取 Yahoo Finance 發行股數 (Quote)
    let sharesOutstanding = null;
    try {
      const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
      const quoteRes = await fetch(quoteUrl, fetchOptions);
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
      if (cgRes.ok) {
        const cgData = await cgRes.json();
        const treasury = cgData.companies?.find(c => c.symbol.toLowerCase() === symbol.toLowerCase());
        if (treasury && treasury.total_holdings) {
          btcHoldings = treasury.total_holdings;
        }
      }
    } catch (e) {
      console.error("CoinGecko 持倉抓取失敗:", e);
    }

    // 定義各公司的備用預設值 (如果 API 臨時壞掉，網頁才不會整組當掉)
    const fallbacks = {
      'MSTR': { shares: 345600000, btc: 766970 },   // 2026/04 真實股數與持倉量
      'MARA': { shares: 380234635, btc: 38689 },
      'RIOT': { shares: 379125849, btc: 15680 }
    };

    // 4. 統一打包傳回給前端 (如果有抓到就用動態的，沒抓到就用備用值)
    const formattedData = {
      s: "ok",
      t: chart.timestamp,
      c: chart.indicators.quote[0].close,
      info: {
        sharesOutstanding: sharesOutstanding || fallbacks[symbol.toUpperCase()]?.shares,
        btcHoldings: btcHoldings || fallbacks[symbol.toUpperCase()]?.btc
      }
    };

    return res.status(200).json(formattedData);
  } catch (err) {
    console.error("API 處理發生例外:", err);
    return res.status(500).json({ error: '後端執行失敗', message: err.message });
  }
}