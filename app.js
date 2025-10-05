// app.js — shared logic for all pages
const KEY = 'baint_v2_state';

// Utility
const $ = (id) => document.getElementById(id);
const toast = (t)=>{ const el = document.getElementById('toast'); el.textContent = t; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2000) }

// Default state
function defaultState(){ return {
  address: null,
  privateKey: null,
  balances: { mim: 0, baint: 0 },
  txs: [],
  theme: (localStorage.getItem('baint_theme') || 'light')
}}

// State load/save
function load(){ try{ const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : defaultState() }catch(e){ return defaultState() } }
function save(s){ localStorage.setItem(KEY, JSON.stringify(s)) }

// simple random hex
function randHex(len){
  const a = new Uint8Array(len/2);
  crypto.getRandomValues(a);
  return Array.from(a).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function makeAddress(){ return '0x' + randHex(40) }
function makePrivateKey(){ return '0x' + randHex(64) }

// Page initializer
function initPage(page){
  window.state = load();
  applyTheme(window.state.theme);

  // Connect button (placeholder)
  document.querySelectorAll('[id^="connectBtn"]').forEach(b=>{
    b.addEventListener('click', ()=> toast('Connect wallet — coming soon'))
  });

  // Common elements
  if($('genBtn')) $('genBtn').addEventListener('click', genWallet);
  if($('copyAddr')) $('copyAddr').addEventListener('click', ()=> copyText(window.state.address, 'Address copied'));
  if($('copyRecv')) $('copyRecv').addEventListener('click', ()=> copyText(window.state.address, 'Address copied'));
  if($('copyPk')) $('copyPk').addEventListener('click', ()=> copyText(window.state.privateKey, 'Private key copied'));

  // Faucet buttons
  if($('faucetMim')) $('faucetMim').addEventListener('click', ()=> faucet('mim',500));
  if($('faucetBaint')) $('faucetBaint').addEventListener('click', ()=> faucet('baint',200));

  // Send page
  if(page==='send'){
    if($('fromAddr')) $('fromAddr').textContent = window.state.address || '—';
    if($('sendBtn')) $('sendBtn').addEventListener('click', sendMock);
    if($('previewBtn')) $('previewBtn').addEventListener('click', previewMock);
  }

  // Receive page
  if(page==='receive'){
    if($('recvAddr')) $('recvAddr').textContent = window.state.address || '—';
    if($('qrBtn')) $('qrBtn').addEventListener('click', showQR);
  }

  // Settings
  if(page==='settings'){
    if($('themeToggle')) $('themeToggle').addEventListener('click', toggleTheme);
    if($('applyBalances')) $('applyBalances').addEventListener('click', applyBalances);
    if($('resetAll')) $('resetAll').addEventListener('click', resetAll);
  }

  // Dashboard
  if(page==='dashboard'){
    // no-op for now
  }

  // common actions:
  if($('copyAddr')) $('copyAddr').addEventListener('click', ()=> copyText(window.state.address,'Address copied'));
  renderAll();
}

// Generate wallet
function genWallet(){
  if(!confirm('Generate a demo wallet? Do not use generated keys on real networks.')) return;
  window.state.address = makeAddress();
  window.state.privateKey = makePrivateKey();
  window.state.balances = { mim: 0, baint: 0 };
  window.state.txs = [];
  save(window.state);
  renderAll();
  toast('Demo wallet generated');
}

// copy helper
function copyText(s, msg){
  if(!s) return toast('Nothing to copy');
  navigator.clipboard.writeText(s).then(()=>toast(msg || 'Copied'));
}

// faucet
function faucet(token, amt){
  if(!window.state.address) return toast('Generate wallet first');
  window.state.balances[token] = (window.state.balances[token] || 0) + Number(amt);
  save(window.state);
  renderAll();
  toast(`+${amt} ${token==='mim'? '$MIMUSD' : '$BAINT' }`);
}

// send mock
function sendMock(){
  const to = $('to') ? $('to').value.trim() : '';
  const amount = $('amount') ? parseFloat($('amount').value.trim()) : 0;
  const token = $('tokenSelect') ? $('tokenSelect').value : 'mim';
  if(!window.state.address) return toast('Generate wallet first');
  if(!to || !to.startsWith('0x')) return toast('Enter a valid-ish recipient address');
  if(!amount || amount <= 0) return toast('Enter a valid amount');
  if((window.state.balances[token] || 0) < amount) return toast('Insufficient balance');

  window.state.balances[token] = Number((window.state.balances[token] - amount).toFixed(6));
  const tx = { id: Date.now(), type: 'Send (mock)', token, to, amount, time: Date.now() };
  window.state.txs = [...(window.state.txs||[]), tx];
  save(window.state);
  renderAll();
  toast('Mock transaction sent');
  if($('sendResult')) $('sendResult').innerHTML = `<div class="muted small">Sent ${amount} ${token==='mim'?'$MIMUSD':'$BAINT'} → ${to}</div>`;
}

// preview
function previewMock(){
  const to = $('to') ? $('to').value.trim() : '';
  const amount = $('amount') ? parseFloat($('amount').value.trim()) : 0;
  const token = $('tokenSelect') ? $('tokenSelect').value : 'mim';
  if(!to || !to.startsWith('0x')) return toast('Enter a valid-ish recipient address');
  if(!amount || amount <= 0) return toast('Enter a valid amount');
  alert(`Preview\n\nSend ${amount} ${token==='mim'?'$MIMUSD':'$BAINT'}\nTo: ${to}`);
}

// show QR (uses public generator; optional)
function showQR(){
  if(!window.state.address) return toast('Generate wallet first');
  const img = $('qrImg');
  if(!img) return;
  const url = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(window.state.address);
  img.src = url;
  $('qrArea').style.display = 'block';
  toast('QR generated (external service)');
}

// settings functions
function toggleTheme(){
  const t = window.state.theme === 'dark' ? 'light' : 'dark';
  window.state.theme = t;
  localStorage.setItem('baint_theme', t);
  applyTheme(t);
  save(window.state);
  toast('Theme updated');
}
function applyBalances(){
  const m = parseFloat($('setMim').value || '0');
  const b = parseFloat($('setBaint').value || '0');
  if(!window.state.address) return toast('Generate wallet first');
  if(!isNaN(m)) window.state.balances.mim = m;
  if(!isNaN(b)) window.state.balances.baint = b;
  save(window.state);
  renderAll();
  toast('Balances updated');
}
function resetAll(){
  if(!confirm('Reset demo wallet and data?')) return;
  localStorage.removeItem(KEY);
  window.state = defaultState();
  save(window.state);
  applyTheme(window.state.theme);
  renderAll();
  toast('Demo reset');
}

// Apply theme
function applyTheme(t){
  if(t === 'dark') document.documentElement.setAttribute('data-theme','dark');
  else document.documentElement.removeAttribute('data-theme');
}

// Render dashboard & common UI
function renderAll(){
  // addresses
  const addrEls = ['addr','fromAddr','recvAddr'];
  addrEls.forEach(id=>{
    const el = $(id);
    if(el) el.textContent = window.state.address || '—';
  });

  // balances
  if($('bal_mim')) $('bal_mim').textContent = (window.state.balances.mim ?? 0) + ' $MIMUSD';
  if($('bal_baint')) $('bal_baint').textContent = (window.state.balances.baint ?? 0) + ' $BAINT';

  // activity list
  if($('activity')){
    const txs = (window.state.txs || []);
    if(txs.length === 0) $('activity').innerHTML = '<div class="muted small">No activity yet.</div>';
    else {
      $('activity').innerHTML = txs.slice().reverse().map(tx=>`
        <div style="border-left:3px solid rgba(11,116,255,0.08);padding-left:10px;margin-bottom:8px;border-radius:6px;background:rgba(250,251,255,1);padding:10px">
          <div style="font-weight:700">${tx.type} • ${tx.token==='mim'?'$MIMUSD':'$BAINT'}</div>
          <div class="muted small">To: <span style="font-family:monospace">${tx.to}</span></div>
          <div class="muted small">Amount: ${tx.amount}</div>
          <div class="muted small">At: ${new Date(tx.time).toLocaleString()}</div>
        </div>
      `).join('');
    }
  }
    }
