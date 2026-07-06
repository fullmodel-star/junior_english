// jsdom + 真 WebCrypto：完整跑「輸密碼→解密→導覽→測驗→錯題本」
const fs=require('fs'),path=require('path');
const {JSDOM}=require(path.join('..','..','17_國中英語文法','node_modules','jsdom'));
const {webcrypto}=require('crypto');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let errs=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
  beforeParse(w){w.scrollTo=()=>{};w.confirm=()=>true;
    Object.defineProperty(w,'crypto',{value:webcrypto,configurable:true});  // 注入真 WebCrypto
    w.onerror=(m)=>errs.push('onerror:'+m);}});
const w=dom.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,ms=3000){const t=Date.now();while(Date.now()-t<ms){if(fn())return true;await sleep(30);}return false;}
(async()=>{
  try{
    await sleep(200);
    const $=s=>d.querySelector(s);
    console.assert($('#pw'),'FAIL 無密碼閘');
    // 錯密碼
    $('#pw').value='0000';$('#go').click();
    await until(()=>$('#err')&&/不正確/.test($('#err').textContent));
    console.assert(/不正確/.test($('#err').textContent),'FAIL 錯密碼未擋');
    // 對密碼 1019 → 解密
    $('#pw').value='1019';$('#go').click();
    const ok=await until(()=>d.getElementById('tabbar').style.display==='flex',5000);
    console.assert(ok,'FAIL 1019 解密後未進入');
    console.assert(w.DB&&w.DB.grammar,'FAIL DB 未載入');
    // 文法導覽
    let rows=[...d.querySelectorAll('.row')];console.assert(rows.length>=3,'FAIL 書系少');
    rows[0].click();
    let units=[...d.querySelectorAll('.row')];units.find(r=>/題/.test(r.textContent)).click();
    [...d.querySelectorAll('.btn')].find(b=>/開始練習/.test(b.textContent)).click();
    console.assert($('#opts'),'FAIL 無題目');
    // 答錯→錯題本
    const q=w.DB.Q[w.quiz.ids[0]];
    d.querySelectorAll('#opts .opt')[(q.answer+1)%q.options.length].click();
    console.assert(/答錯/.test($('#fb').textContent),'FAIL 答錯回饋');
    console.assert(Object.keys(JSON.parse(w.localStorage.getItem('gkq_v1')).wrong).length>=1,'FAIL 錯題未入本');
    // 記住密碼
    console.assert(w.localStorage.getItem('gkq_pw')==='1019','FAIL 未記住密碼');
    // 閱讀 passage
    w.setTab('reading');let rr=[...d.querySelectorAll('.row')];rr[0].click();
    let ru=[...d.querySelectorAll('.row')];ru.find(r=>/題/.test(r.textContent)).click();
    [...d.querySelectorAll('.btn')].find(b=>/開始練習/.test(b.textContent)).click();
    const rq=w.DB.Q[w.quiz.ids[0]];console.assert(!rq.pid||$('.psg'),'FAIL 閱讀無文本');
    // 設定版權聲明
    w.setTab('settings');console.assert(/版權聲明/.test(d.body.textContent),'FAIL 無版權聲明');
    console.log('JS錯誤',errs.length,errs.slice(0,3));
    console.log(errs.length===0?'✅ 端到端（含解密）全過':'⚠️ 有 JS 錯誤');
  }catch(e){console.log('❌ 例外',e.message,(e.stack||'').split('\n')[1]);}
})();
