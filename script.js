// ===== STATE =====
const S = {
  balance: 100000,
  positions: [],
  orders: [],
  selectedIdx: 0,
  orderSide: 'BUY',
  chartType: 'candle',
  timeframe: '1m',
  showMA: true,
  showVol: true,
  theme: 'dark',
  mouseX: -1,
  mouseY: -1
};

// ===== STOCK DATA =====
const stocks = [
  { s: 'RELIANCE', n: 'Reliance Industries', sec: 'Energy', bp: 2890 },
  { s: 'TCS', n: 'Tata Consultancy Services', sec: 'IT', bp: 3950 },
  { s: 'HDFCBANK', n: 'HDFC Bank Ltd', sec: 'Banking', bp: 1620 },
  { s: 'INFY', n: 'Infosys Ltd', sec: 'IT', bp: 1480 },
  { s: 'ICICIBANK', n: 'ICICI Bank Ltd', sec: 'Banking', bp: 1120 },
  { s: 'SBIN', n: 'State Bank of India', sec: 'Banking', bp: 780 },
  { s: 'BAJFINANCE', n: 'Bajaj Finance Ltd', sec: 'Finance', bp: 6850 },
  { s: 'TATAMOTORS', n: 'Tata Motors Ltd', sec: 'Auto', bp: 950 },
  { s: 'WIPRO', n: 'Wipro Ltd', sec: 'IT', bp: 458 },
  { s: 'ITC', n: 'ITC Ltd', sec: 'FMCG', bp: 432 },
  { s: 'ADANIENT', n: 'Adani Enterprises', sec: 'Conglomerate', bp: 3150 },
  { s: 'MARUTI', n: 'Maruti Suzuki India', sec: 'Auto', bp: 12450 },
  { s: 'SUNPHARMA', n: 'Sun Pharma Ltd', sec: 'Pharma', bp: 1580 },
  { s: 'HCLTECH', n: 'HCL Technologies', sec: 'IT', bp: 1520 },
  { s: 'BHARTIARTL', n: 'Bharti Airtel Ltd', sec: 'Telecom', bp: 1650 },
  { s: 'KOTAKBANK', n: 'Kotak Mahindra Bank', sec: 'Banking', bp: 1780 },
  { s: 'LT', n: 'Larsen & Toubro', sec: 'Infrastructure', bp: 3420 },
  { s: 'ASIANPAINT', n: 'Asian Paints Ltd', sec: 'Consumer', bp: 2860 },
  { s: 'TITAN', n: 'Titan Company Ltd', sec: 'Consumer', bp: 3250 },
  { s: 'AXISBANK', n: 'Axis Bank Ltd', sec: 'Banking', bp: 1080 }
];

// Initialize stock runtime data
stocks.forEach(st => {
  st.price = st.bp;
  st.prevClose = st.bp;
  st.open = st.bp + (Math.random() - .5) * st.bp * 0.005;
  st.high = st.price;
  st.low = st.price;
  st.vol = Math.floor(Math.random() * 5e6) + 1e6;
  st.change = 0;
  st.changePct = 0;
  st.candles = generateHistory(st.bp, 80);
});

function generateHistory(base, count) {
  const arr = [];
  let p = base * (0.97 + Math.random() * 0.06);
  for (let i = 0; i < count; i++) {
    const v = base * 0.003;
    const o = p;
    const c = o + (Math.random() - .48) * v * 4;
    const h = Math.max(o, c) + Math.random() * v * 2;
    const l = Math.min(o, c) - Math.random() * v * 2;
    arr.push({ o, h, l, c, v: Math.floor(Math.random() * 1e6) + 2e5, t: Date.now() - ((count - i) * 60000) });
    p = c;
  }
  return arr;
}

