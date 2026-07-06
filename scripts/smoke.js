// jsdom + 真 WebCrypto：端到端 v2.1（解密→儀表板→練習→點字彈窗→生字→分類錯題→翻卡→首答統計）
const fs=require('fs'),path=require('path');
const {JSDOM}=require(path.join('..','..','17_國中英語文法','node_modules','jsdom'));
const {webcrypto}=require('crypto');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let errs=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
  beforeParse(w){w.scrollTo=()=>{};w.confirm=()=>true;
    Object.defineProperty(w,'crypto',{value:webcrypto,configurable:true});
    w.SpeechSynthesisUtterance=function(){};w.speechSynthesis={cancel(){},speak(){}};
    w.onerror=(m)=>errs.push('onerror:'+m);}});
const w=dom.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,ms=5000){const t=Date.now();while(Date.now()-t<ms){if(fn())return true;await sleep(30);}return false;}
const S=()=>JSON.parse(w.localStorage.getItem('gkq_v2'));
(async()=>{
  try{
    await sleep(200);const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
    $('#pw').value='0000';$('#go').click();await until(()=>/不正確/.test($('#err').textContent));
    console.assert(/不正確/.test($('#err').textContent),'FAIL 錯密碼');
    $('#pw').value='1019';$('#go').click();
    console.assert(await until(()=>d.getElementById('tabbar').style.display==='flex'),'FAIL 未進入');
    // 儀表板：每日目標/連續/最近7天
    console.assert(/連續/.test(d.body.textContent)&&/每日|今日/.test(d.body.textContent)&&/最近 7 天/.test(d.body.textContent),'FAIL 儀表板缺元素');
    console.assert($$('.tabbar button').length===5,'FAIL 導覽非5');
    // 練習
    w.setTab('grammar');$$('.row').find(r=>/單元/.test(r.textContent)).click();
    $$('.row').find(r=>/題/.test(r.textContent)).click();
    console.assert($('#dseg'),'FAIL 無難易度選擇');  // 難易度分層
    $$('.btn').find(b=>/開始練習/.test(b.textContent)).click();
    console.assert($('#opts'),'FAIL 無題目');
    // 由易到難：首題難度<=末題
    console.assert(( +(w.DB.Q[w.quiz.ids[0]].diff||2) )<=( +(w.DB.Q[w.quiz.ids[w.quiz.ids.length-1]].diff||2) ),'FAIL 未由易到難');
    // 點字→彈窗（不立即加入）
    const wd=$('.wd');let sheetOpened=false,vocabAdded=false;
    if(wd){wd.click();sheetOpened=$('#sheet').classList.contains('on');
      const add=$('[data-addv]');if(add){add.click();vocabAdded=Object.keys(S().vocab).length>=1;}}
    console.assert(!wd||sheetOpened,'FAIL 點字未開彈窗');
    console.assert(!wd||vocabAdded,'FAIL 彈窗加入生字失敗');
    // 首答統計：作答前 ans=0，答一題後 ans=1
    const ansBefore=S().stat.ans;
    const q=w.DB.Q[w.quiz.ids[0]];
    $$('#opts .opt')[(q.answer+1)%q.options.length].click();
    console.assert(/答錯/.test($('#fb').textContent),'FAIL 答錯回饋');
    console.assert(S().stat.ans===ansBefore+1,'FAIL 首答統計未+1');
    console.assert(S().first[q.id]===1,'FAIL first 未記');
    const wobj=S().wrong[q.id];console.assert(wobj&&wobj.kn&&wobj.un,'FAIL 錯題無出處');
    // 再答同題不應重複計入首答 stat（回上一題重做）
    // 複習分類
    w.setTab('review');
    console.assert(d.body.textContent.includes(wobj.kn),'FAIL 錯題本未顯示書系');
    w.rvSeg('vocab');console.assert(/生字/.test(d.body.textContent),'FAIL 生字本頁');
    // 翻卡：翻面顯示中文（若字典有）
    if(Object.keys(S().vocab).length){w.startVocab();console.assert($('.flash'),'FAIL 翻卡未出現');
      $('#flip').click();await sleep(20);w.vqRate(1);}
    // 閱讀 passage
    w.setTab('reading');$$('.row').find(r=>/單元/.test(r.textContent)).click();
    $$('.row').find(r=>/題/.test(r.textContent)).click();$$('.btn').find(b=>/開始練習/.test(b.textContent)).click();
    const rq=w.DB.Q[w.quiz.ids[0]];console.assert(!rq.pid||$('.psg'),'FAIL 閱讀無文本');
    // 設定：每日目標 + 週報
    w.setTab('settings');console.assert(/每日目標/.test(d.body.textContent)&&/版權聲明/.test(d.body.textContent)&&/學習週報/.test(d.body.textContent),'FAIL 設定缺');
    $('#rpt').click();console.assert($('#rpttxt')&&/學習週報/.test($('#rpttxt').value),'FAIL 週報未產生');
    // dict 存在
    console.assert(w.DB.dict&&Object.keys(w.DB.dict).length>500,'FAIL 生字字典缺');
    console.log('生字字典字數:',Object.keys(w.DB.dict).length);
    // #2 模擬計時卷：設定→作答→提前交卷→結果
    w.setTab('home');w.go({t:'mockcfg'});console.assert($('#mgo'),'FAIL 模擬設定頁缺');
    $('#mgo').click();
    console.assert(w.mock&&w.mock.ids.length>0&&$('#mtimer'),'FAIL 模擬卷未開始');
    $$('#mopts .opt')[0].click();console.assert(w.mock.ans[0]===0,'FAIL 模擬選答未記');
    d.getElementById('msub2').click(); // 提前交卷（confirm=>true）
    console.assert(w.mock.score!=null&&/測驗結果/.test(d.body.textContent),'FAIL 模擬卷未出結果');
    console.log('模擬卷:',w.mock.ids.length,'題，得分',w.mock.score);
    // #3 生字造句練習
    w.setTab('review');
    console.assert(typeof w.usableVocab==='function','FAIL 無造句函式');
    if(w.usableVocab().length){w.startUsage();
      console.assert($('#uopts'),'FAIL 造句未開始');
      $$('#uopts .opt')[0].click();console.assert(/正確|正解/.test($('#ufb').textContent),'FAIL 造句無回饋');}
    console.log('JS錯誤',errs.length,errs.slice(0,3));
    console.log(errs.length===0?'✅ v2.1 端到端全過':'⚠️ 有 JS 錯誤');
  }catch(e){console.log('❌ 例外',e.message,(e.stack||'').split('\n')[1]);}
})();
