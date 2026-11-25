(() => {
"use strict";
const $=id=>document.getElementById(id);
const get=(k,d)=>{try{return localStorage.getItem(k)??d}catch{return d}};
const set=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
const sessionGet=k=>{try{return sessionStorage.getItem(k)||""}catch{return ""}};
const sessionSet=(k,v)=>{try{sessionStorage.setItem(k,v)}catch{}};
const reduced=matchMedia("(prefers-reduced-motion: reduce)");
const sourceList=["facebook","instagram","linkedin","tiktok","direct","other"];
const source=(new URLSearchParams(location.search).get("utm_source")||"").toLowerCase();
if(sourceList.includes(source))sessionSet("rol-funding-source",source);
const activeSource=sessionGet("rol-funding-source");
const sourceNotice=$("rol-source-notice");
if(sourceList.includes(activeSource)&&sourceNotice){sourceNotice.textContent="Referral source: "+activeSource+". Please select this source when asked on your funding inquiry.";sourceNotice.hidden=false;}
const canonical="https://rolrichman.github.io/rolyfe-funding/";
function shareURL(src){const u=new URL(canonical);if(src){u.searchParams.set("utm_source",src);u.searchParams.set("utm_medium","social");u.searchParams.set("utm_campaign","funding_hub");}return u.href}
async function copyShare(url){const status=$("rol-share-status");try{await navigator.clipboard.writeText(url);status.textContent="Link copied. Paste it into your post or profile."}catch{const field=$("rol-share-fallback");field.hidden=false;field.value=url;field.focus();field.select();status.textContent="Copy the selected link manually."}}
document.querySelectorAll("[data-share-source]").forEach(b=>b.addEventListener("click",()=>copyShare(shareURL(b.dataset.shareSource))));
$("rol-native-share")?.addEventListener("click",async()=>{if(navigator.share){try{await navigator.share({title:"RO’Lyfe Funding",text:"Explore funding pathways with Root Of Lyfe LLC.",url:canonical});return}catch(e){if(e.name==="AbortError")return}}await copyShare(canonical)});
let voice=get("rol-funding-voice","off")==="on";
const welcome=$("rol-welcome"),greeting=$("rol-greeting"),voiceButton=$("rol-voice-enable"),voiceStatus=$("rol-voice-status");
function syncVoice(){voiceButton.textContent=voice?"Voice greeting: On":"Voice greeting: Off";voiceButton.setAttribute("aria-pressed",String(voice));}
function speak(){if(!("speechSynthesis" in window)){voiceStatus.textContent="Voice playback is not supported by this browser.";return}try{const u=new SpeechSynthesisUtterance(greeting.textContent);u.lang=window.ROLyfeLanguage?.locale||"en-US";u.rate=.95;u.onerror=()=>{voiceStatus.textContent="Voice playback unavailable. Try Hear welcome again."};speechSynthesis.cancel();speechSynthesis.speak(u);}catch{voiceStatus.textContent="Voice playback unavailable."}}
syncVoice();
voiceButton?.addEventListener("click",()=>{voice=!voice;set("rol-funding-voice",voice?"on":"off");syncVoice();if(voice)speak();else if("speechSynthesis" in window)speechSynthesis.cancel()});
$("rol-voice-play")?.addEventListener("click",speak);
$("rol-chat-open")?.addEventListener("click",()=>window.openJamalPopup());
$("rol-welcome-hide")?.addEventListener("click",()=>{welcome.hidden=true;sessionSet("rol-funding-welcome-hidden","1");if("speechSynthesis" in window)speechSynthesis.cancel()});
if(sessionGet("rol-funding-welcome-hidden")==="1")welcome.hidden=true;
window.addEventListener("pageshow",()=>{if(voice&&!welcome.hidden)speak()},{once:true});
const style=document.createElement("style");style.textContent=`
#rol-jamal-fab{background:linear-gradient(145deg,#07382b,#148b61)!important;border:2px solid #f5cc75;box-shadow:0 5px 22px #0009;z-index:30;display:flex;flex-direction:column;gap:1px;bottom:calc(22px + env(safe-area-inset-bottom,0px));animation:rol-jamal-bob 3s ease-in-out infinite;color:#fff}
.rol-jamal-placeholder{font:800 27px/1 Arial,sans-serif;color:#fcd34d}.rol-jamal-name{font:700 10px/1 Arial,sans-serif}
@keyframes rol-jamal-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}@media(prefers-reduced-motion:reduce){#rol-jamal-fab{animation:none}}
#rol-jamal-fab[aria-expanded=true]{animation:none}#rol-top{bottom:calc(115px + env(safe-area-inset-bottom,0px));z-index:29}
#rol-welcome[hidden],#rol-share-fallback[hidden],#rol-source-notice[hidden]{display:none!important}
#rol-language-standalone select{max-width:100%}#rol-language-standalone{display:grid;gap:8px}
#start-funding .btn-grid>a{display:flex;align-items:center;justify-content:center;text-align:center;min-height:44px;padding:10px;border:1px solid #4c796a;border-radius:10px}
#rol-public-privacy{font-size:.92rem}#rol-global-tools .rol-global-language-control{display:none!important}
`;document.head.append(style);
function bindShared(){
const dock=$("rolyfeResearchDock");if(dock?.tagName==="DETAILS")dock.open=false;
const shared=$("rol-global-language"),local=$("rol-public-language"),status=$("rol-global-translation-status");
if(!shared||!local)return;
local.replaceChildren(...Array.from(shared.options).map(o=>o.cloneNode(true)));local.value=shared.value;
local.addEventListener("change",()=>{shared.value=local.value;shared.dispatchEvent(new Event("change",{bubbles:true}))});
$("rol-public-retry").addEventListener("click",()=>{shared.value=local.value;shared.dispatchEvent(new Event("change",{bubbles:true}));if(local.value!=="English")$("rol-global-translate")?.click()});
if(status){const sync=()=>{if(status.textContent)$("rol-public-language-status").textContent=status.textContent;local.value=shared.value};new MutationObserver(sync).observe(status,{childList:true,characterData:true,subtree:true,attributes:true});sync();}
window.addEventListener("rol-language-change",()=>{local.value=shared.value});
}
if(document.readyState==="complete")bindShared();else window.addEventListener("load",bindShared,{once:true});
})();
