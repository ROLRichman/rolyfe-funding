/* RO'Lyfe shared cross-engine tools: date/time, shared instrument, language, translation and voice. */
(() => {
  "use strict";
  if (window.__ROLYFE_GLOBAL_TOOLS__) return;
  window.__ROLYFE_GLOBAL_TOOLS__ = true;

  const NO_CLOCK = document.currentScript && document.currentScript.dataset.noClock === "true";
  const LANG_KEY = "rolyfe-ui-language";
  const SYMBOL_KEY = "rolyfe-active-symbol";
  const VOICE_KEY = "rolyfe-voice-replies";
  const ZOOM_KEY = "rolyfe-ui-zoom";
  const VOICE_DEFAULT_VERSION_KEY = "rolyfe-voice-default-version";
  const SUPABASE_URL = "https://ykmdyfbklvuoseqdjnxy.supabase.co";
  const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrbWR5ZmJrbHZ1b3NlcWRqbnh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3ODk5OTQsImV4cCI6MjEwODM2NTk5NH0._YEZj2GSnPcLGXmwgj98V_JzXdJIhTmOFoAH9BSia2I";
  const LANGUAGES = [
    {name:"English",label:"English",code:"en",locale:"en-US"},
    {name:"Spanish",label:"Español",code:"es",locale:"es-ES"},
    {name:"French",label:"Français",code:"fr",locale:"fr-FR"},
    {name:"Haitian Creole",label:"Kreyòl Ayisyen",code:"ht",locale:"ht-HT"},
    {name:"Portuguese",label:"Português",code:"pt",locale:"pt-BR"},
    {name:"German",label:"Deutsch",code:"de",locale:"de-DE"},
    {name:"Italian",label:"Italiano",code:"it",locale:"it-IT"},
    {name:"Arabic",label:"العربية",code:"ar",locale:"ar-SA"},
    {name:"Chinese (Simplified)",label:"简体中文",code:"zh-CN",locale:"zh-CN"},
    {name:"Japanese",label:"日本語",code:"ja",locale:"ja-JP"},
    {name:"Korean",label:"한국어",code:"ko",locale:"ko-KR"},
    {name:"Hindi",label:"हिन्दी",code:"hi",locale:"hi-IN"}
  ];
  const MARKET_SYMBOLS = ["AAPL","NVDA","TSLA","AMD","SPY","MSFT","AMZN","GOOGL","GOOG","META","NFLX","AVGO","ORCL","CRM","ADBE","QCOM","INTC","MU","ARM","SMCI","PLTR","COIN","HOOD","MSTR","JPM","BAC","WFC","GS","MS","V","MA","AXP","COST","WMT","TGT","HD","LOW","NKE","DIS","UBER","ABNB","SHOP","SNOW","PANW","CRWD","NET","DDOG","IBM","CSCO","NOW","PYPL","SQ","SOFI","XOM","CVX","LLY","JNJ","PFE","MRNA","UNH","ABBV","TMO","CAT","DE","BA","GE","F","GM","RIVN","LCID","IWM","QQQ","DIA","VTI","GLD","TLT","BTC-USD","ETH-USD","SOL-USD","XRP-USD","LINK-USD","HYPE-USD","BNB-USD","ADA-USD","DOGE-USD","AVAX-USD","DOT-USD","LTC-USD","BCH-USD","SUI-USD","TON-USD","TRX-USD","XLM-USD","HBAR-USD","SHIB-USD","PEPE-USD","UNI-USD","AAVE-USD","NEAR-USD","APT-USD","ARB-USD","OP-USD","ICP-USD","FIL-USD","ATOM-USD","ETC-USD","XMR-USD","INJ-USD","RENDER-USD","FET-USD","TAO-USD","SEI-USD","TIA-USD","IMX-USD","GRT-USD","MKR-USD","PENDLE-USD","ONDO-USD","JUP-USD","WIF-USD","BONK-USD","FLOKI-USD","ALGO-USD","VET-USD","RUNE-USD","CRV-USD"];
  const LANG_BY_NAME = new Map(LANGUAGES.map(item => [item.name,item]));
  const safeGet = (key,fallback="") => { try { return localStorage.getItem(key) || fallback; } catch (_) { return fallback; } };
  const safeSet = (key,value) => { try { localStorage.setItem(key,String(value)); } catch (_) {} };
  const normalizeSymbol = value => String(value||"").trim().toUpperCase().replace(/\\s+/g,"");
  let selectedLanguage = LANG_BY_NAME.get(safeGet(LANG_KEY,"English")) || LANGUAGES[0];
  if(safeGet(VOICE_DEFAULT_VERSION_KEY,"")!=="20261115"){safeSet(VOICE_KEY,"true");safeSet(VOICE_DEFAULT_VERSION_KEY,"20261115");}
  let voiceEnabled = safeGet(VOICE_KEY,"true")==="true";
  let pageZoom = Math.min(1.5,Math.max(0.85,Number(safeGet(ZOOM_KEY,"1"))||1));
  let isApplying = false;
  let pageTranslationInProgress = false;
  let dynamicTimer = null;
  const originalText = new Map();
  const originalAttributes = new Map();
  const translationCache = new Map();
  const dynamicRoots = new Set();
  let translationObserver = null;

  function currentLanguage(){ return selectedLanguage; }
  function updateDocumentLanguage(){
    document.documentElement.lang = selectedLanguage.locale;
    document.documentElement.dir = selectedLanguage.code === "ar" ? "rtl" : "ltr";
    window.ROLyfeLanguage = selectedLanguage;
  }
  function setActiveSymbol(value, fromApp=false){
    const symbol = normalizeSymbol(value);
    if(!/^[A-Z0-9.^/_!:=!-]{1,24}$/.test(symbol)) return false;
    safeSet(SYMBOL_KEY,symbol);
    const input=document.getElementById("rol-global-symbol");
    const chip=document.getElementById("rol-global-symbol-current");
    if(input) input.value=symbol;
    if(chip) chip.textContent=symbol;
    const compactChip=document.getElementById("rol-global-compact-symbol");
    if(compactChip) compactChip.textContent=symbol;
    if(!fromApp){
      window.dispatchEvent(new CustomEvent("rol-global-symbol-change",{detail:{symbol}}));
      try{ window.parent && window.parent!==window && window.parent.postMessage({type:"rol-global-symbol-change",symbol},location.origin); }catch(_){}
    }
    return true;
  }
  function getInitialSymbol(){
    const saved=normalizeSymbol(safeGet(SYMBOL_KEY,""));
    if(saved) return saved;
    const selectors=["#classroomSymbol","#symbol-select","#symbol","#chartSymbol","#independent-chart-symbol"];
    for(const selector of selectors){
      const el=document.querySelector(selector);
      if(el?.value) return normalizeSymbol(el.value.split(":").pop());
    }
    return "NVDA";
  }

  function injectStyles(){
    if(document.getElementById("rol-global-tools-style"))return;
    const style=document.createElement("style");
    style.id="rol-global-tools-style";
    style.textContent=`
      #rol-global-tools{position:sticky;top:0;z-index:45;display:grid;grid-template-columns:minmax(155px,.85fr) minmax(220px,1.05fr) minmax(245px,1.4fr);gap:10px;align-items:center;width:100%;box-sizing:border-box;padding:10px 16px;margin:0;background:linear-gradient(100deg,#0a1a14,#10251c);border-bottom:1px solid #294838;color:#e7f1eb;font:12px/1.4 Arial,sans-serif}
      #rol-global-tools *{box-sizing:border-box}
      #rol-global-tools .rol-global-group{display:flex;align-items:center;gap:8px;min-width:0}
      #rol-global-tools .rol-global-time{display:grid;gap:2px}
      #rol-global-tools small{font-size:9px;letter-spacing:.08em;color:#91ad9d}
      #rol-global-tools strong{font:700 13px ui-monospace,monospace;color:#8ce5b4}
      #rol-global-tools input,#rol-global-tools select{min-width:0;max-width:100%;height:36px;padding:7px 9px;border:1px solid #345743;border-radius:8px;background:#07130e;color:#e7f1eb;font:12px Arial,sans-serif}
      #rol-global-tools input{width:min(125px,45vw);text-transform:uppercase}
      #rol-global-tools button{min-height:36px;border:1px solid #3c7953;border-radius:8px;padding:7px 10px;background:#163a27;color:#9be8ba;font-weight:700;font-size:10px;cursor:pointer}
      #rol-global-tools .rol-global-current{font:700 12px ui-monospace,monospace;color:#8ce5b4;white-space:nowrap}
      #rol-global-tools .rol-global-language{display:flex;align-items:center;gap:7px;justify-content:flex-end;min-width:0;flex-wrap:wrap}
      #rol-global-tools .rol-global-zoom{display:flex;align-items:center;gap:4px;flex:0 0 auto}
      #rol-global-tools .rol-global-zoom button{min-width:34px;padding:7px 8px}
      #rol-global-tools .rol-global-zoom-value{min-width:42px;text-align:center;color:#d4f4df;font:700 11px ui-monospace,monospace}
      #rol-global-tools .rol-global-status{grid-column:1/-1;min-height:13px;font-size:9px;color:#91ad9d;overflow-wrap:anywhere}
      #rol-global-tools.rol-no-clock{grid-template-columns:minmax(210px,.9fr) minmax(245px,1fr)}
      #rol-global-tools{max-width:100vw;overflow-x:clip}
      #rol-global-tools .rol-global-group,#rol-global-tools .rol-global-language,#rol-global-tools .rol-global-zoom{min-width:0;max-width:100%;flex-wrap:wrap}
      #rol-global-tools .rol-global-group>*{min-width:0;max-width:100%}
      #rol-global-tools .rol-global-current{white-space:normal;overflow-wrap:anywhere}
      #rol-global-tools .rol-global-language button{white-space:nowrap}
      body.rol-presentation-mode .main{margin-inline:auto!important;padding:8px!important;width:min(100%,1600px)!important}
      body.rol-presentation-mode main{width:100%!important;max-width:1600px!important;margin-inline:auto!important}
      body.rol-presentation-mode .page{max-width:1600px!important;margin-inline:auto!important}
      body.rol-presentation-mode .panel{break-inside:avoid}
      /* Keep the website navigation and browser chrome visible in Present mode. */

      #rol-global-tools[dir="rtl"]{direction:rtl}
      @media(max-width:760px){#rol-global-tools{grid-template-columns:1fr 1fr;padding:9px 11px;gap:8px}#rol-global-tools .rol-global-language{grid-column:1/-1;justify-content:flex-start}#rol-global-tools .rol-global-status{grid-column:1/-1}}
      @media(max-width:390px){#rol-global-tools{grid-template-columns:1fr}#rol-global-tools .rol-global-language{justify-content:flex-start}#rol-global-tools input{width:112px}#rol-global-tools .rol-global-time strong{font-size:12px}}

      /* Scroll-aware compact toolbar: full controls at the top, slim sticky strip while reading. */
      #rol-global-tools{display:grid;grid-template-columns:1fr;gap:8px;padding:0;background:transparent;border:0;box-shadow:none}
      #rol-global-tools .rol-global-content{display:grid;grid-template-columns:minmax(155px,.85fr) minmax(220px,1.05fr) minmax(245px,1.4fr);gap:10px;align-items:center;padding:10px 16px;border:1px solid #294838;border-radius:16px;background:linear-gradient(100deg,#0a1a14,#10251c)}
      #rol-global-tools .rol-global-compact{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:42px;padding:5px 9px;border:1px solid #294838;border-radius:13px;background:linear-gradient(100deg,#0a1a14,#10251c);box-shadow:0 5px 16px #0003}
      #rol-global-tools .rol-global-compact-meta,#rol-global-tools .rol-global-compact-actions{display:flex;align-items:center;gap:9px;min-width:0}
      #rol-global-tools .rol-global-compact-meta{color:#d8eee1;font-size:11px;white-space:nowrap}
      #rol-global-tools .rol-global-compact-brand{font:800 10px Arial,sans-serif;letter-spacing:.1em;color:#9be8ba}
      #rol-global-tools .rol-global-compact-clock{font:700 11px ui-monospace,monospace;color:#d4f4df}
      #rol-global-tools .rol-global-compact-symbol{display:inline-flex;align-items:center;gap:5px;padding:4px 7px;border:1px solid #345743;border-radius:7px;background:#07130e}
      #rol-global-tools .rol-global-compact-symbol small{font-size:8px}
      #rol-global-tools .rol-global-compact-symbol b{font:800 11px ui-monospace,monospace;color:#8ce5b4}
      #rol-global-tools .rol-global-compact-actions{display:flex;align-items:center;justify-content:flex-end;gap:7px;min-width:0}
      #rol-global-tools .rol-global-compact select{max-width:132px;min-width:0;min-height:31px;padding:5px 7px;border:1px solid #345743;border-radius:8px;background:#07130e;color:#e7f1eb;font:11px Arial,sans-serif}
      #rol-global-tools .rol-global-compact button{min-height:31px;padding:5px 9px;font-size:10px}
      #rol-global-tools .rol-global-accessibility{display:flex;align-items:center;justify-content:flex-end;gap:9px;padding:0 2px}
      #rol-global-tools .rol-global-language-control{display:inline-flex;align-items:center;gap:7px;color:#a8bdad;font:700 9px Arial,sans-serif;letter-spacing:.08em}
      #rol-global-tools .rol-global-accessibility select{min-width:132px;max-width:180px;height:34px;padding:6px 9px;border:1px solid #345743;border-radius:9px;background:#07130e;color:#e7f1eb;font:12px Arial,sans-serif}
      #rol-global-tools .rol-global-accessibility button{min-height:34px;padding:7px 12px;border:1px solid #3c7953;border-radius:9px;background:#163a27;color:#9be8ba;font-weight:700;font-size:11px;cursor:pointer}
      #rol-global-tools .rol-global-translation-status{display:block;margin:0 2px;padding:0;color:#a8bdad;font:11px/1.35 Arial,sans-serif;overflow-wrap:anywhere}
      #rol-global-tools .rol-global-translation-status[hidden]{display:none!important}
      #rol-global-tools .rol-global-translation-status[data-state="error"]{color:#ffc2a8}
      #rol-global-tools .rol-global-translation-status[data-state="success"]{color:#9be8ba}
      #rol-global-tools .rol-global-translation-status[data-state="working"]{color:#d4f4df}
      #rol-global-tools.rol-scrolled{padding:0;background:transparent;border:0;box-shadow:none}
      #rol-global-tools.rol-scrolled .rol-global-content{display:none}
      #rol-global-tools.rol-scrolled.rol-expanded .rol-global-content{display:grid}
      @media(max-width:760px){
        #rol-global-tools .rol-global-content{grid-template-columns:1fr 1fr}
        #rol-global-tools .rol-global-language{grid-column:1/-1;justify-content:flex-start}
        #rol-global-tools .rol-global-accessibility{justify-content:flex-start;flex-wrap:wrap}
        #rol-global-tools .rol-global-status{grid-column:1/-1}
        #rol-global-tools .rol-global-compact-meta{gap:7px}
      }
      @media(max-width:420px){
        #rol-global-tools .rol-global-compact-brand{display:none}
        #rol-global-tools .rol-global-compact-meta{gap:6px}
        #rol-global-tools .rol-global-compact-clock{font-size:10px}
        #rol-global-tools .rol-global-compact-symbol{padding:4px 6px}
        #rol-global-tools .rol-global-compact-symbol small{display:none}
        #rol-global-tools .rol-global-compact-actions{gap:4px}
        #rol-global-tools .rol-global-compact button{padding:4px 7px;font-size:9px}
        #rol-global-tools .rol-global-accessibility{justify-content:flex-start}
        #rol-global-tools .rol-global-accessibility select{max-width:145px}
      }
      @media(max-width:390px){#rol-global-tools .rol-global-content{grid-template-columns:1fr}}
      /* Compact shared controls: no sticky green panel, no scroll-triggered flicker. */
      #rol-global-tools{position:relative!important;top:auto!important;z-index:1001;display:flex!important;align-items:center;justify-content:space-between;gap:8px;width:auto;max-width:100%;padding:0;margin:0;background:transparent;border:0;box-shadow:none}
      #rol-global-tools .rol-global-compact{flex:0 0 auto;min-height:34px;padding:2px 6px;border:0;background:transparent;box-shadow:none}
      #rol-global-tools .rol-global-accessibility{display:flex!important;align-items:center;justify-content:flex-end;gap:6px;flex:1;padding:0}
      #rol-global-tools .rol-global-language-control span{display:none}
      #rol-global-tools .rol-global-accessibility select{min-width:92px;max-width:128px;height:32px;padding:5px 7px}
      #rol-global-tools .rol-global-accessibility button{min-height:32px;padding:5px 8px;font-size:10px}
      #rol-global-tools .rol-global-content{display:none!important;position:absolute;top:calc(100% + 8px);right:0;z-index:1100;width:min(760px,calc(100vw - 24px));padding:12px;border:1px solid #294838;border-radius:14px;background:linear-gradient(100deg,#0a1a14,#10251c);box-shadow:0 16px 40px #0009}
      #rol-global-tools.rol-expanded .rol-global-content{display:grid!important}
      #rol-global-tools .rol-global-status{display:block;grid-column:1/-1;min-height:0}
      #rol-global-tools .rol-global-translation-status:not([hidden]){position:absolute;top:calc(100% + 8px);right:0;z-index:1101;width:min(520px,calc(100vw - 24px));padding:9px 11px;border:1px solid #3c7953;border-radius:10px;background:#10251c;box-shadow:0 10px 28px #0009}
      @media(max-width:760px){#rol-global-tools{width:100%;gap:4px}#rol-global-tools .rol-global-accessibility{justify-content:flex-end}#rol-global-tools .rol-global-content{grid-template-columns:1fr;width:min(100%,calc(100vw - 20px))}}
      @media(max-width:420px){#rol-global-tools .rol-global-compact-brand{display:none}#rol-global-tools .rol-global-accessibility select{max-width:105px;min-width:82px}#rol-global-tools .rol-global-accessibility button{padding:4px 6px;font-size:9px}}
    `;
    document.head.appendChild(style);
  }

  function injectToolbar(){
    if(document.getElementById("rol-global-tools"))return;
    injectStyles();
    const bar=document.createElement("section");
    bar.id="rol-global-tools";
    if(NO_CLOCK)bar.classList.add("rol-no-clock");
    bar.setAttribute("aria-label","RO'Lyfe shared market, time and language controls");
    bar.innerHTML=`
      <div class="rol-global-compact" aria-label="Compact RO’Lyfe controls">
        <div class="rol-global-compact-meta">
          <strong class="rol-global-compact-brand">RO’LYFE</strong>
          ${NO_CLOCK ? "" : '<span class="rol-global-compact-clock" id="rol-global-compact-clock">--:--</span>'}
          <span class="rol-global-compact-symbol" data-no-translate><small>SYMBOL</small><b id="rol-global-compact-symbol">NVDA</b></span>
        </div>
        <div class="rol-global-compact-actions">
          <button type="button" id="rol-global-tools-toggle" aria-controls="rol-global-tools-content" aria-expanded="false">Tools ▾</button>
        </div>
      </div>
      <div class="rol-global-accessibility" aria-label="Page accessibility controls">
        <label class="rol-global-language-control" for="rol-global-language"><span>LANGUAGE</span><select id="rol-global-language" aria-label="Select page language"></select></label>
        <button type="button" id="rol-global-present-compact" aria-label="Present / Cast">Present / Cast</button>
      </div>
      <div id="rol-global-translation-status" class="rol-global-translation-status" role="status" aria-live="polite" hidden></div>
      <div id="rol-global-tools-content" class="rol-global-content">
        ${NO_CLOCK ? "" : '<div class="rol-global-group rol-global-time" data-no-translate><small>NEW YORK MARKET TIME · ET</small><strong id="rol-global-clock">--:--:--</strong><span id="rol-global-date">Loading date…</span></div>'}
        <div class="rol-global-group" data-no-translate>
          <div style="display:grid;gap:3px;min-width:0"><small>ACTIVE INSTRUMENT</small><span class="rol-global-current" id="rol-global-symbol-current">NVDA</span></div>
          <input id="rol-global-symbol" type="text" list="rol-global-symbol-list" maxlength="24" aria-label="Choose global stock ETF crypto or market symbol" placeholder="Ticker">
          <datalist id="rol-global-symbol-list">${MARKET_SYMBOLS.map(symbol=>'<option value="'+symbol+'"></option>').join("")}</datalist>
          <button type="button" id="rol-global-symbol-apply">Set</button>
        </div>
        <div class="rol-global-group rol-global-language" data-no-translate>
          <div class="rol-global-zoom" role="group" aria-label="Page zoom controls" data-no-translate>
            <small>ZOOM</small>
            <button type="button" id="rol-global-zoom-out" aria-label="Decrease page zoom">A−</button>
            <button type="button" id="rol-global-zoom-reset" class="rol-global-zoom-value" aria-label="Reset page zoom">100%</button>
            <button type="button" id="rol-global-zoom-in" aria-label="Increase page zoom">A+</button>
          </div>
          <button type="button" id="rol-global-voice" aria-pressed="${voiceEnabled}">${voiceEnabled?"Voice replies: On":"Voice replies: Off"}</button>
          <button type="button" id="rol-global-translate">Translate page</button>
          <button type="button" id="rol-global-share">Share Link</button>
        </div>
        <div class="rol-global-status" id="rol-global-status" aria-live="polite">Symbols synchronize across RO’Lyfe pages on this browser. Your language choice is saved; the whole page and newly opened panels translate while tickers and prices stay unchanged.</div>
      </div>
    `;
        const navHost=document.querySelector(".nav")||document.querySelector(".topbar");
    const anchor=document.querySelector("header")||document.querySelector(".status-bar")||document.querySelector("main")||document.body.firstElementChild;
    if(navHost?.appendChild){
      navHost.appendChild(bar);
      bar.style.top="auto";
      bar.setAttribute("data-placement","navigation-tools");
    }else if(anchor?.parentNode){
      anchor.parentNode.insertBefore(bar,anchor.nextSibling);
      bar.style.top="auto";
    }else{
      document.body.prepend(bar);
      bar.style.top="auto";
    }
    const updateConnectivity=()=>{
      if(!navigator.onLine)setStatus("OFFLINE · Cached app shell only. Live quotes, AI, sign-in and cloud sync require internet.");
      else setStatus("ONLINE · Connected page tools are ready when their services respond.");
    };
    window.addEventListener("online",updateConnectivity);
    window.addEventListener("offline",updateConnectivity);
    updateConnectivity();
    const symbol=getInitialSymbol();
    const input=document.getElementById("rol-global-symbol");
    if(input)input.value=symbol;
    const chip=document.getElementById("rol-global-symbol-current");
    if(chip)chip.textContent=symbol;
    const compactChip=document.getElementById("rol-global-compact-symbol");
    if(compactChip)compactChip.textContent=symbol;
    const language=document.getElementById("rol-global-language");
    if(language){language.innerHTML=LANGUAGES.map(l=>'<option value="'+l.name+'">'+l.label+'</option>').join("");language.value=selectedLanguage.name;}
    const apply=document.getElementById("rol-global-symbol-apply");
    apply?.addEventListener("click",()=>{const value=input?.value||"";if(!setActiveSymbol(value)){setStatus("Enter a valid ticker or market symbol.");return;}setStatus("Active instrument changed to "+normalizeSymbol(value)+". The current engine will load it where supported.");});
    input?.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();apply?.click();}});
    language?.addEventListener("change",()=>selectLanguage(language.value,true));
    document.getElementById("rol-global-translate")?.addEventListener("click",()=>translatePage());
    document.getElementById("rol-global-present")?.addEventListener("click",togglePresentation);
    document.getElementById("rol-global-share")?.addEventListener("click",sharePage);
    document.getElementById("rol-global-present-compact")?.addEventListener("click",togglePresentation);
    const toolsToggle=document.getElementById("rol-global-tools-toggle");
    toolsToggle?.addEventListener("click",()=>{
      const expanded=bar.classList.toggle("rol-expanded");
      toolsToggle.setAttribute("aria-expanded",String(expanded));
      toolsToggle.textContent=expanded?"Close tools":"Tools ▾";
    });
    /* Keep the toolbar state stable while scrolling; only the user controls expansion. */

    document.getElementById("rol-global-voice")?.addEventListener("click",toggleVoice);
    document.getElementById("rol-global-zoom-out")?.addEventListener("click",()=>setPageZoom(pageZoom-0.1));
    document.getElementById("rol-global-zoom-in")?.addEventListener("click",()=>setPageZoom(pageZoom+0.1));
    document.getElementById("rol-global-zoom-reset")?.addEventListener("click",()=>setPageZoom(1));
    applyPageZoom();
    if(!NO_CLOCK){updateClock();setInterval(updateClock,1000);}
  }
  async function togglePresentation(){
    const active=!document.body.classList.contains("rol-presentation-mode");
    document.body.classList.toggle("rol-presentation-mode",active);
    updatePresentationButtons(active);
    if(!active){setStatus("Presentation view closed. Your site navigation remains available.");return;}
    if(window.isSecureContext&&typeof window.PresentationRequest==="function"){
      try{
        const canonical=document.querySelector('link[rel="canonical"]')?.href;
        const presentationUrl=canonical||location.href;
        const request=new PresentationRequest([presentationUrl]);
        const connection=await request.start();
        connection.addEventListener("close",()=>setStatus("Presentation display disconnected."),{once:true});
        setStatus("Presentation display connected. The current page is available on the presentation screen.");
        return;
      }catch(_){/* Fall back to browser-level tab casting without hiding browser chrome. */}
    }
    setStatus("Presentation view enabled for this page. To mirror this exact tab, use Chrome (⋮) → Cast → Sources → Cast tab, or Edge (⋯) → Cast media to device → Sources → Cast tab. The browser controls the device picker.");
  }
  function updatePresentationButtons(active){
    const button=document.getElementById("rol-global-present");
    if(button)button.textContent=active?"Exit Presentation":"Present / Cast";
    const compactButton=document.getElementById("rol-global-present-compact");
    if(compactButton){
      compactButton.textContent=active?"Exit":"Cast";
      compactButton.setAttribute("aria-label",active?"Exit presentation view":"Present / Cast");
    }
  }
  function setPageZoom(value){
    pageZoom=Math.min(1.5,Math.max(0.85,Math.round(value*100)/100));
    safeSet(ZOOM_KEY,String(pageZoom));
    applyPageZoom();
    setStatus("Page zoom set to "+Math.round(pageZoom*100)+"%.");
  }
  function applyPageZoom(){
    document.documentElement.style.zoom=String(pageZoom);
    const value=document.getElementById("rol-global-zoom-reset");
    if(value){const percent=Math.round(pageZoom*100);value.textContent=percent+"%";value.setAttribute("aria-label","Reset page zoom, current zoom "+percent+" percent");}
  }
  function sharePage(){
    const data={title:document.title,text:document.title||"RO’Lyfe workspace",url:document.querySelector('link[rel="canonical"]')?.href||location.href};
    if(navigator.share){navigator.share(data).then(()=>setStatus("Share sheet opened.")).catch(error=>setStatus(error.message||"Share cancelled."));return;}
    if(navigator.clipboard?.writeText){navigator.clipboard.writeText(location.href).then(()=>setStatus("Page link copied.")).catch(()=>setStatus("Copy unavailable in this browser."));return;}
    setStatus("Use the browser address bar to copy this page link.");
  }
  function updateClock(){
    const now=new Date();
    const clock=document.getElementById("rol-global-clock");
    const date=document.getElementById("rol-global-date");
    const compactClock=document.getElementById("rol-global-compact-clock");
    if(!clock&&!date&&!compactClock)return;
    if(clock)clock.textContent=new Intl.DateTimeFormat(selectedLanguage.locale,{timeZone:"America/New_York",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:true}).format(now);
    if(date)date.textContent=new Intl.DateTimeFormat(selectedLanguage.locale,{timeZone:"America/New_York",weekday:"long",year:"numeric",month:"short",day:"numeric"}).format(now);
    if(compactClock)compactClock.textContent=new Intl.DateTimeFormat(selectedLanguage.locale,{timeZone:"America/New_York",hour:"2-digit",minute:"2-digit",hour12:true}).format(now);
  }
  function setStatus(message){const node=document.getElementById("rol-global-status");if(node)node.textContent=message;}
  function setTranslationNotice(message,state="working"){
    const node=document.getElementById("rol-global-translation-status");
    if(!node)return;
    node.textContent=message||"";
    node.dataset.state=state;
    node.hidden=!message;
    const bar=document.getElementById("rol-global-tools");
    if(bar)bar.setAttribute("aria-busy",String(state==="working"));
  }
  function toggleVoice(){
    voiceEnabled=!voiceEnabled;safeSet(VOICE_KEY,String(voiceEnabled));
    const button=document.getElementById("rol-global-voice");
    if(button){button.setAttribute("aria-pressed",String(voiceEnabled));button.textContent=voiceEnabled?"Voice replies: On":"Voice replies: Off";}
    setStatus(voiceEnabled?"AI voice replies enabled where an existing page engine calls RO’LyfeSpeak.":"AI voice replies disabled. Existing engines and their own audio remain untouched.");
  }
  function speak(text){
    if(!voiceEnabled||!("speechSynthesis" in window)||!String(text||"").trim())return;
    /* Queue this reply instead of cancelling speech from another page engine. */
    const utterance=new SpeechSynthesisUtterance(String(text).slice(0,4500));
    utterance.lang=selectedLanguage.locale;
    const voices=window.speechSynthesis.getVoices?.()||[];
    const voice=voices.find(v=>v.lang?.toLowerCase()===selectedLanguage.locale.toLowerCase())||voices.find(v=>v.lang?.toLowerCase().startsWith(selectedLanguage.code.toLowerCase().split("-")[0]));
    if(voice)utterance.voice=voice;
    utterance.rate=1;window.speechSynthesis.speak(utterance);
  }
  window.ROLyfeSpeak=speak;
  window.ROLyfeLanguage=selectedLanguage;
  function selectLanguage(name,translateNow=false){
    selectedLanguage=LANG_BY_NAME.get(name)||LANGUAGES[0];
    safeSet(LANG_KEY,selectedLanguage.name);updateDocumentLanguage();updateClock();
    window.dispatchEvent(new CustomEvent("rol-language-change",{detail:{language:selectedLanguage}}));
    const voiceButton=document.getElementById("rol-global-voice");
    if(voiceButton)voiceButton.textContent=voiceEnabled?"Voice replies: On":"Voice replies: Off";
    if(translateNow){
      if(selectedLanguage.name==="English"){restorePage();setStatus("Page restored to English.");}
      else translatePage();
    }
  }

  function shouldSkipText(node){
    const parent=node.parentElement;
    if(!parent)return true;
    if(parent.closest('script,style,noscript,textarea,input,code,pre,svg,canvas,iframe,video,audio,[data-no-translate],.price,.quote,.symbol,.ticker,.market-price,.quote-value,.quote-cell,.chart,.tradingview-widget-container,#rol-global-tools'))return true;
    if(parent.closest("#rol-package-private,#rol-broker-docs,#loanResult,#rolpr-saved,#rolyfeUniversalAI"))return true;
    if(parent.tagName==="OPTION"&&!parent.hasAttribute("value"))parent.value=parent.textContent;
    const value=(originalText.get(node)??node.nodeValue??"").trim();
    return value.length<2||!/[A-Za-z\\u00C0-\\u024F\\u0400-\\u04FF\\u0600-\\u06FF\\u4E00-\\u9FFF]/.test(value)||/^(?:[A-Z0-9$%.,:+/\\-]+)$/.test(value);
  }
  function collectTextNodes(root=document.body){
    const nodes=[];
    if(root?.nodeType===Node.TEXT_NODE){
      if(!originalText.has(root))originalText.set(root,root.nodeValue);
      if(!shouldSkipText(root))nodes.push(root);
      return nodes;
    }
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode())){
      if(!originalText.has(node))originalText.set(node,node.nodeValue);
      if(!shouldSkipText(node))nodes.push(node);
    }
    return nodes;
  }
  function collectAttributes(root=document.body){
    const entries=[];
    const allowed=["aria-label","placeholder","title","alt"];
    const elements=root===document.body?[...document.querySelectorAll("body *")]:[
      ...(root?.nodeType===Node.ELEMENT_NODE?[root]:[]),
      ...(root?.querySelectorAll?[...root.querySelectorAll("*")]:[])
    ];
    elements.forEach(el=>{
      if(el.closest('[data-no-translate],script,style,code,pre,svg,canvas,iframe,#rol-global-tools,.chart,.tradingview-widget-container'))return;
      if(el.closest("#rol-package-private,#rol-broker-docs,#loanResult,#rolpr-saved,#rolyfeUniversalAI"))return;
      allowed.forEach(attr=>{
        if(!el.hasAttribute(attr))return;
        let saved=originalAttributes.get(el);
        if(!saved){saved={};originalAttributes.set(el,saved);}
        if(!(attr in saved))saved[attr]=el.getAttribute(attr);
        const value=saved[attr]||"";
        if(value.length>1&&/[A-Za-z\\u00C0-\\u024F]/.test(value)&&!/^([A-Z0-9$%.,:+/\\-]+)$/.test(value))entries.push({el,attr,source:value});
      });
    });
    return entries;
  }
  function restorePage(){
    isApplying=true;
    originalText.forEach((value,node)=>{if(node.isConnected)node.nodeValue=value;});
    originalAttributes.forEach((attrs,el)=>{if(el.isConnected)Object.entries(attrs).forEach(([attr,value])=>el.setAttribute(attr,value));});
    document.documentElement.dir="ltr";document.documentElement.lang="en";
    isApplying=false;
  }
  function hash(value){
    let h=2166136261;
    for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}
    return (h>>>0).toString(36);
  }
  async function requestTranslationBatch(language,segments){
    const cacheKeys=segments.map(text=>language+"|"+hash(text));
    const out=new Array(segments.length);
    const uncached=[],uncachedIndex=[];
    segments.forEach((text,i)=>{
      const cached=translationCache.get(cacheKeys[i])||safeGet("rol-trx-"+cacheKeys[i],"");
      if(cached){out[i]=cached;translationCache.set(cacheKeys[i],cached);}
      else{uncached.push(text);uncachedIndex.push(i);}
    });
    if(uncached.length){
      const response=await fetch(SUPABASE_URL+"/functions/v1/rol-page-translate",{
        method:"POST",
        headers:{apikey:SUPABASE_ANON,Authorization:"Bearer "+SUPABASE_ANON,"Content-Type":"application/json",Accept:"application/json"},
        body:JSON.stringify({language,segments:uncached}),
        cache:"no-store"
      });
      const payload=await response.json().catch(()=>({}));
      if(!response.ok||!Array.isArray(payload.translations)){
        throw new Error("Translation is temporarily unavailable. The page will remain usable in its current language.");
      }
      if(payload.translations.length!==uncached.length||payload.translations.some(value=>typeof value!=="string"||!value.trim())){
        throw new Error("The translation service returned an incomplete batch. Please retry.");
      }
      payload.translations.forEach((value,j)=>{
        const i=uncachedIndex[j];out[i]=value;translationCache.set(cacheKeys[i],value);
        try{safeSet("rol-trx-"+cacheKeys[i],value);}catch(_){}
      });
    }
    return out;
  }
  async function requestTranslations(language,segments){
    // The server accepts no single segment above 1200 chars and at most 4400 per request.
    const chunks=[],owners=[];
    segments.forEach((value,i)=>{
      let remaining=value;
      while(remaining.length>1000){
        let split=remaining.lastIndexOf(" ",1000);
        if(split<400)split=1000;
        chunks.push(remaining.slice(0,split));owners.push(i);remaining=remaining.slice(split);
      }
      if(remaining.trim()){chunks.push(remaining);owners.push(i);}
    });
    const out=segments.map(()=>"");
    for(let i=0;i<chunks.length;){
      const batch=[],indices=[];let size=0;
      while(i<chunks.length&&batch.length<25&&size+chunks[i].length<=3500){
        batch.push(chunks[i]);indices.push(owners[i]);size+=chunks[i].length;i++;
      }
      const translated=await requestTranslationBatch(language,batch);
      translated.forEach((value,j)=>{const k=indices[j];out[k]+=(out[k]?" ":"")+value.trim();});
    }
    return out;
  }
  async function translateEntries(entries,language,isCurrent=()=>true){
    const pending=entries.filter(x=>x.source.trim());
    const completed=[];
    let index=0,translated=0;
    while(index<pending.length){
      const batch=[];let chars=0;
      while(index<pending.length&&batch.length<35){
        const length=pending[index].source.length;
        if(batch.length&&chars+length>4200)break;
        batch.push(pending[index]);chars+=length;index++;
      }
      const translatedValues=await requestTranslations(language,batch.map(x=>x.source));
      batch.forEach((entry,i)=>completed.push({entry,value:translatedValues[i]}));
      translated+=batch.length;
      const progress="Translating page into "+language+" · "+translated+" of "+pending.length+" text items…";
      setStatus(progress);
      setTranslationNotice(progress,"working");
    }
    if(!isCurrent())return false;
    isApplying=true;
    try{
      completed.forEach(({entry,value})=>{
        if(entry.node?.isConnected)entry.node.nodeValue=value;
        else if(entry.el?.isConnected)entry.el.setAttribute(entry.attr,value);
      });
    }finally{isApplying=false;}
    return true;
  }
  async function flushDynamicTranslations(){
    dynamicTimer=null;
    if(selectedLanguage.name==="English"){dynamicRoots.clear();return;}
    if(pageTranslationInProgress){dynamicTimer=setTimeout(flushDynamicTranslations,300);return;}
    if(!dynamicRoots.size)return;
    pageTranslationInProgress=true;
    const language=selectedLanguage;
    try{
      const roots=[...dynamicRoots];dynamicRoots.clear();
      const entries=[],seenText=new Set(),seenAttributes=new Map();
      for(const root of roots){
        for(const node of collectTextNodes(root)){
          if(seenText.has(node))continue;
          seenText.add(node);entries.push({node,source:originalText.get(node)});
        }
        for(const entry of collectAttributes(root)){
          let attrs=seenAttributes.get(entry.el);
          if(!attrs){attrs=new Set();seenAttributes.set(entry.el,attrs);}
          if(attrs.has(entry.attr))continue;
          attrs.add(entry.attr);entries.push(entry);
        }
      }
      if(!entries.length)return;
      const applied=await translateEntries(entries,language.name,()=>selectedLanguage.name===language.name);
      if(!applied||selectedLanguage.name!==language.name)return;
      document.documentElement.lang=language.locale;
      document.documentElement.dir=language.code==="ar"?"rtl":"ltr";
      setStatus("New page content translated into "+language.name+".");
    }catch(error){
      if(selectedLanguage.name===language.name)setStatus("Some newly opened content could not be translated right now. The rest of the page remains available.");
    }finally{
      pageTranslationInProgress=false;
      if(selectedLanguage.name!==language.name&&selectedLanguage.name!=="English"){
        if(dynamicTimer)clearTimeout(dynamicTimer);
        dynamicTimer=setTimeout(()=>{dynamicTimer=null;translatePage();},0);
      }
      if(dynamicRoots.size&&!dynamicTimer)dynamicTimer=setTimeout(flushDynamicTranslations,200);
    }
  }
  function queueDynamicTranslation(root){
    if(!root||(root.nodeType!==Node.ELEMENT_NODE&&root.nodeType!==Node.TEXT_NODE))return;
    if(root.nodeType===Node.ELEMENT_NODE&&root.closest('[data-no-translate],script,style,code,pre,svg,canvas,iframe,#rol-global-tools,.chart,.tradingview-widget-container'))return;
    if(root.nodeType===Node.TEXT_NODE&&shouldSkipText(root))return;
    for(const existing of dynamicRoots){
      if(existing===root||(existing.nodeType===Node.ELEMENT_NODE&&existing.contains?.(root)))return;
    }
    for(const existing of [...dynamicRoots]){
      if(root.nodeType===Node.ELEMENT_NODE&&root.contains?.(existing))dynamicRoots.delete(existing);
    }
    dynamicRoots.add(root);
    if(!dynamicTimer)dynamicTimer=setTimeout(flushDynamicTranslations,250);
  }
  function watchDynamicContent(){
    if(translationObserver||!document.body)return;
    translationObserver=new MutationObserver(records=>{
      if(isApplying||selectedLanguage.name==="English")return;
      for(const record of records){
        if(record.type==="childList")record.addedNodes.forEach(queueDynamicTranslation);
      }
    });
    translationObserver.observe(document.body,{childList:true,subtree:true});
  }
  async function translatePage(){
    if(selectedLanguage.name==="English"){
      restorePage();dynamicRoots.clear();
      if(dynamicTimer)clearTimeout(dynamicTimer);
      dynamicTimer=null;
      setTranslationNotice("Page language set to English.","success");
      return;
    }
    if(pageTranslationInProgress)return;
    pageTranslationInProgress=true;
    const targetLanguage=selectedLanguage;
    setTranslationNotice("Translating page into "+targetLanguage.name+"…","working");
    const button=document.getElementById("rol-global-translate");
    if(button)button.disabled=true;
    try{
      restorePage();
      const textEntries=collectTextNodes().map(node=>({node,source:originalText.get(node)}));
      const attrEntries=collectAttributes();
      const entries=[...textEntries,...attrEntries];
      const applied=await translateEntries(entries,targetLanguage.name,()=>selectedLanguage.name===targetLanguage.name);
      if(!applied||selectedLanguage.name!==targetLanguage.name)return;
      document.documentElement.lang=targetLanguage.locale;
      document.documentElement.dir=targetLanguage.code==="ar"?"rtl":"ltr";
      setStatus("Page translated into "+targetLanguage.name+". Symbols, prices, formulas and market values remain unchanged.");
      setTranslationNotice("Page translated into "+targetLanguage.name+".","success");
      window.dispatchEvent(new CustomEvent("rol-page-translated",{detail:{language:targetLanguage}}));
    }catch(error){
      if(selectedLanguage.name===targetLanguage.name){
        /* Never leave the selector claiming a language that was not applied to the page. */
        selectedLanguage=LANGUAGES[0];
        safeSet(LANG_KEY,selectedLanguage.name);
        updateDocumentLanguage();
        const languageControl=document.getElementById("rol-global-language");
        if(languageControl)languageControl.value=selectedLanguage.name;
        restorePage();
        const message="Whole-page translation is temporarily unavailable. The page has been restored to English; try again later.";
        setStatus(message);
        setTranslationNotice(message,"error");
      }
    }finally{
      pageTranslationInProgress=false;
      if(button)button.disabled=false;
      if(selectedLanguage.name!==targetLanguage.name&&selectedLanguage.name!=="English"){
        if(dynamicTimer)clearTimeout(dynamicTimer);
        dynamicTimer=setTimeout(()=>{dynamicTimer=null;translatePage();},0);
      }
      if(dynamicRoots.size&&!dynamicTimer)dynamicTimer=setTimeout(flushDynamicTranslations,200);
    }
  }
  document.addEventListener("change",event=>{
    const target=event.target;
    if(!target||target.closest?.("#rol-global-tools"))return;
    if(["classroomSymbol","symbol-select","symbol","chartSymbol","independent-chart-symbol"].includes(target.id)&&target.value){
      setActiveSymbol(target.value,true);
    }
  });
  window.addEventListener("rol-active-symbol-selected",event=>{const value=normalizeSymbol(event.detail?.symbol);if(value)setActiveSymbol(value,true);});
  window.addEventListener("rol-global-symbol-change",event=>{
    const symbol=normalizeSymbol(event.detail?.symbol);
    if(symbol){const input=document.getElementById("rol-global-symbol");if(input)input.value=symbol;const chip=document.getElementById("rol-global-symbol-current");if(chip)chip.textContent=symbol;}
  });
  document.addEventListener("fullscreenchange",()=>{if(!document.fullscreenElement&&document.body.classList.contains("rol-presentation-mode")){document.body.classList.remove("rol-presentation-mode");const button=document.getElementById("rol-global-present");if(button)button.textContent="Present / Cast";}});
  window.addEventListener("storage",event=>{
    if(event.key===SYMBOL_KEY&&event.newValue){setActiveSymbol(event.newValue,false);}
    if(event.key===LANG_KEY&&event.newValue){selectLanguage(event.newValue,true);}
  });
  window.addEventListener("load",()=>{
    injectToolbar();
    updateDocumentLanguage();
    /* Public funding page: do not send dynamically generated borrower or property data to the translation service. Retry manually for public labels. */
    const symbol=safeGet(SYMBOL_KEY,"");
    if(symbol)setActiveSymbol(symbol,false);
    else setActiveSymbol(getInitialSymbol(),false);
    if(selectedLanguage.name!=="English")setTimeout(()=>translatePage(),900);
  });
  if(document.readyState==="complete")window.addEventListener("load",()=>{}, {once:true});
  else if(document.readyState==="interactive"){} 
})();