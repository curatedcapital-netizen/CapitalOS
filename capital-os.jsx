import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, LineChart, Line, CartesianGrid } from "recharts";

// ═══════════════════════════════════════════════════════════════════════════════
// CAPITAL OS v2 — Brutalist Fog · Elite Edition
// Persistence · Templates · Goals · Snapshots · Deal P&L · Shortcuts · Import
// ═══════════════════════════════════════════════════════════════════════════════

const ALLOC = [
  { key: "taxes", label: "Taxes", pct: 0.30, color: "#B0B0B0" },
  { key: "liquidity", label: "War Chest", pct: 0.30, color: "#E8E8E8" },
  { key: "reinvestment", label: "Reinvestment", pct: 0.20, color: "#9A9A9A" },
  { key: "debt", label: "Debt Paydown", pct: 0.15, color: "#787878" },
  { key: "investing", label: "Investing", pct: 0.03, color: "#C8C8C8" },
  { key: "lifestyle", label: "Lifestyle", pct: 0.02, color: "#686868" },
];

const REINV_CATS = ["Lead Generation", "Tools/Software", "Marketing/Content", "Education", "Other"];
const SPEND_CATS = ["Food", "Housing", "Transport", "Entertainment", "Health", "Other"];
const uid = () => Math.random().toString(36).slice(2, 10);
const F = (n) => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:0,maximumFractionDigits:0}).format(n);
const P = (n) => `${(n*100).toFixed(1)}%`;
const td = () => new Date().toISOString().split("T")[0];
const wkAgo = () => { const d=new Date(); d.setDate(d.getDate()-7); return d.toISOString().split("T")[0]; };
const moStart = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`; };
const moKey = () => new Date().toISOString().slice(0,7);
const rel = (ds) => new Date(ds+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"});

// ── SEED ────
const SEED = {
  income:[
    {id:uid(),date:"2026-03-01",source:"Wholesale Deal — Pine St",amount:18000,notes:"Assignment fee"},
    {id:uid(),date:"2026-03-08",source:"Consulting — Marcus Group",amount:5000,notes:"Advisory retainer"},
    {id:uid(),date:"2026-03-15",source:"JV Split — Oak Ave Flip",amount:12000,notes:"50/50 profit split"},
    {id:uid(),date:"2026-03-22",source:"Wholesale Deal — Elm Blvd",amount:9500,notes:"Double close"},
    {id:uid(),date:"2026-04-01",source:"Consulting — Apex Capital",amount:7500,notes:"Deal structuring"},
    {id:uid(),date:"2026-04-05",source:"Wholesale Deal — Birch Ln",amount:22000,notes:"Off-market acquisition"},
    {id:uid(),date:"2026-04-10",source:"Referral Fee — DealForge",amount:3000,notes:"Buyer referral"},
  ],
  debts:[
    {id:uid(),name:"Chase Sapphire",init:12000,payments:[{id:uid(),date:"2026-03-01",amount:675},{id:uid(),date:"2026-03-15",amount:675},{id:uid(),date:"2026-04-01",amount:1162.5}]},
    {id:uid(),name:"Amex Business",init:8000,payments:[{id:uid(),date:"2026-03-01",amount:450},{id:uid(),date:"2026-03-15",amount:450},{id:uid(),date:"2026-04-01",amount:775}]},
  ],
  deals:[
    {id:uid(),date:"2026-03-10",amount:5000,ret:15000,actualRet:null,status:"active",notes:"Earnest deposit — Maple Dr"},
    {id:uid(),date:"2026-03-25",amount:3000,ret:9000,actualRet:10200,status:"returned",notes:"Marketing push — 3 counties"},
  ],
  reinvestments:[
    {id:uid(),date:"2026-03-02",amount:1500,cat:"Lead Generation",notes:"Direct mail — 2000 pieces",roi:6.0},
    {id:uid(),date:"2026-03-10",amount:800,cat:"Tools/Software",notes:"PropStream + BatchLeads annual",roi:null},
    {id:uid(),date:"2026-03-18",amount:2000,cat:"Marketing/Content",notes:"YouTube ads — seller leads",roi:3.5},
    {id:uid(),date:"2026-04-02",amount:1200,cat:"Lead Generation",notes:"Skip tracing — 5000 records",roi:null},
  ],
  investments:[
    {id:uid(),date:"2026-03-05",amount:335,val:352,ticker:"VOO"},
    {id:uid(),date:"2026-03-20",amount:335,val:341,ticker:"SCHD"},
    {id:uid(),date:"2026-04-05",amount:975,val:980,ticker:"VOO"},
  ],
  spending:[
    {id:uid(),date:"2026-03-03",amount:120,cat:"Food",notes:"Groceries"},
    {id:uid(),date:"2026-03-10",amount:85,cat:"Entertainment",notes:"Dinner out"},
    {id:uid(),date:"2026-03-17",amount:200,cat:"Transport",notes:"Gas + car wash"},
    {id:uid(),date:"2026-03-25",amount:60,cat:"Health",notes:"Gym"},
    {id:uid(),date:"2026-04-02",amount:150,cat:"Food",notes:"Groceries"},
    {id:uid(),date:"2026-04-08",amount:95,cat:"Entertainment",notes:"Concert tickets"},
  ],
  goals:{taxes:0,liquidity:75000,reinvestment:0,debt:20000,investing:5000,lifestyle:0},
  templates:[
    {id:uid(),source:"Consulting — Marcus Group",amount:5000,notes:"Advisory retainer"},
    {id:uid(),source:"Wholesale Deal",amount:15000,notes:"Assignment fee"},
  ],
  snapshots:[
    {month:"2026-02",totalIncome:42000,liquidity:8400,debtPaid:1800,invested:400,spent:280},
    {month:"2026-03",totalIncome:44500,liquidity:17750,debtPaid:4050,invested:670,spent:465},
  ],
};

// ── PERSISTENCE ──
const STORE_KEY = "capital_os_v2";
function loadState() {
  try { const s = JSON.parse(localStorage.getItem(STORE_KEY)); return s && s.income ? s : null; } catch { return null; }
}
function saveState(state) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
}

// ── CSV UTILS ──
function xcsv(fn,h,rows){const c=[h.join(","),...rows.map(r=>h.map(k=>{const v=r[k]??"";return typeof v==="string"&&v.includes(",")?`"${v}"`:v}).join(","))].join("\n");const b=new Blob([c],{type:"text/csv"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=fn;a.click();}

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const vals = [];
    let current = "", inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') inQuotes = !inQuotes;
      else if (line[i] === ',' && !inQuotes) { vals.push(current.trim()); current = ""; }
      else current += line[i];
    }
    vals.push(current.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
    return obj;
  });
}

// ── PALETTE ──
const T = {
  bg: "#141414",
  glass: "rgba(255,255,255,0.06)",
  glassBorder: "rgba(255,255,255,0.08)",
  glassStrong: "rgba(255,255,255,0.10)",
  border: "rgba(255,255,255,0.06)",
  text: "#D4D4D4",
  heading: "#EBEBEB",
  sub: "#777777",
  muted: "#4A4A4A",
  dim: "#333333",
  pos: "#8FBC8F",
  neg: "#C47070",
};

const ff = "'Inter', 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";
const mono = "'SF Mono', 'Fira Code', 'Consolas', monospace";

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function Glass({children, style, pad=true}) {
  return <div style={{background:T.glass,backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",border:`1px solid ${T.glassBorder}`,borderRadius:16,padding:pad?28:0,transition:"background 0.2s",...style}}>{children}</div>;
}

function GlassStrong({children, style}) {
  return <div style={{background:T.glassStrong,backdropFilter:"blur(60px)",WebkitBackdropFilter:"blur(60px)",border:`1px solid rgba(255,255,255,0.10)`,borderRadius:16,padding:28,...style}}>{children}</div>;
}

function Metric({label, value, sub, positive, negative, small}) {
  const sc = positive?T.pos:negative?T.neg:T.text;
  return (<div>
    <div style={{fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:2,fontWeight:600,marginBottom:small?6:10}}>{label}</div>
    <div style={{fontSize:small?22:34,fontWeight:600,color:T.heading,letterSpacing:-1,lineHeight:1,fontVariantNumeric:"tabular-nums"}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:sc,marginTop:8,fontWeight:500,letterSpacing:0.2}}>{sub}</div>}
  </div>);
}

function Ring({value, max, size=140, stroke=8, children}) {
  const p=max>0?Math.min(value/max,1):0;const r=(size-stroke)/2;const circ=2*Math.PI*r;
  return (<div style={{position:"relative",width:size,height:size,flexShrink:0}}>
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.dim} strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.text} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={circ*(1-p)} strokeLinecap="round" style={{transition:"stroke-dashoffset 1s cubic-bezier(0.25,0.46,0.45,0.94)"}}/>
    </svg>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>{children}</div>
  </div>);
}

function PBar({value, max, h=3, color}) {
  const p=max>0?Math.min(value/max,1):0;
  return (<div style={{background:T.dim,borderRadius:h,height:h,width:"100%",overflow:"hidden"}}>
    <div style={{width:`${p*100}%`,height:"100%",background:color||"rgba(255,255,255,0.35)",borderRadius:h,transition:"width 0.8s cubic-bezier(0.25,0.46,0.45,0.94)"}}/>
  </div>);
}

function Btn({children, onClick, secondary, size="md", style, disabled}) {
  return <button onClick={disabled?undefined:onClick} style={{
    background:secondary?"transparent":"rgba(255,255,255,0.08)",
    color:secondary?T.sub:T.text,border:`1px solid ${secondary?T.dim:"rgba(255,255,255,0.12)"}`,
    borderRadius:10,padding:size==="sm"?"7px 14px":"11px 22px",
    fontSize:size==="sm"?11:13,fontWeight:500,cursor:disabled?"not-allowed":"pointer",
    transition:"all 0.15s",letterSpacing:0.3,fontFamily:ff,opacity:disabled?0.4:1,
    display:"inline-flex",alignItems:"center",gap:6,...style
  }}>{children}</button>;
}

function Inp({label, ...props}) {
  return (<div style={{display:"flex",flexDirection:"column",gap:5,flex:1,minWidth:0}}>
    {label&&<label style={{fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600}}>{label}</label>}
    <input {...props} style={{
      background:"rgba(255,255,255,0.03)",border:`1px solid ${T.dim}`,borderRadius:10,
      padding:"11px 14px",color:T.text,fontSize:14,outline:"none",fontFamily:ff,
      width:"100%",boxSizing:"border-box",transition:"border-color 0.2s",...props.style
    }} onFocus={e=>{e.target.style.borderColor="rgba(255,255,255,0.20)"}} onBlur={e=>{e.target.style.borderColor=T.dim}}/>
  </div>);
}

function Sel({label, options, ...props}) {
  return (<div style={{display:"flex",flexDirection:"column",gap:5,flex:1,minWidth:0}}>
    {label&&<label style={{fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600}}>{label}</label>}
    <select {...props} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${T.dim}`,borderRadius:10,padding:"11px 14px",color:T.text,fontSize:14,outline:"none",fontFamily:ff,width:"100%",boxSizing:"border-box"}}>
      {options.map(o=><option key={o} value={o} style={{background:T.bg}}>{o}</option>)}
    </select>
  </div>);
}