// ===== PRICE ENGINE =====
function tickPrices() {
  stocks.forEach(st => {
    const volatility = st.bp * 0.0015;
    const drift = (Math.random() - .48) * volatility;
    st.price = Math.max(st.bp * 0.8, st.price + drift);
    st.change = st.price - st.prevClose;
    st.changePct = (st.change / st.prevClose) * 100;
    st.high = Math.max(st.high, st.price);
    st.low = Math.min(st.low, st.price);
    st.vol += Math.floor(Math.random() * 5000);

    // Update current candle or add new
    const candles = st.candles;
    const last = candles[candles.length - 1];
    const now = Date.now();
    const tfMs = {
      '1m': 60000, '5m': 300000, '15m': 900000, '1h': 3600000, '1d': 86400000
    }[S.timeframe] || 60000;

    if (now - last.t < tfMs) {
      last.c = st.price;
      last.h = Math.max(last.h, st.price);
      last.l = Math.min(last.l, st.price);
      last.v += Math.floor(Math.random() * 1000);
    } else {
      candles.push({ o: last.c, h: st.price, l: st.price, c: st.price, v: Math.floor(Math.random() * 2e5), t: now });
      if (candles.length > 200) candles.shift();
    }
  });

  // Update positions P&L
  S.positions.forEach(pos => {
    const st = stocks.find(s => s.s === pos.symbol);
    if (st) {
      pos.ltp = st.price;
      pos.pnl = pos.side === 'BUY' ? (st.price - pos.entry) * pos.qty : (pos.entry - st.price) * pos.qty;
    }
  });
}

