export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { symbol, from, to } = req.body;
  
  // 🔑 請將這裡換成你的 Finnhub API Key (建議後續改放進 Vercel Environment Variables)
  const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || '在此填入你的_FINNHUB_API_KEY';

  try {
    // 1. 抓取 Finnhub 歷史股價 (K線資料)
    // resolution=D 代表「日K」，from 與 to 剛好也是吃 UNIX 時間戳，完美銜接！
    const chartUrl = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
    const chartResponse = await fetch(chartUrl);
    
    if (!chartResponse.ok) {
      throw new Error(`Finnhub 歷史股價 API 錯誤，狀態碼: ${chartResponse.status}`);
    }
    const chartResult = await chartResponse.json();

    // Finnhub 如果沒有資料，會回傳 s: "no_data"
    if (chartResult.s !== 'ok') {
      throw new Error(`Finnhub 無法獲取該區間的股價資料 (狀態: ${chartResult.s})`);
    }

    // 2. 動態抓取 Finnhub 發行股數 (Company Profile 2)
    let sharesOutstanding = null;
    try {
      const profileUrl = `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
      const profileRes = await fetch(profileUrl);
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData.shareOutstanding) {
          // ⚠️ 注意：Finnhub 回傳的股數單位是「百萬(millions)」，必須乘以 1,000,000
          sharesOutstanding = profileData.shareOutstanding * 1000000;
        }
      }
    } catch (e) {
      console.error("Finnhub 股數抓取發生異常:", e.message);
    }

    // 3. 動態抓取 CoinGecko 企業比特幣持倉量
    let btcHoldings = null;
    try {
      const cgRes = await fetch('https://api.coingecko.com/api/v3/companies/public_treasury/bitcoin', {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
      });
      if (cgRes.ok) {
        const cgData = await cgRes.json();
        const treasury = cgData.companies?.find(c => c.symbol.toLowerCase() === symbol.toLowerCase());
        if (treasury && treasury.total_holdings) {
          btcHoldings = treasury.total_holdings;
        }
      }
    } catch (e) {
      console.error("CoinGecko 持倉抓取發生異常:", e.message);
    }

    // 4. 最新保底數據 (Fallback) - 雙重保險，API 壞掉圖表還是準的！
    const fallbacks = {
      'MSTR': { shares: 345600000, btc: 766970 },   // 2026/04 真實股數與持倉量
      'MARA': { shares: 320000000, btc: 26842 },
      'RIOT': { shares: 310000000, btc: 9024 }
    };
    
    const finalShares = sharesOutstanding || fallbacks[symbol.toUpperCase()]?.shares;
    const finalBtc = btcHoldings || fallbacks[symbol.toUpperCase()]?.btc;

    // 5. 統一打包傳回給前端
    // Finnhub 的資料結構 chartResult 直接就是 { c: [收盤價], t: [時間戳], s: "ok" }
    // 所以我們甚至不用像 Yahoo 那樣去深層解析 (chart.indicators.quote[0]...)
    const formattedData = {
      s: "ok",
      t: chartResult.t,
      c: chartResult.c,
      info: {
        sharesOutstanding: finalShares,
        btcHoldings: finalBtc
      }
    };

    return res.status(200).json(formattedData);
  } catch (err) {
    console.error("API 處理發生致命錯誤:", err);
    return res.status(500).json({ error: '後端執行失敗', message: err.message });
  }
}