function Tag({children, positive, negative}) {
  const c=positive?T.pos:negative?T.neg:T.sub;
  return <span style={{display:"inline-flex",padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:600,background:`${c}18`,color:c,letterSpacing:1,textTransform:"uppercase"}}>{children}</span>;
}

function Row({label, sub, amount, amtColor, right}) {
  return (<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 0",borderBottom:`1px solid ${T.border}`}}>
    <div style={{minWidth:0,flex:1}}>
      <div style={{fontSize:14,fontWeight:500,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{label}</div>
      {sub&&<div style={{fontSize:11,color:T.muted,marginTop:3}}>{sub}</div>}
    </div>
    <div style={{textAlign:"right",flexShrink:0,marginLeft:16}}>
      <div style={{fontSize:14,fontWeight:600,color:amtColor||T.text,fontVariantNumeric:"tabular-nums",fontFamily:mono,letterSpacing:-0.5}}>{amount}</div>
      {right&&<div style={{fontSize:10,color:T.muted,marginTop:3}}>{typeof right==="string"?right:right}</div>}
    </div>
  </div>);
}

function Modal({open, onClose, title, children, wide}) {
  if(!open)return null;
  return (<div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(20,20,20,0.85)",backdropFilter:"blur(12px)"}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:T.bg,border:`1px solid ${T.dim}`,borderRadius:18,padding:32,width:"100%",maxWidth:wide?600:420,maxHeight:"80vh",overflowY:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <span style={{fontSize:16,fontWeight:600,color:T.heading,letterSpacing:-0.3}}>{title}</span>
        <span onClick={onClose} style={{cursor:"pointer",color:T.muted,fontSize:18}}>×</span>
      </div>
      {children}
    </div>
  </div>);
}

function Alert({msg, negative}) {
  const c=negative?T.neg:"#B89B5E";
  return <div style={{borderLeft:`2px solid ${c}`,padding:"12px 18px",marginBottom:14,background:"rgba(255,255,255,0.02)"}}><span style={{fontSize:12,color:c,fontWeight:500,letterSpacing:0.2}}>{msg}</span></div>;
}

function SH({children, right}) {
  return <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
    <span style={{fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:2.5,fontWeight:600}}>{children}</span>{right}
  </div>;
}

// ── Keyboard shortcut badge ──
function KBD({children}) {
  return <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",minWidth:20,height:20,padding:"0 6px",borderRadius:4,background:T.dim,border:`1px solid ${T.muted}`,fontSize:10,fontWeight:600,color:T.sub,fontFamily:mono}}>{children}</span>;
}

const TABS=[
  {key:"dashboard",label:"Overview",shortcut:"1"},
  {key:"income",label:"Income",shortcut:"2"},
  {key:"warchest",label:"War Chest",shortcut:"3"},
  {key:"debt",label:"Debt",shortcut:"4"},
  {key:"reinvest",label:"Reinvest",shortcut:"5"},
  {key:"invest",label:"Invest",shortcut:"6"},
  {key:"spending",label:"Spending",shortcut:"7"},
  {key:"review",label:"Review",shortcut:"8"},
  {key:"settings",label:"Settings",shortcut:"9"},
];

const tts={background:"rgba(20,20,20,0.95)",border:`1px solid ${T.dim}`,borderRadius:10,fontSize:11,backdropFilter:"blur(20px)"};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function CapitalOS() {
  // ── LOAD PERSISTED STATE OR SEED ──
  const initial = loadState() || SEED;

  const [tab, setTab] = useState("dashboard");
  const [income, setIncome] = useState(initial.income);
  const [debts, setDebts] = useState(initial.debts);
  const [deals, setDeals] = useState(initial.deals);
  const [reinvestments, setReinvestments] = useState(initial.reinvestments);
  const [investments, setInvestments] = useState(initial.investments);
  const [spending, setSpending] = useState(initial.spending);
  const [goals, setGoals] = useState(initial.goals || SEED.goals);
  const [templates, setTemplates] = useState(initial.templates || SEED.templates);
  const [snapshots, setSnapshots] = useState(initial.snapshots || SEED.snapshots);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [importModal, setImportModal] = useState(null); // "income"|"spending"|"reinvestments"|null

  // ── AUTO-SAVE ──
  useEffect(() => {
    const state = { income, debts, deals, reinvestments, investments, spending, goals, templates, snapshots };
    saveState(state);
  }, [income, debts, deals, reinvestments, investments, spending, goals, templates, snapshots]);

  // ── MONTHLY SNAPSHOT ENGINE ──
  useEffect(() => {
    const mk = moKey();
    const exists = snapshots.find(s => s.month === mk);
    if (!exists && income.length > 0) {
      const snap = {
        month: mk,
        totalIncome: income.reduce((s,i)=>s+i.amount,0),
        liquidity: buckets.liquidity - deployed,
        debtPaid: debts.reduce((s,d)=>s+d.payments.reduce((ps,p)=>ps+p.amount,0),0),
        invested: investments.reduce((s,i)=>s+i.amount,0),
        spent: spending.reduce((s,sp)=>s+sp.amount,0),
      };
      setSnapshots(prev => [...prev.filter(s=>s.month!==mk), snap]);
    }
  });

  // ── DERIVED ──
  const buckets=useMemo(()=>{const b={};ALLOC.forEach(a=>{b[a.key]=0});income.forEach(i=>{ALLOC.forEach(a=>{b[a.key]+=i.amount*a.pct})});return b},[income]);
  const totalInc=useMemo(()=>income.reduce((s,i)=>s+i.amount,0),[income]);
  const debtPaid=useMemo(()=>debts.reduce((s,d)=>s+d.payments.reduce((ps,p)=>ps+p.amount,0),0),[debts]);
  const debtRem=useMemo(()=>debts.reduce((s,d)=>s+d.init-d.payments.reduce((ps,p)=>ps+p.amount,0),0),[debts]);
  const deployed=useMemo(()=>deals.filter(d=>d.status==="active").reduce((s,d)=>s+d.amount,0),[deals]);
  const liq=useMemo(()=>buckets.liquidity-deployed,[buckets.liquidity,deployed]);
  const totReinv=useMemo(()=>reinvestments.reduce((s,r)=>s+r.amount,0),[reinvestments]);
  const totInvAmt=useMemo(()=>investments.reduce((s,i)=>s+i.amount,0),[investments]);
  const totInvVal=useMemo(()=>investments.reduce((s,i)=>s+i.val,0),[investments]);
  const totSpend=useMemo(()=>spending.reduce((s,sp)=>s+sp.amount,0),[spending]);
  const lifeBudget=buckets.lifestyle;
  const over=totSpend>lifeBudget;
  const ms=moStart();
  const moInc=useMemo(()=>income.filter(i=>i.date>=ms).reduce((s,i)=>s+i.amount,0),[income,ms]);
  const wa=wkAgo();
  const wkInc=useMemo(()=>income.filter(i=>i.date>=wa).reduce((s,i)=>s+i.amount,0),[income,wa]);
  const wkSpend=useMemo(()=>spending.filter(s=>s.date>=wa).reduce((sm,s)=>sm+s.amount,0),[spending,wa]);
  const wkReinv=useMemo(()=>reinvestments.filter(r=>r.date>=wa).reduce((s,r)=>s+r.amount,0),[reinvestments,wa]);
  const wkDebt=useMemo(()=>debts.reduce((s,d)=>s+d.payments.filter(p=>p.date>=wa).reduce((ps,p)=>ps+p.amount,0),0),[debts,wa]);

  // Deal P&L
  const dealPL=useMemo(()=>{
    const returned=deals.filter(d=>d.status==="returned"&&d.actualRet);
    const totalDeployed=returned.reduce((s,d)=>s+d.amount,0);
    const totalReturned=returned.reduce((s,d)=>s+(d.actualRet||0),0);
    return {count:returned.length,deployed:totalDeployed,returned:totalReturned,profit:totalReturned-totalDeployed};
  },[deals]);

  const alerts=useMemo(()=>{
    const a=[];
    if(over)a.push({id:"ob",msg:`Lifestyle spend exceeds 2% allocation by ${F(totSpend-lifeBudget)}`,neg:true});
    if(liq<(goals.liquidity||75000)*0.5)a.push({id:"lq",msg:`War Chest below 50% — ${F(liq)} of ${F(goals.liquidity||75000)} target`});
    return a;
  },[over,totSpend,lifeBudget,liq,goals.liquidity]);

  const moChart=useMemo(()=>{const m={};income.forEach(i=>{const k=i.date.slice(0,7);m[k]=(m[k]||0)+i.amount});return Object.entries(m).sort().map(([k,v])=>({mo:k,income:v}))},[income]);

  // Wealth curve from snapshots
  const wealthCurve=useMemo(()=>snapshots.sort((a,b)=>a.month.localeCompare(b.month)).map(s=>({
    mo:s.month,income:s.totalIncome,liquidity:s.liquidity,debtPaid:s.debtPaid
  })),[snapshots]);

  // ── KEYBOARD SHORTCUTS ──
  useEffect(() => {
    const handler = (e) => {
      // Don't fire when typing in inputs
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") return;

      if (e.key === "Escape") { setCmdOpen(false); setImportModal(null); sDM(false); sDPM(null); sADM(false); sRetM(null); return; }
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setCmdOpen(prev=>!prev); return; }
      if (e.key === "n" || e.key === "N") { setTab("income"); return; }
      if (e.key === "d" || e.key === "D") { setTab("warchest"); return; }

      // Number keys for tabs
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9 && TABS[num-1]) { setTab(TABS[num-1].key); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── FORMS ──
  const [iF,sIF]=useState({date:td(),source:"",amount:"",notes:""});
  const addI=()=>{if(!iF.source||!iF.amount)return;setIncome(p=>[{id:uid(),...iF,amount:parseFloat(iF.amount)},...p]);sIF({date:td(),source:"",amount:"",notes:""})};
  const repeatLast=()=>{if(income.length===0)return;const last=income[0];sIF({date:td(),source:last.source,amount:String(last.amount),notes:last.notes})};
  const useTemplate=(t)=>{sIF({date:td(),source:t.source,amount:String(t.amount),notes:t.notes})};
  const saveTemplate=()=>{if(!iF.source)return;setTemplates(p=>[...p,{id:uid(),source:iF.source,amount:parseFloat(iF.amount||0),notes:iF.notes}])};

  const [dM,sDM]=useState(false);
  const [dF,sDF]=useState({date:td(),amount:"",ret:"",notes:""});
  const addD=()=>{if(!dF.amount)return;setDeals(p=>[{id:uid(),...dF,amount:parseFloat(dF.amount),ret:parseFloat(dF.ret||0),actualRet:null,status:"active"},...p]);sDF({date:td(),amount:"",ret:"",notes:""});sDM(false)};

  // Deal return modal
  const [retM,sRetM]=useState(null);
  const [retAmt,sRetAmt]=useState("");
  const closeDeal=()=>{if(!retAmt||!retM)return;setDeals(p=>p.map(d=>d.id===retM?{...d,status:"returned",actualRet:parseFloat(retAmt)}:d));sRetAmt("");sRetM(null)};

  const [dpM,sDPM]=useState(null);
  const [dpA,sDPA]=useState("");
  const addDP=()=>{if(!dpA||!dpM)return;setDebts(p=>p.map(d=>d.id===dpM?{...d,payments:[...d.payments,{id:uid(),date:td(),amount:parseFloat(dpA)}]}:d));sDPA("");sDPM(null)};
  const [adM,sADM]=useState(false);
  const [nD,sND]=useState({name:"",init:""});
  const addND=()=>{if(!nD.name||!nD.init)return;setDebts(p=>[...p,{id:uid(),name:nD.name,init:parseFloat(nD.init),payments:[]}]);sND({name:"",init:""});sADM(false)};
  const [rF,sRF]=useState({date:td(),amount:"",cat:REINV_CATS[0],notes:"",roi:""});
  const addR=()=>{if(!rF.amount)return;setReinvestments(p=>[{id:uid(),...rF,amount:parseFloat(rF.amount),roi:rF.roi?parseFloat(rF.roi):null},...p]);sRF({date:td(),amount:"",cat:REINV_CATS[0],notes:"",roi:""})};
  const [vF,sVF]=useState({date:td(),amount:"",val:"",ticker:""});
  const addV=()=>{if(!vF.amount)return;const a=parseFloat(vF.amount);setInvestments(p=>[{id:uid(),...vF,amount:a,val:vF.val?parseFloat(vF.val):a},...p]);sVF({date:td(),amount:"",val:"",ticker:""})};
  const [sForm,sSForm]=useState({date:td(),amount:"",cat:SPEND_CATS[0],notes:""});
  const addS=()=>{if(!sForm.amount)return;setSpending(p=>[{id:uid(),...sForm,amount:parseFloat(sForm.amount)},...p]);sSForm({date:td(),amount:"",cat:SPEND_CATS[0],notes:""})};

  // ── CSV IMPORT HANDLER ──
  const fileRef = useRef();
  const handleImport = (type) => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const rows = parseCSV(e.target.result);
      if (type === "income") {
        const parsed = rows.filter(r=>r.source&&r.amount).map(r=>({id:uid(),date:r.date||td(),source:r.source,amount:parseFloat(r.amount)||0,notes:r.notes||""}));
        if(parsed.length)setIncome(p=>[...parsed,...p]);
      } else if (type === "spending") {
        const parsed = rows.filter(r=>r.amount).map(r=>({id:uid(),date:r.date||td(),amount:parseFloat(r.amount)||0,cat:r.cat||r.category||"Other",notes:r.notes||""}));
        if(parsed.length)setSpending(p=>[...parsed,...p]);
      } else if (type === "reinvestments") {
        const parsed = rows.filter(r=>r.amount).map(r=>({id:uid(),date:r.date||td(),amount:parseFloat(r.amount)||0,cat:r.cat||r.category||"Other",notes:r.notes||"",roi:r.roi?parseFloat(r.roi):null}));
        if(parsed.length)setReinvestments(p=>[...parsed,...p]);
      }
      setImportModal(null);
    };
    reader.readAsText(file);
  };

  // ── RESET ──
  const resetAll = () => { localStorage.removeItem(STORE_KEY); window.location.reload(); };

  return (
    <div style={{background:T.bg,color:T.text,minHeight:"100vh",fontFamily:ff}}>

      {/* NAV */}
      <nav style={{background:"rgba(20,20,20,0.7)",backdropFilter:"blur(30px)",WebkitBackdropFilter:"blur(30px)",borderBottom:`1px solid ${T.border}`,padding:"0 40px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100,height:54}}>
        <div style={{display:"flex",alignItems:"center",gap:32}}>
          <span style={{fontSize:14,fontWeight:600,color:T.heading,letterSpacing:3,textTransform:"uppercase"}}>Capital OS</span>
          <div style={{width:1,height:20,background:T.dim}}/>
          <div style={{display:"flex",gap:0}}>
            {TABS.map(t=>(
              <button key={t.key} onClick={()=>setTab(t.key)} style={{
                background:"transparent",border:"none",padding:"18px 14px",
                fontSize:11,fontWeight:tab===t.key?600:400,letterSpacing:0.8,
                color:tab===t.key?T.heading:T.muted,cursor:"pointer",
                borderBottom:tab===t.key?`1px solid ${T.heading}`:"1px solid transparent",
                transition:"all 0.2s",marginBottom:-1,fontFamily:ff,textTransform:"uppercase"
              }}>{t.label}</button>
            ))}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div onClick={()=>setCmdOpen(true)} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px",borderRadius:8,border:`1px solid ${T.dim}`,cursor:"pointer",fontSize:11,color:T.muted}}>
            <span>Search</span><KBD>⌘K</KBD>
          </div>
          <span style={{fontSize:10,color:T.muted,letterSpacing:1.5,fontWeight:500,textTransform:"uppercase"}}>{new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
        </div>
      </nav>

      {/* COMMAND PALETTE */}
      <Modal open={cmdOpen} onClose={()=>setCmdOpen(false)} title="Quick Navigation">
        <div style={{fontSize:12,color:T.sub,marginBottom:16}}>Press a number key to jump to any tab, or use shortcuts below</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {TABS.map(t=>(
            <div key={t.key} onClick={()=>{setTab(t.key);setCmdOpen(false)}} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderRadius:10,border:`1px solid ${T.dim}`,cursor:"pointer",transition:"background 0.15s",background:tab===t.key?"rgba(255,255,255,0.06)":"transparent"}}>
              <span style={{fontSize:13,color:T.text,fontWeight:500}}>{t.label}</span>
              <KBD>{t.shortcut}</KBD>
            </div>
          ))}
        </div>
        <div style={{marginTop:16,padding:"12px 0",borderTop:`1px solid ${T.dim}`}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:12,fontSize:11,color:T.muted}}>
            <span><KBD>N</KBD> New Income</span>
            <span><KBD>D</KBD> Deploy Capital</span>
            <span><KBD>Esc</KBD> Close</span>
          </div>
        </div>
      </Modal>

      {/* IMPORT MODAL */}
      <Modal open={!!importModal} onClose={()=>setImportModal(null)} title={`Import ${importModal} CSV`}>
        <div style={{fontSize:12,color:T.sub,marginBottom:16}}>
          CSV must have headers matching: {importModal==="income"?"date, source, amount, notes":importModal==="spending"?"date, amount, cat, notes":"date, amount, cat, notes, roi"}
        </div>
        <input ref={fileRef} type="file" accept=".csv" style={{marginBottom:16,fontSize:13,color:T.text}}/>
        <Btn onClick={()=>handleImport(importModal)}>Import</Btn>
      </Modal>

      {/* ALERTS */}
      {alerts.length>0&&<div style={{padding:"20px 40px 0",maxWidth:1160,margin:"0 auto"}}>{alerts.map(a=><Alert key={a.id} msg={a.msg} negative={a.neg}/>)}</div>}

      <main style={{padding:"36px 40px 80px",maxWidth:1160,margin:"0 auto"}}>

        {/* ══════════ DASHBOARD ══════════ */}
        {tab==="dashboard"&&(<>
          <div style={{marginBottom:48}}>
            <div style={{fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:3,fontWeight:600,marginBottom:16}}>Total Capital Earned</div>
            <div style={{display:"flex",alignItems:"baseline",gap:16}}>
              <span style={{fontSize:72,fontWeight:300,letterSpacing:-4,lineHeight:1,color:T.heading,fontVariantNumeric:"tabular-nums"}}>{F(totalInc)}</span>
              <span style={{fontSize:14,color:T.pos,fontWeight:500}}>+{F(moInc)} this month</span>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:32}}>
            {[
              {l:"War Chest",v:F(liq),s:`${P(liq/(goals.liquidity||75000))} of ${F(goals.liquidity||75000)}`},
              {l:"Debt Remaining",v:F(debtRem),s:`${F(debtPaid)} eliminated`,neg:true},
              {l:"Portfolio",v:F(totInvVal),s:`${totInvVal>=totInvAmt?"+":""}${F(totInvVal-totInvAmt)} return`,pos:totInvVal>=totInvAmt},
              {l:"Deal P&L",v:dealPL.count>0?F(dealPL.profit):"—",s:dealPL.count>0?`${dealPL.count} closed deals`:"No closed deals",pos:dealPL.profit>0},
            ].map((m,i)=>(
              <Glass key={i} style={{padding:22}}><Metric label={m.l} value={m.v} sub={m.s} positive={m.pos} negative={m.neg} small/></Glass>
            ))}
          </div>

          {/* Ring + Allocation */}
          <div style={{display:"grid",gridTemplateColumns:"320px 1fr",gap:16,marginBottom:20}}>
            <GlassStrong style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:36}}>
              <Ring value={liq} max={goals.liquidity||75000} size={180} stroke={6}>
                <div style={{fontSize:36,fontWeight:300,letterSpacing:-1,color:T.heading}}>{P(liq/(goals.liquidity||75000))}</div>
                <div style={{fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:3,marginTop:6}}>War Chest</div>
              </Ring>
              <div style={{marginTop:20,textAlign:"center"}}>
                <div style={{fontSize:13,color:T.sub}}>{F(liq)} <span style={{color:T.muted}}>of {F(goals.liquidity||75000)}</span></div>
              </div>
            </GlassStrong>
            <Glass>
              <SH>Allocation</SH>
              {ALLOC.map(a=>{
                const g=goals[a.key];
                return(
                <div key={a.key} style={{marginBottom:18}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:13,fontWeight:500,color:T.text}}>{a.label}</span>
                      <span style={{fontSize:10,color:T.muted}}>{(a.pct*100).toFixed(0)}%</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:13,fontWeight:500,color:T.heading,fontFamily:mono,letterSpacing:-0.5}}>{F(buckets[a.key])}</span>
                      {g>0&&<span style={{fontSize:10,color:T.muted}}>/ {F(g)}</span>}
                    </div>
                  </div>
                  <PBar value={buckets[a.key]} max={g>0?g:totalInc*0.3}/>
                </div>
              )})}
            </Glass>
          </div>

          {/* Wealth Curve + Monthly Income */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
            <Glass>
              <SH>Wealth Curve</SH>
              {wealthCurve.length>1?(
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={wealthCurve}>
                    <CartesianGrid stroke={T.dim} strokeDasharray="3 3"/>
                    <XAxis dataKey="mo" tick={{fill:T.muted,fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:T.muted,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`}/>
                    <Tooltip contentStyle={tts} formatter={v=>F(v)}/>
                    <Line type="monotone" dataKey="income" stroke={T.heading} strokeWidth={1.5} dot={{fill:T.heading,r:3}} name="Total Income"/>
                    <Line type="monotone" dataKey="liquidity" stroke="#B0B0B0" strokeWidth={1} dot={false} name="Liquidity"/>
                  </LineChart>
                </ResponsiveContainer>
              ):<div style={{padding:40,textAlign:"center",color:T.muted,fontSize:12}}>Snapshots build over time</div>}
            </Glass>
            <Glass>
              <SH>Monthly Income</SH>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={moChart}>
                  <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(255,255,255,0.15)" stopOpacity={1}/><stop offset="100%" stopColor="rgba(255,255,255,0)" stopOpacity={1}/></linearGradient></defs>
                  <XAxis dataKey="mo" tick={{fill:T.muted,fontSize:10}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:T.muted,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`}/>
                  <Tooltip contentStyle={tts} formatter={v=>F(v)}/>
                  <Area type="monotone" dataKey="income" stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} fill="url(#g1)"/>
                </AreaChart>
              </ResponsiveContainer>
            </Glass>
          </div>

          {/* Bucket Goals (if any set) */}
          {Object.values(goals).some(g=>g>0)&&(
            <Glass>
              <SH>Goal Progress</SH>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}}>
                {ALLOC.filter(a=>goals[a.key]>0).map(a=>{
                  let current=buckets[a.key];
                  if(a.key==="debt")current=debtPaid;
                  if(a.key==="investing")current=totInvAmt;
                  return(
                    <div key={a.key} style={{display:"flex",alignItems:"center",gap:16}}>
                      <Ring value={current} max={goals[a.key]} size={64} stroke={4}>
                        <span style={{fontSize:12,fontWeight:600}}>{P(current/goals[a.key])}</span>
                      </Ring>
                      <div>
                        <div style={{fontSize:13,fontWeight:500,color:T.heading}}>{a.label}</div>
                        <div style={{fontSize:11,color:T.muted}}>{F(current)} / {F(goals[a.key])}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Glass>
          )}
        </>)}

        {/* ══════════ INCOME ══════════ */}
        {tab==="income"&&(<>
          <div style={{marginBottom:36}}>
            <div style={{fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:3,fontWeight:600,marginBottom:12}}>Income</div>
            <div style={{fontSize:32,fontWeight:300,letterSpacing:-1,color:T.heading}}>Every dollar has a job</div>
          </div>

          {/* Templates */}
          {templates.length>0&&(
            <Glass style={{marginBottom:16}}>
              <SH right={<Btn secondary size="sm" onClick={repeatLast}>Repeat Last</Btn>}>Templates</SH>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {templates.map(t=>(
                  <div key={t.id} onClick={()=>useTemplate(t)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",borderRadius:10,border:`1px solid ${T.dim}`,cursor:"pointer",transition:"background 0.15s",background:"rgba(255,255,255,0.02)"}}>
                    <span style={{fontSize:13,color:T.text,fontWeight:500}}>{t.source}</span>
                    <span style={{fontSize:12,color:T.muted,fontFamily:mono}}>{F(t.amount)}</span>
                    <span onClick={(e)=>{e.stopPropagation();setTemplates(p=>p.filter(x=>x.id!==t.id))}} style={{fontSize:14,color:T.dim,cursor:"pointer",marginLeft:4}}>×</span>
                  </div>
                ))}
              </div>
            </Glass>
          )}

          <Glass style={{marginBottom:16}}>
            <SH right={<div style={{display:"flex",gap:8}}><Btn secondary size="sm" onClick={saveTemplate}>Save as Template</Btn><Btn secondary size="sm" onClick={()=>setImportModal("income")}>Import CSV</Btn></div>}>Quick Entry</SH>
            <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
              <Inp label="Date" type="date" value={iF.date} onChange={e=>sIF(p=>({...p,date:e.target.value}))} style={{maxWidth:150}}/>
              <Inp label="Source" placeholder="Deal, client..." value={iF.source} onChange={e=>sIF(p=>({...p,source:e.target.value}))}/>
              <Inp label="Amount" type="number" placeholder="0" value={iF.amount} onChange={e=>sIF(p=>({...p,amount:e.target.value}))} style={{maxWidth:150}}/>
              <Inp label="Notes" placeholder="Optional" value={iF.notes} onChange={e=>sIF(p=>({...p,notes:e.target.value}))}/>
              <Btn onClick={addI}>Log Income</Btn>
            </div>
            {iF.amount>0&&(
              <div style={{marginTop:16,padding:"14px 18px",borderLeft:`2px solid ${T.sub}`,background:"rgba(255,255,255,0.02)"}}>
                <div style={{fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:2,fontWeight:600,marginBottom:8}}>Auto-Split Preview</div>
                <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
                  {ALLOC.map(a=><span key={a.key} style={{fontSize:12,color:T.sub,fontWeight:500}}>{a.label}: <span style={{color:T.text,fontFamily:mono}}>{F(parseFloat(iF.amount)*a.pct)}</span></span>)}
                </div>
              </div>
            )}
          </Glass>

          <Glass pad={false}>
            <div style={{padding:"22px 28px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <SH>History</SH>
              <Btn secondary size="sm" onClick={()=>xcsv("income.csv",["date","source","amount","notes"],income)}>Export</Btn>
            </div>
            <div style={{padding:"0 28px 16px"}}>
              {income.map(i=><Row key={i.id} label={i.source} sub={rel(i.date)} amount={`+${F(i.amount)}`} amtColor={T.pos} right={i.notes}/>)}
            </div>
          </Glass>
        </>)}

        {/* ══════════ WAR CHEST ══════════ */}
        {tab==="warchest"&&(<>
          <div style={{marginBottom:36}}>
            <div style={{fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:3,fontWeight:600,marginBottom:12}}>War Chest</div>
            <div style={{fontSize:32,fontWeight:300,letterSpacing:-1,color:T.heading}}>Liquidity is leverage</div>
          </div>

          <GlassStrong style={{marginBottom:16,display:"flex",alignItems:"center",gap:40}}>
            <Ring value={liq} max={goals.liquidity||75000} size={170} stroke={6}>
              <div style={{fontSize:34,fontWeight:300,color:T.heading}}>{P(liq/(goals.liquidity||75000))}</div>
              <div style={{fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:2}}>Funded</div>
            </Ring>
            <div style={{flex:1,display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
              <Metric label="Liquidity" value={F(liq)} small/>
              <Metric label="Target" value={F(goals.liquidity||75000)} small/>
              <Metric label="Deployed" value={F(deployed)} small/>
              <Metric label="To Goal" value={F(Math.max(0,(goals.liquidity||75000)-liq))} small/>
            </div>
          </GlassStrong>

          {/* Deal P&L Summary */}
          {dealPL.count>0&&(
            <Glass style={{marginBottom:16}}>
              <SH>Closed Deal P&L</SH>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
                <div><div style={{fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,marginBottom:6}}>Deals Closed</div><div style={{fontSize:22,fontWeight:600,color:T.heading}}>{dealPL.count}</div></div>
                <div><div style={{fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,marginBottom:6}}>Capital Out</div><div style={{fontSize:22,fontWeight:600,color:T.heading,fontFamily:mono}}>{F(dealPL.deployed)}</div></div>
                <div><div style={{fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,marginBottom:6}}>Capital Back</div><div style={{fontSize:22,fontWeight:600,color:T.heading,fontFamily:mono}}>{F(dealPL.returned)}</div></div>
                <div><div style={{fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,marginBottom:6}}>Net Profit</div><div style={{fontSize:22,fontWeight:600,color:dealPL.profit>=0?T.pos:T.neg,fontFamily:mono}}>{dealPL.profit>=0?"+":""}{F(dealPL.profit)}</div></div>
              </div>
            </Glass>
          )}

          <Glass pad={false}>
            <div style={{padding:"22px 28px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <SH>Deal Deployments</SH>
              <Btn size="sm" onClick={()=>sDM(true)}>Deploy Capital</Btn>
            </div>
            <div style={{padding:"0 28px 16px"}}>
              {deals.map(d=>{
                const pl = d.actualRet ? d.actualRet - d.amount : null;
                return <Row key={d.id} label={d.notes} sub={`${rel(d.date)}${d.actualRet?` · P&L: ${pl>=0?"+":""}${F(pl)}`:""}`} amount={F(d.amount)}
                  right={<div style={{display:"flex",alignItems:"center",gap:8}}>
                    <Tag positive={d.status==="returned"} negative={d.status==="active"}>{d.status}</Tag>
                    {d.status==="active"&&<span onClick={()=>{sRetM(d.id);sRetAmt(String(d.ret||""))}} style={{fontSize:10,color:T.sub,cursor:"pointer",textDecoration:"underline"}}>close deal</span>}
                  </div>}
                />;
              })}
            </div>
          </Glass>

          <Modal open={dM} onClose={()=>sDM(false)} title="Deploy Capital">
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <Inp label="Date" type="date" value={dF.date} onChange={e=>sDF(p=>({...p,date:e.target.value}))}/>
              <Inp label="Amount Deployed" type="number" placeholder="0" value={dF.amount} onChange={e=>sDF(p=>({...p,amount:e.target.value}))}/>
              <Inp label="Expected Return" type="number" placeholder="0" value={dF.ret} onChange={e=>sDF(p=>({...p,ret:e.target.value}))}/>
              <Inp label="Notes" placeholder="Deal description" value={dF.notes} onChange={e=>sDF(p=>({...p,notes:e.target.value}))}/>
              <Btn onClick={addD}>Deploy</Btn>
            </div>
          </Modal>
          <Modal open={retM!==null} onClose={()=>sRetM(null)} title="Close Deal — Record Return">
            <div style={{fontSize:12,color:T.sub,marginBottom:16}}>Enter the actual amount returned from this deal.</div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <Inp label="Actual Return" type="number" placeholder="0" value={retAmt} onChange={e=>sRetAmt(e.target.value)}/>
              {retAmt&&retM&&(()=>{const d=deals.find(x=>x.id===retM);const pl=parseFloat(retAmt)-d.amount;return <div style={{padding:"10px 14px",borderLeft:`2px solid ${pl>=0?T.pos:T.neg}`,background:"rgba(255,255,255,0.02)"}}>
                <span style={{fontSize:12,color:pl>=0?T.pos:T.neg,fontWeight:600}}>P&L: {pl>=0?"+":""}{F(pl)} on {F(d.amount)} deployed</span>
              </div>})()}
              <Btn onClick={closeDeal}>Close Deal</Btn>
            </div>
          </Modal>
        </>)}

        {/* ══════════ DEBT ══════════ */}
        {tab==="debt"&&(<>
          <div style={{marginBottom:36}}>
            <div style={{fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:3,fontWeight:600,marginBottom:12}}>Debt Paydown</div>
            <div style={{fontSize:32,fontWeight:300,letterSpacing:-1,color:T.heading}}>Eliminate liability</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
            <Glass style={{padding:22}}><Metric label="Total Debt" value={F(debts.reduce((s,d)=>s+d.init,0))} small/></Glass>
            <Glass style={{padding:22}}><Metric label="Paid Off" value={F(debtPaid)} sub={P(debtPaid/Math.max(1,debts.reduce((s,d)=>s+d.init,0)))} positive small/></Glass>
            <Glass style={{padding:22}}><Metric label="Remaining" value={F(debtRem)} negative small/></Glass>
          </div>
          {debts.map(d=>{
            const pd=d.payments.reduce((s,p)=>s+p.amount,0);const rm=d.init-pd;
            const avg=d.payments.length?pd/d.payments.length:0;const left=avg>0?Math.ceil(rm/avg):null;
            return(
              <Glass key={d.id} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                  <div>
                    <div style={{fontSize:17,fontWeight:500,color:T.heading}}>{d.name}</div>
                    <div style={{fontSize:11,color:T.muted,marginTop:4}}>Original: {F(d.init)} {left&&`· ~${left} payments left`}</div>
                  </div>
                  <Btn secondary size="sm" onClick={()=>{sDPM(d.id);sDPA("")}}>+ Payment</Btn>
                </div>
                <PBar value={pd} max={d.init} h={4}/>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:10}}>
                  <span style={{fontSize:12,color:T.pos,fontWeight:500}}>{F(pd)} paid · {P(pd/d.init)}</span>
                  <span style={{fontSize:12,color:T.neg,fontWeight:500}}>{F(rm)} remaining</span>
                </div>
                {d.payments.length>0&&(
                  <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${T.border}`}}>
                    {[...d.payments].reverse().slice(0,4).map(p=><Row key={p.id} label="Payment" sub={rel(p.date)} amount={`-${F(p.amount)}`} amtColor={T.pos}/>)}
                  </div>
                )}
              </Glass>
            );
          })}
          <Btn secondary onClick={()=>sADM(true)} style={{marginTop:8}}>+ Add Debt Account</Btn>
          <Modal open={dpM!==null} onClose={()=>sDPM(null)} title="Record Payment"><div style={{display:"flex",flexDirection:"column",gap:14}}><Inp label="Amount" type="number" placeholder="0" value={dpA} onChange={e=>sDPA(e.target.value)}/><Btn onClick={addDP}>Record</Btn></div></Modal>
          <Modal open={adM} onClose={()=>sADM(false)} title="Add Debt"><div style={{display:"flex",flexDirection:"column",gap:14}}><Inp label="Name" placeholder="Card or loan" value={nD.name} onChange={e=>sND(p=>({...p,name:e.target.value}))}/><Inp label="Balance" type="number" placeholder="0" value={nD.init} onChange={e=>sND(p=>({...p,init:e.target.value}))}/><Btn onClick={addND}>Add</Btn></div></Modal>
        </>)}

        {/* ══════════ REINVEST ══════════ */}
        {tab==="reinvest"&&(<>
          <div style={{marginBottom:36}}>
            <div style={{fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:3,fontWeight:600,marginBottom:12}}>Reinvestment</div>
            <div style={{fontSize:32,fontWeight:300,letterSpacing:-1,color:T.heading}}>Fuel the machine</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
            <Glass style={{padding:22}}><Metric label="Reinvested" value={F(totReinv)} small/></Glass>
            <Glass style={{padding:22}}><Metric label="Budget (20%)" value={F(buckets.reinvestment)} small/></Glass>
            <Glass style={{padding:22}}><Metric label="Remaining" value={F(buckets.reinvestment-totReinv)} positive={buckets.reinvestment-totReinv>=0} negative={buckets.reinvestment-totReinv<0} small/></Glass>
          </div>
          <Glass style={{marginBottom:16}}>
            <SH right={<Btn secondary size="sm" onClick={()=>setImportModal("reinvestments")}>Import CSV</Btn>}>Log Expense</SH>
            <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
              <Inp label="Date" type="date" value={rF.date} onChange={e=>sRF(p=>({...p,date:e.target.value}))} style={{maxWidth:150}}/>
              <Inp label="Amount" type="number" placeholder="0" value={rF.amount} onChange={e=>sRF(p=>({...p,amount:e.target.value}))} style={{maxWidth:130}}/>
              <Sel label="Category" options={REINV_CATS} value={rF.cat} onChange={e=>sRF(p=>({...p,cat:e.target.value}))}/>
              <Inp label="Notes" placeholder="Description" value={rF.notes} onChange={e=>sRF(p=>({...p,notes:e.target.value}))}/>
              <Inp label="ROI" type="number" placeholder="—" value={rF.roi} onChange={e=>sRF(p=>({...p,roi:e.target.value}))} style={{maxWidth:80}}/>
              <Btn onClick={addR}>Log</Btn>
            </div>
          </Glass>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            <Glass>
              <SH>By Category</SH>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={REINV_CATS.map(c=>({cat:c.split("/")[0],v:reinvestments.filter(r=>r.cat===c).reduce((s,r)=>s+r.amount,0)})).filter(d=>d.v>0)} barSize={20}>
                  <XAxis dataKey="cat" tick={{fill:T.muted,fontSize:9}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:T.muted,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`}/>
                  <Tooltip contentStyle={tts} formatter={v=>F(v)}/>
                  <Bar dataKey="v" fill="rgba(255,255,255,0.25)" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </Glass>
            <Glass>
              <SH>ROI Tracking</SH>
              {reinvestments.filter(r=>r.roi).map(r=>(
                <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${T.border}`}}>
                  <div><div style={{fontSize:13,fontWeight:500}}>{r.notes}</div><div style={{fontSize:10,color:T.muted,marginTop:2}}>{r.cat} · {rel(r.date)}</div></div>
                  <Tag positive>{r.roi}x</Tag>
                </div>
              ))}
              {!reinvestments.filter(r=>r.roi).length&&<div style={{padding:32,textAlign:"center",color:T.muted,fontSize:12}}>No ROI data</div>}
            </Glass>
          </div>
          <Glass pad={false}>
            <div style={{padding:"22px 28px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}><SH>All Reinvestments</SH><Btn secondary size="sm" onClick={()=>xcsv("reinvestments.csv",["date","amount","cat","notes","roi"],reinvestments)}>Export</Btn></div>
            <div style={{padding:"0 28px 16px"}}>{reinvestments.map(r=><Row key={r.id} label={r.notes} sub={`${r.cat} · ${rel(r.date)}`} amount={F(r.amount)} right={r.roi?`${r.roi}x`:""}/>)}</div>
          </Glass>
        </>)}

        {/* ══════════ INVEST ══════════ */}
        {tab==="invest"&&(<>
          <div style={{marginBottom:36}}>
            <div style={{fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:3,fontWeight:600,marginBottom:12}}>Investing</div>
            <div style={{fontSize:32,fontWeight:300,letterSpacing:-1,color:T.heading}}>Compound everything</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
            <Glass style={{padding:22}}><Metric label="Contributed" value={F(totInvAmt)} small/></Glass>
            <Glass style={{padding:22}}><Metric label="Value" value={F(totInvVal)} positive small/></Glass>
            <Glass style={{padding:22}}><Metric label="Return" value={`${totInvVal>=totInvAmt?"+":""}${F(totInvVal-totInvAmt)}`} positive={totInvVal>=totInvAmt} negative={totInvVal<totInvAmt} sub={P((totInvVal-totInvAmt)/Math.max(1,totInvAmt))} small/></Glass>
            <Glass style={{padding:22}}><Metric label="Goal" value={F(goals.investing||5000)} sub={goals.investing?`${P(totInvAmt/goals.investing)} funded`:""} small/></Glass>
          </div>
          <Glass style={{marginBottom:16}}>
            <SH>Add Position</SH>
            <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
              <Inp label="Date" type="date" value={vF.date} onChange={e=>sVF(p=>({...p,date:e.target.value}))} style={{maxWidth:150}}/>
              <Inp label="Ticker" placeholder="VOO" value={vF.ticker} onChange={e=>sVF(p=>({...p,ticker:e.target.value}))} style={{maxWidth:100}}/>
              <Inp label="Amount" type="number" placeholder="0" value={vF.amount} onChange={e=>sVF(p=>({...p,amount:e.target.value}))} style={{maxWidth:140}}/>
              <Inp label="Current Value" type="number" placeholder="Same" value={vF.val} onChange={e=>sVF(p=>({...p,val:e.target.value}))} style={{maxWidth:140}}/>
              <Btn onClick={addV}>Add</Btn>
            </div>
          </Glass>
          <Glass pad={false}>
            <div style={{padding:"22px 28px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}><SH>Portfolio</SH><Btn secondary size="sm" onClick={()=>xcsv("investments.csv",["date","ticker","amount","val"],investments)}>Export</Btn></div>
            <div style={{padding:"0 28px 16px"}}>
              {investments.map(inv=>{const gl=inv.val-inv.amount;return(
                <Row key={inv.id} label={inv.ticker} sub={rel(inv.date)} amount={F(inv.val)} amtColor={gl>=0?T.pos:T.neg} right={<span style={{color:gl>=0?T.pos:T.neg}}>{gl>=0?"+":""}{F(gl)}</span>}/>
              )})}
            </div>
          </Glass>
        </>)}

        {/* ══════════ SPENDING ══════════ */}
        {tab==="spending"&&(<>
          <div style={{marginBottom:36}}>
            <div style={{fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:3,fontWeight:600,marginBottom:12}}>Lifestyle</div>
            <div style={{fontSize:32,fontWeight:300,letterSpacing:-1,color:T.heading}}>Stay disciplined</div>
          </div>
          {over&&<Alert msg={`Over budget by ${F(totSpend-lifeBudget)}. Lock in.`} negative/>}
          <GlassStrong style={{marginBottom:16,display:"flex",alignItems:"center",gap:40}}>
            <Ring value={Math.min(totSpend,lifeBudget)} max={lifeBudget} size={150} stroke={6}>
              <div style={{fontSize:28,fontWeight:300,color:over?T.neg:T.heading}}>{P(totSpend/Math.max(1,lifeBudget))}</div>
              <div style={{fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:2}}>Used</div>
            </Ring>
            <div style={{flex:1,display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
              <Metric label="Spent" value={F(totSpend)} negative={over} small/>
              <Metric label="Budget (2%)" value={F(lifeBudget)} small/>
              <Metric label="Remaining" value={F(Math.max(0,lifeBudget-totSpend))} positive={!over} negative={over} small/>
              <div><div style={{fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:2,fontWeight:600,marginBottom:8}}>Status</div><Tag positive={!over} negative={over}>{over?"Over":"On Track"}</Tag></div>
            </div>
          </GlassStrong>
          <Glass style={{marginBottom:16}}>
            <SH right={<Btn secondary size="sm" onClick={()=>setImportModal("spending")}>Import CSV</Btn>}>Log Expense</SH>
            <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
              <Inp label="Date" type="date" value={sForm.date} onChange={e=>sSForm(p=>({...p,date:e.target.value}))} style={{maxWidth:150}}/>
              <Inp label="Amount" type="number" placeholder="0" value={sForm.amount} onChange={e=>sSForm(p=>({...p,amount:e.target.value}))} style={{maxWidth:130}}/>
              <Sel label="Category" options={SPEND_CATS} value={sForm.cat} onChange={e=>sSForm(p=>({...p,cat:e.target.value}))}/>
              <Inp label="Notes" placeholder="Description" value={sForm.notes} onChange={e=>sSForm(p=>({...p,notes:e.target.value}))}/>
              <Btn onClick={addS}>Log</Btn>
            </div>
          </Glass>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            <Glass>
              <SH>By Category</SH>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={SPEND_CATS.map(c=>({name:c,value:spending.filter(s=>s.cat===c).reduce((sm,s)=>sm+s.amount,0)})).filter(d=>d.value>0)} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={2} stroke="none">
                    {SPEND_CATS.map((_,i)=><Cell key={i} fill={["#B0B0B0","#888888","#9A9A9A","#787878","#A0A0A0","#4A4A4A"][i]}/>)}
                  </Pie>
                  <Tooltip contentStyle={tts} formatter={v=>F(v)}/>
                </PieChart>
              </ResponsiveContainer>
            </Glass>
            <Glass>
              <SH>Breakdown</SH>
              {SPEND_CATS.map(c=>{const tot=spending.filter(s=>s.cat===c).reduce((sm,s)=>sm+s.amount,0);if(!tot)return null;return(
                <div key={c} style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:12,color:T.sub}}>{c}</span>
                    <span style={{fontSize:12,fontWeight:500,fontVariantNumeric:"tabular-nums"}}>{F(tot)}</span>
                  </div>
                  <PBar value={tot} max={totSpend}/>
                </div>
              )})}
            </Glass>
          </div>
          <Glass pad={false}>
            <div style={{padding:"22px 28px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}><SH>Expense Log</SH><Btn secondary size="sm" onClick={()=>xcsv("spending.csv",["date","amount","cat","notes"],spending)}>Export</Btn></div>
            <div style={{padding:"0 28px 16px"}}>{spending.map(s=><Row key={s.id} label={s.notes||s.cat} sub={rel(s.date)} amount={F(s.amount)} right={s.cat}/>)}</div>
          </Glass>
        </>)}

        {/* ══════════ REVIEW ══════════ */}
        {tab==="review"&&(<>
          <div style={{marginBottom:36}}>
            <div style={{fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:3,fontWeight:600,marginBottom:12}}>Weekly Review</div>
            <div style={{fontSize:32,fontWeight:300,letterSpacing:-1,color:T.heading}}>Accountability check</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
            <Glass style={{padding:22}}><Metric label="Week Income" value={F(wkInc)} small/></Glass>
            <Glass style={{padding:22}}><Metric label="Week Spending" value={F(wkSpend)} small/></Glass>
            <Glass style={{padding:22}}><Metric label="Week Reinvested" value={F(wkReinv)} small/></Glass>
            <Glass style={{padding:22}}><Metric label="Week Debt Paid" value={F(wkDebt)} small/></Glass>
          </div>
          <Glass style={{marginBottom:16}}>
            <SH>Where Every Dollar Went</SH>
            {wkInc>0?(
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ALLOC.map(a=>({name:a.label,allocated:Math.round(wkInc*a.pct)}))} barSize={24}>
                  <XAxis dataKey="name" tick={{fill:T.muted,fontSize:9}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:T.muted,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>`$${(v/1000).toFixed(1)}k`}/>
                  <Tooltip contentStyle={tts} formatter={v=>F(v)}/>
                  <Bar dataKey="allocated" fill="rgba(255,255,255,0.20)" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            ):<div style={{padding:40,textAlign:"center",color:T.muted,fontSize:12}}>No income this week</div>}
          </Glass>
          <Glass style={{marginBottom:16}}>
            <SH>Compliance</SH>
            {wkInc>0?ALLOC.map(a=>{
              const target=wkInc*a.pct;let actual=0;
              if(a.key==="lifestyle")actual=wkSpend;else if(a.key==="reinvestment")actual=wkReinv;else if(a.key==="debt")actual=wkDebt;else if(a.key==="investing")actual=investments.filter(i=>i.date>=wa).reduce((s,i)=>s+i.amount,0);else actual=target;
              const ok=a.key==="lifestyle"?actual<=target:(target>0?actual/target>=0.8:true);
              return(<div key={a.key} style={{marginBottom:18}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span style={{fontSize:13,fontWeight:500}}>{a.label}</span>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:12,fontWeight:500,fontFamily:mono}}>{F(actual)} <span style={{color:T.muted}}>/ {F(target)}</span></span>
                    <Tag positive={ok} negative={!ok}>{ok?"On Track":"Off"}</Tag>
                  </div>
                </div>
                <PBar value={Math.min(actual,target)} max={target}/>
              </div>);
            }):<div style={{padding:40,textAlign:"center",color:T.muted,fontSize:12}}>No income to evaluate</div>}
          </Glass>
          <Glass>
            <SH>Targets</SH>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:24}}>
              {[
                {label:"War Chest",current:liq,goal:goals.liquidity||75000},
                {label:"Debt Free",current:debtPaid,goal:debts.reduce((s,d)=>s+d.init,0)},
                {label:"Investing",current:totInvAmt,goal:goals.investing||5000},
              ].map(t=>(
                <div key={t.label} style={{display:"flex",alignItems:"center",gap:16}}>
                  <Ring value={t.current} max={t.goal} size={64} stroke={4}>
                    <span style={{fontSize:12,fontWeight:600}}>{P(t.current/Math.max(1,t.goal))}</span>
                  </Ring>
                  <div>
                    <div style={{fontSize:13,fontWeight:500,color:T.heading}}>{t.label}</div>
                    <div style={{fontSize:11,color:T.muted}}>{F(t.current)} / {F(t.goal)}</div>
                  </div>
                </div>
              ))}
            </div>
          </Glass>
        </>)}

        {/* ══════════ SETTINGS ══════════ */}
        {tab==="settings"&&(<>
          <div style={{marginBottom:36}}>
            <div style={{fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:3,fontWeight:600,marginBottom:12}}>Settings</div>
            <div style={{fontSize:32,fontWeight:300,letterSpacing:-1,color:T.heading}}>Configure your system</div>
          </div>

          <Glass style={{marginBottom:16}}>
            <SH>Bucket Goals</SH>
            <div style={{fontSize:12,color:T.sub,marginBottom:16}}>Set target amounts for each allocation bucket. Leave at 0 to disable.</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {ALLOC.map(a=>(
                <div key={a.key} style={{display:"flex",alignItems:"center",gap:12}}>
                  <span style={{fontSize:13,color:T.text,fontWeight:500,minWidth:110}}>{a.label}</span>
                  <Inp type="number" placeholder="0" value={goals[a.key]||""} onChange={e=>setGoals(p=>({...p,[a.key]:parseFloat(e.target.value)||0}))}/>
                </div>
              ))}
            </div>
          </Glass>

          <Glass style={{marginBottom:16}}>
            <SH>Income Templates</SH>
            <div style={{fontSize:12,color:T.sub,marginBottom:16}}>Saved templates for quick income logging. Manage them here or save from the Income tab.</div>
            {templates.map(t=>(
              <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
                <div>
                  <span style={{fontSize:13,fontWeight:500,color:T.text}}>{t.source}</span>
                  <span style={{fontSize:12,color:T.muted,marginLeft:8,fontFamily:mono}}>{F(t.amount)}</span>
                  {t.notes&&<span style={{fontSize:11,color:T.muted,marginLeft:8}}>{t.notes}</span>}
                </div>
                <span onClick={()=>setTemplates(p=>p.filter(x=>x.id!==t.id))} style={{fontSize:14,color:T.dim,cursor:"pointer"}}>×</span>
              </div>
            ))}
            {templates.length===0&&<div style={{color:T.muted,fontSize:12}}>No templates saved</div>}
          </Glass>

          <Glass style={{marginBottom:16}}>
            <SH>Monthly Snapshots</SH>
            <div style={{fontSize:12,color:T.sub,marginBottom:16}}>Auto-captured on the 1st of each month. Powers your Wealth Curve.</div>
            {snapshots.sort((a,b)=>b.month.localeCompare(a.month)).map(s=>(
              <div key={s.month} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
                <span style={{fontSize:13,color:T.text,fontWeight:500}}>{s.month}</span>
                <div style={{display:"flex",gap:16,fontSize:12,color:T.sub}}>
                  <span>Income: {F(s.totalIncome)}</span>
                  <span>Liq: {F(s.liquidity)}</span>
                  <span>Debt Paid: {F(s.debtPaid)}</span>
                </div>
              </div>
            ))}
          </Glass>

          <Glass style={{marginBottom:16}}>
            <SH>Keyboard Shortcuts</SH>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[
                ["⌘K / Ctrl+K","Command palette"],
                ["1–9","Jump to tab"],
                ["N","New income entry"],
                ["D","Deploy capital"],
                ["Esc","Close any modal"],
              ].map(([k,d])=>(
                <div key={k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",borderRadius:8,background:"rgba(255,255,255,0.02)"}}>
                  <span style={{fontSize:12,color:T.sub}}>{d}</span>
                  <KBD>{k}</KBD>
                </div>
              ))}
            </div>
          </Glass>

          <Glass>
            <SH>Data</SH>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              <Btn secondary size="sm" onClick={()=>xcsv("all-income.csv",["date","source","amount","notes"],income)}>Export All Income</Btn>
              <Btn secondary size="sm" onClick={()=>xcsv("all-spending.csv",["date","amount","cat","notes"],spending)}>Export All Spending</Btn>
              <Btn secondary size="sm" onClick={()=>xcsv("all-reinvestments.csv",["date","amount","cat","notes","roi"],reinvestments)}>Export Reinvestments</Btn>
              <Btn secondary size="sm" onClick={()=>xcsv("all-investments.csv",["date","ticker","amount","val"],investments)}>Export Portfolio</Btn>
              <Btn secondary size="sm" onClick={()=>{const blob=new Blob([JSON.stringify({income,debts,deals,reinvestments,investments,spending,goals,templates,snapshots},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="capital-os-backup.json";a.click()}}>Full Backup (JSON)</Btn>
            </div>
            <div style={{marginTop:16,paddingTop:16,borderTop:`1px solid ${T.border}`}}>
              <Btn secondary size="sm" style={{color:T.neg,borderColor:`${T.neg}40`}} onClick={()=>{if(confirm("Reset all data to defaults? This cannot be undone."))resetAll()}}>Reset All Data</Btn>
            </div>
          </Glass>
        </>)}

      </main>
    </div>
  );
}