// ===== FORMATTING =====
function fmt(n) {
  if (n === undefined || n === null) return '₹0';
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtInt(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
function fmtVol(n) {
  if (n >= 1e7) return (n / 1e7).toFixed(1) + 'Cr';
  if (n >= 1e5) return (n / 1e5).toFixed(1) + 'L';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toString();
}

// ===== UI RENDERING =====
function renderWatchlist() {
  const q = document.getElementById('wlSearch').value.toLowerCase();
  const el = document.getElementById('wlItems');
  let html = '';
  stocks.forEach((st, i) => {
    if (q && !st.s.toLowerCase().includes(q) && !st.n.toLowerCase().includes(q)) return;
    const cls = i === S.selectedIdx ? 'wl-item active' : 'wl-item';
    const pcls = st.change >= 0 ? 'positive' : 'negative';
    const sign = st.change >= 0 ? '+' : '';
    html += `<div class="${cls}" onclick="selectStock(${i})">
      <div><div class="sym">${st.s}</div><div class="sname">${st.n}</div></div>
      <div class="price-col"><div class="price">${fmt(st.price)}</div>
      <div class="change ${pcls}">${sign}${st.change.toFixed(2)} (${sign}${st.changePct.toFixed(2)}%)</div></div></div>`;
  });
  el.innerHTML = html;
}

function renderStockHeader() {
  const st = stocks[S.selectedIdx];
  document.getElementById('shSymbol').textContent = st.s;
  document.getElementById('shName').textContent = st.n;
  document.getElementById('shLtp').textContent = fmt(st.price);
  const chgEl = document.getElementById('shChg');
  const sign = st.change >= 0 ? '+' : '';
  chgEl.textContent = `${sign}${st.change.toFixed(2)} (${sign}${st.changePct.toFixed(2)}%)`;
  chgEl.className = 'chg ' + (st.change >= 0 ? 'positive' : 'negative');
  document.getElementById('shOpen').textContent = fmt(st.open);
  document.getElementById('shHigh').textContent = fmt(st.high);
  document.getElementById('shLow').textContent = fmt(st.low);
  document.getElementById('shVol').textContent = fmtVol(st.vol);
}

function renderPositions() {
  const tbody = document.getElementById('posBody');
  document.getElementById('posCount').textContent = `(${S.positions.length})`;
  if (!S.positions.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-msg">No open positions</td></tr>'; return; }
  let html = '';
  S.positions.forEach(p => {
    const pcls = p.pnl >= 0 ? 'positive' : 'negative';
    const sign = p.pnl >= 0 ? '+' : '';
    html += `<tr>
      <td><strong>${p.symbol}</strong></td>
      <td><span class="${p.side === 'BUY' ? 'positive' : 'negative'}" style="font-weight:700">${p.side}</span></td>
      <td>${p.qty}</td>
      <td>${fmt(p.entry)}</td>
      <td>${fmt(p.ltp)}</td>
      <td class="${pcls}" style="font-weight:700">${sign}${fmt(p.pnl)}</td>
      <td><button class="exit-btn" onclick="exitPosition(${p.id})">EXIT</button></td>
    </tr>`;
  });
  tbody.innerHTML = html;
}

function renderOrders() {
  const tbody = document.getElementById('ordBody');
  document.getElementById('ordCount').textContent = `(${S.orders.length})`;
  if (!S.orders.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-msg">No orders placed yet</td></tr>'; return; }
  let html = '';
  S.orders.slice().reverse().forEach(o => {
    const t = new Date(o.time);
    const ts = t.getHours().toString().padStart(2, '0') + ':' + t.getMinutes().toString().padStart(2, '0') + ':' + t.getSeconds().toString().padStart(2, '0');
    html += `<tr>
      <td>${ts}</td>
      <td><strong>${o.symbol}</strong></td>
      <td><span class="${o.side === 'BUY' ? 'positive' : 'negative'}" style="font-weight:700">${o.side}</span></td>
      <td>${o.qty}</td><td>${fmt(o.price)}</td><td>${o.type}</td>
      <td><span style="color:var(--green);font-weight:600">${o.status}</span></td>
    </tr>`;
  });
  tbody.innerHTML = html;
}

function updateBalance() {
  document.getElementById('navBalance').textContent = fmt(S.balance);
}

function updateSummary() {
  const st = stocks[S.selectedIdx];
  const qty = parseInt(document.getElementById('qtyInput').value) || 1;
  const orderType = document.getElementById('orderType').value;
  let price = st.price;
  if (orderType === 'LIMIT') {
    const lp = parseFloat(document.getElementById('limitPrice').value);
    if (lp > 0) price = lp;
  }
  document.getElementById('sumPrice').textContent = fmt(price);
  document.getElementById('sumQty').textContent = qty;
  const charges = Math.round(price * qty * 0.0003);
  document.getElementById('sumCharges').textContent = fmt(charges);
  document.getElementById('sumTotal').textContent = fmt(price * qty + charges);
  const btn = document.getElementById('placeBtn');
  btn.textContent = `${S.orderSide} ${st.s}`;
  btn.className = 'place-btn ' + (S.orderSide === 'BUY' ? 'buy-btn' : 'sell-btn');
}

function renderDepth() {
  const st = stocks[S.selectedIdx];
  let html = '<div style="display:flex;gap:16px"><div style="flex:1"><div style="font-size:10px;color:var(--text2);margin-bottom:4px;display:flex;justify-content:space-between"><span>BID QTY</span><span>BID PRICE</span></div>';
  for (let i = 0; i < 5; i++) {
    const p = st.price - (i + 1) * st.bp * 0.001 * (1 + Math.random() * 0.5);
    const q = Math.floor(Math.random() * 500) + 50;
    html += `<div class="depth-row"><span class="qty">${q}</span><span class="bid">${p.toFixed(2)}</span></div>`;
  }
  html += '</div><div style="flex:1"><div style="font-size:10px;color:var(--text2);margin-bottom:4px;display:flex;justify-content:space-between"><span>ASK PRICE</span><span>ASK QTY</span></div>';
  for (let i = 0; i < 5; i++) {
    const p = st.price + (i + 1) * st.bp * 0.001 * (1 + Math.random() * 0.5);
    const q = Math.floor(Math.random() * 500) + 50;
    html += `<div class="depth-row"><span class="ask">${p.toFixed(2)}</span><span class="qty">${q}</span></div>`;
  }
  html += '</div></div>';
  document.getElementById('depthRows').innerHTML = html;
}

function renderPortfolio() {
  let totalPnl = 0, invested = 0;
  S.positions.forEach(p => { totalPnl += p.pnl; invested += p.entry * p.qty; });
  document.getElementById('pvTotal').textContent = fmt(S.balance + invested + totalPnl);
  document.getElementById('pvBal').textContent = fmt(S.balance);
  document.getElementById('pvInv').textContent = fmt(invested);
  const pnlEl = document.getElementById('pvPnl');
  pnlEl.textContent = (totalPnl >= 0 ? '+' : '') + fmt(totalPnl);
  pnlEl.className = 'pcv ' + (totalPnl >= 0 ? 'green' : 'red');
  const cont = document.getElementById('pvPositions');
  if (!S.positions.length) { cont.innerHTML = '<div class="empty-msg">No open positions. Go to Trading to start! 🚀</div>'; return; }
  let html = '<table class="dtable"><thead><tr><th>Symbol</th><th>Side</th><th>Qty</th><th>Entry</th><th>LTP</th><th>P&L</th></tr></thead><tbody>';
  S.positions.forEach(p => {
    const pcls = p.pnl >= 0 ? 'positive' : 'negative';
    html += `<tr><td><strong>${p.symbol}</strong></td><td class="${p.side === 'BUY' ? 'positive' : 'negative'}" style="font-weight:700">${p.side}</td><td>${p.qty}</td><td>${fmt(p.entry)}</td><td>${fmt(p.ltp)}</td><td class="${pcls}" style="font-weight:700">${(p.pnl >= 0 ? '+' : '') + fmt(p.pnl)}</td></tr>`;
  });
  html += '</tbody></table>';
  cont.innerHTML = html;
}

function renderStocksView() {
  const q = document.getElementById('mktSearch')?.value.toLowerCase() || '';
  const sectors = {};
  stocks.forEach(st => {
    if (q && !st.s.toLowerCase().includes(q) && !st.n.toLowerCase().includes(q)) return;
    if (!sectors[st.sec]) sectors[st.sec] = [];
    sectors[st.sec].push(st);
  });
  let html = '';
  Object.keys(sectors).forEach(sec => {
    html += `<div class="sector-label">${sec}</div><div class="stocks-grid">`;
    sectors[sec].forEach((st, idx) => {
      const pcls = st.change >= 0 ? 'positive' : 'negative';
      const sign = st.change >= 0 ? '+' : '';
      const i = stocks.indexOf(st);
      html += `<div class="stock-card" onclick="selectStock(${i});switchView('trading',document.querySelector('.nav-tab'))">
        <div class="sc-top"><div><div class="sc-sym">${st.s}</div><div class="sc-name">${st.n}</div></div>
        <div><div class="sc-price">${fmt(st.price)}</div><div class="sc-change ${pcls}">${sign}${st.changePct.toFixed(2)}%</div></div></div>
        <div class="sc-bottom"><span>Vol: ${fmtVol(st.vol)}</span><span>Sec: ${st.sec}</span></div>
        <button class="sc-trade-btn">Trade Now →</button></div>`;
    });
    html += '</div>';
  });
  document.getElementById('stocksList').innerHTML = html;
}

// ===== CHART ENGINE =====
function drawChart() {
  const canvas = document.getElementById('mainChart');
  const wrap = document.getElementById('chartWrap');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = wrap.clientWidth * dpr;
  canvas.height = wrap.clientHeight * dpr;
  canvas.style.width = wrap.clientWidth + 'px';
  canvas.style.height = wrap.clientHeight + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const W = wrap.clientWidth, H = wrap.clientHeight;
  const isDark = S.theme === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)';
  const textColor = isDark ? '#787b86' : '#999';

  ctx.clearRect(0, 0, W, H);

  const st = stocks[S.selectedIdx];
  const data = st.candles;
  if (!data.length) return;

  const rightMargin = 65;
  const topMargin = 10;
  const bottomMargin = S.showVol ? 60 : 30;
  const volH = S.showVol ? 40 : 0;
  const chartW = W - rightMargin;
  const chartH = H - topMargin - bottomMargin - volH;

  const maxCandles = Math.min(data.length, Math.floor(chartW / 10));
  const visData = data.slice(-maxCandles);
  const candleW = chartW / maxCandles;

  // Price range
  let minP = Infinity, maxP = -Infinity, maxVol = 0;
  visData.forEach(c => {
    minP = Math.min(minP, c.l);
    maxP = Math.max(maxP, c.h);
    maxVol = Math.max(maxVol, c.v);
  });
  const pad = (maxP - minP) * 0.08 || maxP * 0.01;
  minP -= pad; maxP += pad;

  const priceToY = p => topMargin + (1 - (p - minP) / (maxP - minP)) * chartH;
  const volToY = v => H - bottomMargin - (v / maxVol) * volH;

  // Grid
  ctx.strokeStyle = gridColor; ctx.lineWidth = 1;
  const gridLines = 6;
  for (let i = 0; i <= gridLines; i++) {
    const y = topMargin + i * (chartH / gridLines);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
    const price = maxP - (i / gridLines) * (maxP - minP);
    ctx.fillStyle = textColor; ctx.font = '11px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(price.toFixed(2), chartW + 8, y + 4);
  }

  // Volume bars
  if (S.showVol) {
    visData.forEach((c, i) => {
      const x = i * candleW;
      const isUp = c.c >= c.o;
      ctx.fillStyle = isUp ? 'rgba(38,166,154,.25)' : 'rgba(239,83,80,.25)';
      const vH = (c.v / maxVol) * volH;
      ctx.fillRect(x + candleW * 0.15, H - bottomMargin - vH, candleW * 0.7, vH);
    });
  }

  // Moving Averages
  if (S.showMA && visData.length > 5) {
    [20, 50].forEach((period, pi) => {
      const color = pi === 0 ? '#f59e0b' : '#8b5cf6';
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath();
      let started = false;
      visData.forEach((c, i) => {
        const startI = data.length - maxCandles + i;
        if (startI < period) return;
        let sum = 0;
        for (let j = 0; j < period; j++) sum += data[startI - j].c;
        const ma = sum / period;
        const x = i * candleW + candleW / 2;
        const y = priceToY(ma);
        if (!started) { ctx.moveTo(x, y); started = true }
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  }

  if (S.chartType === 'candle') {
    // Candlesticks
    visData.forEach((c, i) => {
      const x = i * candleW + candleW / 2;
      const isUp = c.c >= c.o;
      const color = isUp ? '#26a69a' : '#ef5350';
      ctx.strokeStyle = color; ctx.fillStyle = color;

      // Wick
      ctx.beginPath(); ctx.moveTo(x, priceToY(c.h)); ctx.lineTo(x, priceToY(c.l)); ctx.lineWidth = 1; ctx.stroke();

      // Body
      const bTop = priceToY(Math.max(c.o, c.c));
      const bBot = priceToY(Math.min(c.o, c.c));
      const bH = Math.max(bBot - bTop, 1);
      if (isUp) {
        ctx.fillRect(x - candleW * 0.35, bTop, candleW * 0.7, bH);
      } else {
        ctx.fillRect(x - candleW * 0.35, bTop, candleW * 0.7, bH);
      }
    });
  } else {
    // Line chart
    ctx.strokeStyle = isDark ? '#58a6ff' : '#2962ff'; ctx.lineWidth = 2; ctx.beginPath();
    visData.forEach((c, i) => {
      const x = i * candleW + candleW / 2;
      const y = priceToY(c.c);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Area fill
    const lastX = (visData.length - 1) * candleW + candleW / 2;
    ctx.lineTo(lastX, topMargin + chartH); ctx.lineTo(candleW / 2, topMargin + chartH); ctx.closePath();
    const grad = ctx.createLinearGradient(0, topMargin, 0, topMargin + chartH);
    grad.addColorStop(0, isDark ? 'rgba(88,166,255,.15)' : 'rgba(41,98,255,.1)');
    grad.addColorStop(1, 'rgba(88,166,255,0)');
    ctx.fillStyle = grad; ctx.fill();
  }

  // Current price line
  const cpY = priceToY(st.price);
  ctx.strokeStyle = st.change >= 0 ? '#26a69a' : '#ef5350';
  ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(0, cpY); ctx.lineTo(W, cpY); ctx.stroke();
  ctx.setLineDash([]);
  // Price label
  ctx.fillStyle = st.change >= 0 ? '#26a69a' : '#ef5350';
  const lblW = 70;
  ctx.fillRect(chartW, cpY - 10, lblW, 20);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(st.price.toFixed(2), chartW + lblW / 2, cpY + 4);

  // Crosshair
  if (S.mouseX > 0 && S.mouseX < chartW && S.mouseY > 0 && S.mouseY < H) {
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.15)';
    ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(S.mouseX, 0); ctx.lineTo(S.mouseX, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, S.mouseY); ctx.lineTo(W, S.mouseY); ctx.stroke();
    ctx.setLineDash([]);

    // Price at cursor
    if (S.mouseY >= topMargin && S.mouseY <= topMargin + chartH) {
      const hp = maxP - (S.mouseY - topMargin) / chartH * (maxP - minP);
      ctx.fillStyle = isDark ? '#30363d' : '#d0d7de';
      ctx.fillRect(chartW, S.mouseY - 10, 65, 20);
      ctx.fillStyle = textColor; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(hp.toFixed(2), chartW + 32, S.mouseY + 4);
    }

    // OHLC at cursor candle
    const ci = Math.floor(S.mouseX / candleW);
    if (ci >= 0 && ci < visData.length) {
      const c = visData[ci];
      ctx.font = '11px system-ui'; ctx.textAlign = 'left';
      const y = 8;
      const labels = [`O: ${c.o.toFixed(2)}`, `H: ${c.h.toFixed(2)}`, `L: ${c.l.toFixed(2)}`, `C: ${c.c.toFixed(2)}`, `V: ${fmtVol(c.v)}`];
      let lx = 8;
      labels.forEach(l => {
        ctx.fillStyle = textColor;
        ctx.fillText(l, lx, topMargin + 14);
        lx += ctx.measureText(l).width + 12;
      });
    }
  }
}

// Chart mouse events
const chartCanvas = document.getElementById('mainChart');
chartCanvas.addEventListener('mousemove', e => {
  const r = chartCanvas.getBoundingClientRect();
  S.mouseX = e.clientX - r.left;
  S.mouseY = e.clientY - r.top;
});
chartCanvas.addEventListener('mouseleave', () => { S.mouseX = -1; S.mouseY = -1; });

// ===== TRADING =====
function placeOrder() {
  const st = stocks[S.selectedIdx];
  const qty = parseInt(document.getElementById('qtyInput').value);
  if (!qty || qty < 1) { toast('Enter valid quantity', 'error'); return; }
  const orderType = document.getElementById('orderType').value;
  let price = st.price;
  if (orderType === 'LIMIT') {
    const lp = parseFloat(document.getElementById('limitPrice').value);
    if (!lp || lp <= 0) { toast('Enter valid limit price', 'error'); return; }
    price = lp;
  }
  const cost = price * qty;
  if (cost > S.balance) { toast('Insufficient balance! Need ' + fmt(cost), 'error'); return; }

  S.balance -= cost;
  const pos = { id: Date.now(), symbol: st.s, side: S.orderSide, qty, entry: price, ltp: price, pnl: 0, time: Date.now() };
  S.positions.push(pos);
  S.orders.push({ symbol: st.s, side: S.orderSide, qty, price, type: orderType, status: 'EXECUTED', time: Date.now() });

  toast(`${S.orderSide} ${qty} ${st.s} @ ${fmt(price)}`, 'success');
  updateBalance(); renderPositions(); renderOrders(); updateSummary();
}

function exitPosition(id) {
  const idx = S.positions.findIndex(p => p.id === id);
  if (idx === -1) return;
  const pos = S.positions[idx];
  const st = stocks.find(s => s.s === pos.symbol);
  let proceeds;
  if (pos.side === 'BUY') {
    proceeds = pos.ltp * pos.qty;
  } else {
    proceeds = pos.entry * pos.qty + pos.pnl;
  }
  S.balance += proceeds;
  const pnl = pos.pnl;
  S.positions.splice(idx, 1);
  S.orders.push({ symbol: pos.symbol, side: pos.side === 'BUY' ? 'SELL' : 'BUY', qty: pos.qty, price: pos.ltp, type: 'MARKET', status: 'EXECUTED', time: Date.now() });
  toast(`Exited ${pos.symbol} | P&L: ${(pnl >= 0 ? '+' : '') + fmt(pnl)}`, pnl >= 0 ? 'success' : 'error');
  updateBalance(); renderPositions(); renderOrders();
}

// ===== SIP CALCULATOR =====
function calcSIP() {
  const m = parseFloat(document.getElementById('sipAmt').value);
  const r = parseFloat(document.getElementById('sipRate').value);
  const y = parseFloat(document.getElementById('sipYrs').value);
  document.getElementById('sipAmtLbl').textContent = fmtInt(m);
  document.getElementById('sipRateLbl').textContent = r + '%';
  document.getElementById('sipYrsLbl').textContent = y + ' year' + (y > 1 ? 's' : '');

  const n = y * 12;
  const mr = r / 100 / 12;
  const fv = m * ((Math.pow(1 + mr, n) - 1) / mr) * (1 + mr);
  const inv = m * n;
  const ret = fv - inv;

  document.getElementById('sipInv').textContent = fmtInt(inv);
  document.getElementById('sipRet').textContent = fmtInt(ret);
  document.getElementById('sipTot').textContent = fmtInt(fv);

  drawSIPChart(m, mr, n, inv, fv);
}

function drawSIPChart(monthly, mr, months) {
  const canvas = document.getElementById('sipChart');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.parentElement.clientWidth - 40;
  const H = 250;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);

  const isDark = S.theme === 'dark';
  const textColor = isDark ? '#787b86' : '#999';

  // Calculate data points
  const points = [];
  const invPoints = [];
  let total = 0;
  for (let i = 0; i <= months; i++) {
    total = monthly * ((Math.pow(1 + mr, i) - 1) / mr) * (1 + mr);
    if (i === 0) total = 0;
    points.push(total);
    invPoints.push(monthly * i);
  }

  const maxVal = Math.max(...points);
  const step = Math.max(1, Math.floor(months / Math.min(months, W / 3)));

  const chartL = 10, chartR = W - 10, chartT = 10, chartB = H - 30;
  const cW = chartR - chartL, cH = chartB - chartT;

  ctx.clearRect(0, 0, W, H);

  // Invested area
  ctx.beginPath();
  for (let i = 0; i <= months; i += step) {
    const x = chartL + (i / months) * cW;
    const y = chartB - (invPoints[i] / maxVal) * cH;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  const lastXi = chartL + (months / months) * cW;
  ctx.lineTo(lastXi, chartB); ctx.lineTo(chartL, chartB); ctx.closePath();
  ctx.fillStyle = isDark ? 'rgba(88,166,255,.2)' : 'rgba(41,98,255,.15)';
  ctx.fill();

  // Total value area
  ctx.beginPath();
  for (let i = 0; i <= months; i += step) {
    const x = chartL + (i / months) * cW;
    const y = chartB - (points[i] / maxVal) * cH;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.lineTo(lastXi, chartB); ctx.lineTo(chartL, chartB); ctx.closePath();
  ctx.fillStyle = isDark ? 'rgba(38,166,154,.2)' : 'rgba(38,166,154,.15)';
  ctx.fill();

  // Lines
  ctx.strokeStyle = '#58a6ff'; ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0; i <= months; i += step) {
    const x = chartL + (i / months) * cW;
    const y = chartB - (invPoints[i] / maxVal) * cH;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.strokeStyle = '#26a69a'; ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0; i <= months; i += step) {
    const x = chartL + (i / months) * cW;
    const y = chartB - (points[i] / maxVal) * cH;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Labels
  ctx.fillStyle = textColor; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
  for (let yr = 0; yr <= months / 12; yr += Math.max(1, Math.floor(months / 12 / 6))) {
    const x = chartL + (yr * 12 / months) * cW;
    ctx.fillText(yr + 'Y', x, H - 8);
  }

  // Legend
  ctx.font = '11px system-ui';
  ctx.fillStyle = '#58a6ff'; ctx.fillRect(W - 200, 8, 12, 12);
  ctx.fillStyle = textColor; ctx.textAlign = 'left'; ctx.fillText('Invested', W - 184, 18);
  ctx.fillStyle = '#26a69a'; ctx.fillRect(W - 100, 8, 12, 12);
  ctx.fillStyle = textColor; ctx.fillText('Total Value', W - 84, 18);
}

// ===== UI ACTIONS =====
function selectStock(i) {
  S.selectedIdx = i;
  renderWatchlist(); renderStockHeader(); updateSummary(); renderDepth();
}

function setOrderSide(side) {
  S.orderSide = side;
  document.getElementById('buyTabBtn').className = 'order-tab buy' + (side === 'BUY' ? ' active' : '');
  document.getElementById('sellTabBtn').className = 'order-tab sell' + (side === 'SELL' ? ' active' : '');
  updateSummary();
}

function onOrderTypeChange() {
  const t = document.getElementById('orderType').value;
  document.getElementById('limitPriceGrp').style.display = t === 'LIMIT' || t === 'SL' ? 'flex' : 'none';
  if (t === 'LIMIT' || t === 'SL') {
    document.getElementById('limitPrice').value = stocks[S.selectedIdx].price.toFixed(2);
  }
  updateSummary();
}

function adjQty(d) {
  const inp = document.getElementById('qtyInput');
  inp.value = Math.max(1, (parseInt(inp.value) || 0) + d);
  updateSummary();
}

function setTimeframe(tf, btn) {
  S.timeframe = tf;
  document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function setChartType(type, btn) {
  S.chartType = type;
  document.querySelectorAll('.tool-group .tool-btn').forEach(b => {
    if (b.id === 'candleBtn' || b.id === 'lineBtn') b.classList.remove('active');
  });
  btn.classList.add('active');
}

function toggleIndicator(ind, btn) {
  if (ind === 'ma') S.showMA = !S.showMA;
  if (ind === 'vol') S.showVol = !S.showVol;
  btn.classList.toggle('active');
}

function switchView(view, btn) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const viewMap = { trading: 'tradingViewMain', stocks: 'stocksViewMain', sip: 'sipViewMain', portfolio: 'portfolioViewMain' };
  document.getElementById(viewMap[view]).classList.add('active');
  if (btn) {
    document.querySelectorAll('.nav-tab').forEach(t => {
      if (t.textContent.toLowerCase().includes(view)) t.classList.add('active');
    });
  }
  document.querySelector('.nav-tabs')?.classList.remove('show');
  if (view === 'stocks') renderStocksView();
  if (view === 'sip') calcSIP();
  if (view === 'portfolio') renderPortfolio();
  if (view === 'trading') setTimeout(drawChart, 50);
}

function switchBTab(tab, btn) {
  document.querySelectorAll('.btab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(tab + 'Pane').classList.add('active');
}

function toggleTheme() {
  S.theme = S.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', S.theme);
  document.getElementById('themeBtn').textContent = S.theme === 'dark' ? '🌙' : '☀️';
}

function toggleMobileWL() {
  document.getElementById('watchlist').classList.toggle('show');
}

function filterWatchlist() { renderWatchlist(); }
function filterStocks() { renderStocksView(); }

function toast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  document.getElementById('toastBox').appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ===== MAIN LOOP =====
function tick() {
  tickPrices();
  renderWatchlist();
  renderStockHeader();
  renderPositions();
  renderDepth();
  updateSummary();
  drawChart();
}

// ===== INIT =====
function init() {
  selectStock(0);
  renderOrders();
  updateBalance();
  calcSIP();
  tick();
  setInterval(tick, 1500);
  window.addEventListener('resize', () => { drawChart(); });
}

init();