// 驗證 index.html 的加密資料能用密碼 1019 解密（node webcrypto，與瀏覽器同演算法）
const fs=require('fs'),path=require('path');
const {subtle}=require('crypto').webcrypto;
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const m=html.match(/window\.ENC=(\{.*?\});/);
if(!m){console.log('❌ 找不到 window.ENC');process.exit(1);}
const E=JSON.parse(m[1]);
const b64=s=>Uint8Array.from(Buffer.from(s,'base64'));
async function decrypt(pw){
  const km=await subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']);
  const key=await subtle.deriveKey({name:'PBKDF2',salt:b64(E.salt),iterations:E.iter,hash:'SHA-256'},
    km,{name:'AES-GCM',length:256},false,['decrypt']);
  const pt=await subtle.decrypt({name:'AES-GCM',iv:b64(E.iv)},key,b64(E.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}
(async()=>{
  // 正確密碼
  try{
    const d=await decrypt('1019');
    const gq=d.grammar.reduce((s,c)=>s+c.units.reduce((a,u)=>a+u.qids.length,0),0);
    const rq=d.reading.reduce((s,c)=>s+c.units.reduce((a,u)=>a+u.qids.length,0),0);
    console.log('✅ 密碼 1019 解密成功：文法',gq,'閱讀',rq,'題，文本',Object.keys(d.P).length,'講義',Object.keys(d.notes).length);
    // 答案抽查
    let bad=0,tot=0;for(const id in d.Q){const q=d.Q[id];tot++;if(!(q.answer>=0&&q.answer<q.options.length))bad++;}
    console.log('   答案索引檢查',tot,'題，越界',bad, bad===0?'✅':'❌');
  }catch(e){console.log('❌ 正確密碼解密失敗：',e.message);}
  // 錯誤密碼
  try{await decrypt('0000');console.log('❌ 錯誤密碼竟然解得開！');}
  catch(e){console.log('✅ 錯誤密碼 0000 無法解密（如預期）');}
})();
