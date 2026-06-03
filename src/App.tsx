import { useState, useEffect } from "react";

const SUPABASE_URL = "https://xivairsxhdzignniithm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpdmFpcnN4aGR6aWdubmlpdGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0ODE0MzYsImV4cCI6MjA5NjA1NzQzNn0.C6oVIr2LVd_M3-O4tXeTis50ZA_sQ1UR5VpLQ90nrUk";
const MASTER_PW = "admin1234";
const APP_TITLE = "김민기 원장의 기록관리 시스템";
const APP_SUBTITLE = "경찰 순환식 체력시험";
const PASS_TIME = 280;

const PC = {
  primary:"#1a73e8", primaryLight:"#e8f0fe", primaryDark:"#1557b0",
  success:"#34a853", successLight:"#e6f4ea",
  danger:"#ea4335", dangerLight:"#fce8e6",
  bg:"#f8f9fa", white:"#ffffff",
  border:"#e0e0e0", borderLight:"#f1f3f4",
  text:"#202124", textSub:"#5f6368", textLight:"#9aa0a6",
};

const COURSES = [
  { id:"obstacle",   name:"장애물달리기", icon:"🏃", defaultTime:160 },
  { id:"hurdle",     name:"장대허들",     icon:"🚧", defaultTime:25 },
  { id:"resistance", name:"밀고당기기",   icon:"💪", defaultTime:30 },
  { id:"rescue",     name:"구조하기",     icon:"🤝", defaultTime:30 },
  { id:"trigger",    name:"방아쇠당기기", icon:"🎯", defaultTime:25 },
];

const RATING_KEYS = [
  { key:"i_obstacle",   label:"장애물" },
  { key:"i_hurdle",     label:"장대허들" },
  { key:"i_resistance", label:"밀고당기기" },
  { key:"i_rescue",     label:"구조하기" },
  { key:"i_trigger",    label:"방아쇠" },
];

function pad(n) { return String(n).padStart(2,"0"); }
function secToMMSS(s) { const n=Math.round(Number(s)); return `${pad(Math.floor(n/60))}:${pad(n%60)}`; }
function secToDisplay(s) { const n=Math.round(Number(s)); return n>=60?`${Math.floor(n/60)}분 ${pad(n%60)}초`:`${n}초`; }
function todayISO() { return new Date().toISOString().split("T")[0]; }
function isoToKR(iso) { if(!iso)return""; const[y,m,d]=iso.split("-"); return `${y}.${m}.${d}`; }

const H = { "Content-Type":"application/json", apikey:SUPABASE_KEY, Authorization:`Bearer ${SUPABASE_KEY}` };
async function dbGet(t,q=""){ const r=await fetch(`https://xivairsxhdzignniithm.supabase.co/rest/v1/${t}?select=*&${q}`,{headers:{...H,Accept:"application/json"}}); return r.json(); }
async function dbPost(t,b){ const r=await fetch(`https://xivairsxhdzignniithm.supabase.co/rest/v1/${t}`,{method:"POST",headers:{...H,Prefer:"return=representation"},body:JSON.stringify(b)}); return r.json(); }

function useCourseInputs(){
  const mk=()=>{ const o={}; COURSES.forEach(c=>{o[c.id+"_m"]="";o[c.id+"_s"]="";}); return o; };
  const [v,sv]=useState(mk);
  const setM=(id,val)=>sv(p=>({...p,[id+"_m"]:val}));
  const setS=(id,val)=>sv(p=>({...p,[id+"_s"]:val}));
  const getSec=(id)=>{ const m=Number(v[id+"_m"])||0; const s=Number(v[id+"_s"])||0; return(m===0&&s===0)?0:m*60+s; };
  const has=(id)=>v[id+"_m"]!==""||v[id+"_s"]!=="";
  const reset=()=>sv(mk());
  return{v,setM,setS,getSec,has,reset};
}

function MinSecInput({mVal,sVal,onM,onS}){
  const st={width:52,borderRadius:8,border:`1px solid ${PC.border}`,padding:"8px 6px",fontSize:14,color:PC.text,textAlign:"center",background:PC.white};
  return(
    <div style={{display:"flex",gap:4,alignItems:"center"}}>
      <input type="number" min={0} placeholder="분" value={mVal} onChange={onM} style={st}/>
      <span style={{fontSize:13,color:PC.textSub}}>분</span>
      <input type="number" min={0} max={59} placeholder="초" value={sVal} onChange={onS} style={st}/>
      <span style={{fontSize:13,color:PC.textSub}}>초</span>
    </div>
  );
}

function Bdg({bg,fg,txt}){ return <span style={{background:bg,color:fg,borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>{txt}</span>; }

function dBdg(diff){
  if(diff===null)return null;
  if(diff>0)return{bg:PC.dangerLight,fg:PC.danger,txt:`+${diff}초 초과`};
  if(diff<0)return{bg:PC.successLight,fg:PC.success,txt:`${Math.abs(diff)}초 단축`};
  return{bg:PC.borderLight,fg:PC.textSub,txt:"기준"};
}
function cBdg(d){
  if(d===null)return null;
  if(d<0)return{bg:PC.successLight,fg:PC.success,txt:`▼${Math.abs(d)}초`};
  if(d>0)return{bg:PC.dangerLight,fg:PC.danger,txt:`▲${d}초`};
  return{bg:PC.borderLight,fg:PC.textSub,txt:"→"};
}

const card={background:PC.white,border:`1px solid ${PC.border}`,borderRadius:12,padding:"1rem 1.25rem",marginBottom:10,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"};
const lbl={fontSize:13,color:PC.textSub,marginBottom:4,display:"block",fontWeight:500};
const inSt={borderRadius:8,border:`1px solid ${PC.border}`,padding:"10px 12px",fontSize:14,color:PC.text,background:PC.white,width:"100%",boxSizing:"border-box"};
const passTag=(p)=>({background:p?PC.successLight:PC.dangerLight,color:p?PC.success:PC.danger,borderRadius:20,padding:"6px 18px",fontSize:13,fontWeight:700});
const btnPrimary={background:PC.primary,color:PC.white,border:"none",borderRadius:10,padding:"12px",fontSize:15,fontWeight:700,cursor:"pointer",width:"100%"};
const hdrSt={background:PC.white,borderBottom:`1px solid ${PC.border}`,padding:"0 1.25rem",position:"sticky",top:0,zIndex:10};

// ── 히스토리 카드 렌더 ──
function RecordCard({h,prev}){
  const chg=prev?h.total_time-prev.total_time:null;
  const cb=cBdg(chg);
  const r=h.ratings||{};
  const hasRatings=r.condition||r.i_obstacle||r.i_hurdle||r.i_resistance||r.i_rescue||r.i_trigger;
  return(
    <div style={card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:13,color:PC.textSub,fontWeight:500}}>📅 {h.date}</span>
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
          <span style={{fontWeight:700,color:PC.text}}>{secToMMSS(h.total_time)}</span>
          <span style={passTag(h.total_time<=PASS_TIME)}>{h.total_time<=PASS_TIME?"PASS":"FAIL"}</span>
          {cb&&<Bdg {...cb}/>}
        </div>
      </div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        {COURSES.map(c=>{
          const val=Number(h.times[c.id]);
          const diff=val-c.defaultTime;
          const db=dBdg(diff);
          return(
            <span key={c.id} style={{fontSize:12}}>
              {c.icon} <span style={{color:PC.textSub}}>{secToDisplay(val)}</span>
              {db&&diff!==0&&<span style={{color:db.fg,marginLeft:2}}>({diff>0?`+${diff}`:diff}초)</span>}
            </span>
          );
        })}
      </div>
      {h.move_time>0&&<div style={{fontSize:12,color:PC.textSub,marginTop:6}}>이동시간 {secToDisplay(h.move_time)}</div>}
      {hasRatings&&(
        <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${PC.borderLight}`,display:"flex",gap:6,flexWrap:"wrap"}}>
          {r.condition&&<span style={{fontSize:12,background:PC.primaryLight,color:PC.primaryDark,borderRadius:20,padding:"3px 10px"}}>컨디션 {r.condition}/5</span>}
          {RATING_KEYS.map(({key,label})=>r[key]?<span key={key} style={{fontSize:12,background:PC.borderLight,color:PC.textSub,borderRadius:20,padding:"3px 10px"}}>{label} {r[key]}/5</span>:null)}
        </div>
      )}
      {h.memo&&<div style={{fontSize:12,color:PC.textSub,marginTop:6,paddingTop:6,borderTop:`1px solid ${PC.borderLight}`}}>📝 {h.memo}</div>}
    </div>
  );
}

function HistoryList({records}){
  const sorted=[...records].sort((a,b)=>b.id-a.id);
  const [cmp,setCmp]=useState(false);
  return(
    <div>
      {sorted.length>=2&&(
        <button onClick={()=>setCmp(v=>!v)} style={{padding:"7px 16px",fontSize:13,fontWeight:600,borderRadius:20,border:`1.5px solid ${PC.primary}`,background:cmp?PC.primary:PC.white,color:cmp?PC.white:PC.primary,cursor:"pointer",marginBottom:14}}>
          {cmp?"▼ 비교 닫기":"📊 기록 비교 보기"}
        </button>
      )}
      {cmp&&sorted.length>=2&&(
        <div style={{...card,overflowX:"auto",marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10,color:PC.text}}>전체 기록 비교</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr>
                <th style={{textAlign:"left",padding:"6px 8px",color:PC.textSub,fontWeight:600,borderBottom:`1px solid ${PC.border}`}}>코스</th>
                {sorted.map(h=><th key={h.id} style={{textAlign:"right",padding:"6px 8px",color:PC.textSub,fontWeight:600,borderBottom:`1px solid ${PC.border}`,whiteSpace:"nowrap"}}>{h.date}</th>)}
              </tr>
            </thead>
            <tbody>
              {COURSES.map(c=>(
                <tr key={c.id}>
                  <td style={{padding:"6px 8px",color:PC.textSub,whiteSpace:"nowrap"}}>{c.icon} {c.name}</td>
                  {sorted.map((h,i)=>{
                    const val=Number(h.times[c.id]);
                    const prev=sorted[i+1];
                    const cb=cBdg(prev?val-Number(prev.times[c.id]):null);
                    return <td key={h.id} style={{textAlign:"right",padding:"6px 8px",whiteSpace:"nowrap"}}>{secToDisplay(val)}{cb&&<span style={{marginLeft:4,fontSize:11,color:cb.fg}}>{cb.txt}</span>}</td>;
                  })}
                </tr>
              ))}
              <tr style={{borderTop:`1px solid ${PC.border}`}}>
                <td style={{padding:"8px",fontWeight:700,fontSize:13,color:PC.text}}>종목 합산</td>
                {sorted.map((h,i)=>{const cb=cBdg(sorted[i+1]?h.total-sorted[i+1].total:null);return <td key={h.id} style={{textAlign:"right",padding:"8px",fontWeight:600,whiteSpace:"nowrap"}}>{secToDisplay(h.total)}{cb&&<span style={{marginLeft:4,fontSize:11,color:cb.fg}}>{cb.txt}</span>}</td>;})}
              </tr>
              <tr>
                <td style={{padding:"6px 8px",fontSize:13,color:PC.textSub}}>이동시간</td>
                {sorted.map((h,i)=>{const cb=cBdg(sorted[i+1]?(h.move_time||0)-(sorted[i+1].move_time||0):null);return <td key={h.id} style={{textAlign:"right",padding:"6px 8px",whiteSpace:"nowrap",fontSize:13}}>{h.move_time>0?secToDisplay(h.move_time):"-"}{cb&&h.move_time>0&&<span style={{marginLeft:4,fontSize:11,color:cb.fg}}>{cb.txt}</span>}</td>;})}
              </tr>
              <tr style={{borderTop:`1px solid ${PC.border}`}}>
                <td style={{padding:"8px",fontWeight:700,fontSize:13,color:PC.text}}>총시간</td>
                {sorted.map((h,i)=>{const cb=cBdg(sorted[i+1]?h.total_time-sorted[i+1].total_time:null);return <td key={h.id} style={{textAlign:"right",padding:"8px",fontWeight:700,whiteSpace:"nowrap"}}><span style={{color:h.total_time<=PASS_TIME?PC.success:PC.danger}}>{secToMMSS(h.total_time)}</span>{cb&&<span style={{marginLeft:4,fontSize:11,color:cb.fg}}>{cb.txt}</span>}</td>;})}
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {sorted.map((h,i)=><RecordCard key={h.id} h={h} prev={sorted[i+1]||null}/>)}
    </div>
  );
}

export default function App(){
  const [screen,setScreen]=useState("login");
  const [user,setUser]=useState(null);
  const [loginName,setLoginName]=useState("");
  const [loginPw,setLoginPw]=useState("");
  const [loginPwC,setLoginPwC]=useState("");
  const [isNew,setIsNew]=useState(false);
  const [loginErr,setLoginErr]=useState("");
  const [loading,setLoading]=useState(false);

  const ci=useCourseInputs();
  const [totalM,setTotalM]=useState("");
  const [totalS,setTotalS]=useState("");
  const [ratings,setRatings]=useState({});
  const [memo,setMemo]=useState("");
  const [submitted,setSubmitted]=useState(null);
  const [recDate,setRecDate]=useState(todayISO);
  const [tab,setTab]=useState("record");

  const [myHist,setMyHist]=useState([]);
  const [allHist,setAllHist]=useState([]);
  const [adminStu,setAdminStu]=useState("");
  const [histLoad,setHistLoad]=useState(false);

  const allFilled=COURSES.every(c=>ci.has(c.id));
  const totalCourses=COURSES.reduce((s,c)=>s+ci.getSec(c.id),0);
  const totalSec=(Number(totalM)||0)*60+(Number(totalS)||0);
  const hasTotal=totalM!==""||totalS!=="";
  const moveTime=hasTotal?totalSec-totalCourses:null;
  const finalTime=hasTotal?totalSec:totalCourses;

  const stuNames=[...new Set(allHist.map(h=>h.student_name))];
  const activeStu=adminStu||stuNames[0]||"";

  async function handleLogin(){
    if(!loginName.trim()||!loginPw.trim())return;
    setLoading(true);setLoginErr("");
    if(loginPw===MASTER_PW){
      setUser({name:"원장님",isAdmin:true});
      const rows=await dbGet("records","order=created_at.desc");
      setAllHist(rows);setScreen("admin");setLoading(false);return;
    }
    const rows=await dbGet("records",`student_name=eq.${encodeURIComponent(loginName.trim())}&limit=1`);
    if(isNew){
      if(loginPw!==loginPwC){setLoginErr("비밀번호가 일치하지 않아요.");setLoading(false);return;}
      if(rows.length>0){setLoginErr("이미 존재하는 이름이에요.");setLoading(false);return;}
      setUser({name:loginName.trim(),password:loginPw});
      setMyHist([]);setScreen("record");setTab("record");
    }else{
      if(rows.length===0){setLoginErr("등록된 기록이 없어요. 신규 등록을 선택하세요.");setLoading(false);return;}
      if(rows[0].password!==loginPw){setLoginErr("비밀번호가 틀렸어요.");setLoading(false);return;}
      setUser({name:loginName.trim(),password:loginPw});
      const all=await dbGet("records",`student_name=eq.${encodeURIComponent(loginName.trim())}&order=created_at.desc`);
      setMyHist(all);setScreen("record");setTab("record");
    }
    setLoading(false);
  }

  async function handleSubmit(){
    if(!allFilled||!user)return;
    setLoading(true);
    const times={};COURSES.forEach(c=>{times[c.id]=ci.getSec(c.id);});
    const body={student_name:user.name,password:user.password,date:isoToKR(recDate),times,total:totalCourses,total_time:finalTime,move_time:moveTime||0,ratings,memo};
    await dbPost("records",body);
    setMyHist(h=>[{...body,id:Date.now()},...h]);
    setSubmitted({...body,id:Date.now()});setLoading(false);
  }

  function resetForm(){ci.reset();setTotalM("");setTotalS("");setRatings({});setMemo("");setSubmitted(null);setRecDate(todayISO());}

  const ratingItems=[
    {key:"condition",label:"오늘 나의 컨디션은?",isCondition:true},
    {key:"i_obstacle",label:"장애물달리기 체감 강도는?"},
    {key:"i_hurdle",label:"장대허들 체감 강도는?"},
    {key:"i_resistance",label:"밀고당기기 체감 강도는?"},
    {key:"i_rescue",label:"구조하기 체감 강도는?"},
    {key:"i_trigger",label:"방아쇠당기기 체감 강도는?"},
  ];
  const rBgs=["#e6f4ea","#e6f4ea","#fef7e0","#fce8e6","#fce8e6"];
  const rFgs=["#34a853","#34a853","#f29900","#ea4335","#c5221f"];
  const rLbls=["매우 좋음","좋음","보통","힘듦","매우 힘듦"];

  const LogoBox=({size=36,fs=18})=>(
    <div style={{width:size,height:size,background:PC.primary,borderRadius:size*0.28,display:"flex",alignItems:"center",justifyContent:"center",fontSize:fs}}>🚔</div>
  );

  // ── 로그인 ──
  if(screen==="login") return(
    <div style={{fontFamily:"'Apple SD Gothic Neo',sans-serif",minHeight:"100vh",background:PC.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem 1rem"}}>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:16}}><LogoBox size={72} fs={32}/></div>
          <h1 style={{fontSize:22,fontWeight:800,color:PC.text,margin:"0 0 6px"}}>{APP_TITLE}</h1>
          <p style={{fontSize:14,color:PC.textSub,margin:0}}>{APP_SUBTITLE}</p>
        </div>
        <div style={{...card,padding:"1.5rem"}}>
          <div style={{display:"flex",gap:0,marginBottom:20,background:PC.borderLight,borderRadius:10,padding:4}}>
            {[["기존 로그인",false],["신규 등록",true]].map(([l,nu])=>(
              <button key={l} onClick={()=>{setIsNew(nu);setLoginErr("");}} style={{flex:1,padding:"8px",fontSize:13,fontWeight:700,borderRadius:8,border:"none",background:isNew===nu?PC.white:"transparent",color:isNew===nu?PC.primary:PC.textSub,cursor:"pointer",boxShadow:isNew===nu?"0 1px 4px rgba(0,0,0,0.12)":"none"}}>{l}</button>
            ))}
          </div>
          <label style={lbl}>이름</label>
          <input style={{...inSt,marginBottom:12}} placeholder="이름 입력" value={loginName} onChange={e=>setLoginName(e.target.value)}/>
          <label style={lbl}>비밀번호</label>
          <input type="password" style={{...inSt,marginBottom:isNew?12:0}} placeholder="비밀번호 입력" value={loginPw} onChange={e=>setLoginPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
          {isNew&&<><label style={lbl}>비밀번호 확인</label><input type="password" style={inSt} placeholder="비밀번호 재입력" value={loginPwC} onChange={e=>setLoginPwC(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/></>}
          {loginErr&&<p style={{fontSize:13,color:PC.danger,marginTop:8,marginBottom:0}}>{loginErr}</p>}
        </div>
        <button onClick={handleLogin} disabled={loading} style={{...btnPrimary,marginTop:8}}>{loading?"확인 중...":isNew?"등록 후 시작":"로그인"}</button>
        <p style={{fontSize:12,color:PC.textLight,textAlign:"center",marginTop:16}}>원장님은 마스터 비밀번호로 로그인하세요</p>
      </div>
    </div>
  );

  // ── 관리자 ──
  if(screen==="admin") return(
    <div style={{fontFamily:"'Apple SD Gothic Neo',sans-serif",minHeight:"100vh",background:PC.bg,paddingBottom:"2rem"}}>
      <div style={hdrSt}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:"1rem",paddingBottom:"0.75rem"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <LogoBox/>
            <div><div style={{fontSize:15,fontWeight:800,color:PC.text}}>{APP_TITLE}</div><div style={{fontSize:12,color:PC.textSub}}>관리자 전체 기록</div></div>
          </div>
          <button onClick={()=>{setScreen("login");setLoginName("");setLoginPw("");}} style={{fontSize:13,color:PC.textSub,background:PC.white,border:`1px solid ${PC.border}`,borderRadius:8,padding:"6px 12px",cursor:"pointer"}}>로그아웃</button>
        </div>
      </div>
      <div style={{padding:"1.25rem"}}>
        <div style={{...card,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <span style={{fontSize:13,color:PC.textSub}}>총 <b style={{color:PC.text}}>{stuNames.length}명</b> · <b style={{color:PC.text}}>{allHist.length}개</b> 기록</span>
        </div>
        {stuNames.length===0?<div style={{textAlign:"center",color:PC.textSub,padding:"3rem 0"}}>아직 기록이 없습니다.</div>:(
          <>
            <label style={lbl}>학생 선택</label>
            <select value={activeStu} onChange={e=>setAdminStu(e.target.value)} style={{...inSt,marginBottom:14}}>
              {stuNames.map(n=><option key={n} value={n}>{n}</option>)}
            </select>
            <HistoryList records={allHist.filter(h=>h.student_name===activeStu)}/>
          </>
        )}
      </div>
    </div>
  );

  // ── 학생 ──
  return(
    <div style={{fontFamily:"'Apple SD Gothic Neo',sans-serif",minHeight:"100vh",background:PC.bg,paddingBottom:"2rem"}}>
      <div style={hdrSt}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:"1rem",paddingBottom:"0.5rem"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <LogoBox/>
            <div><div style={{fontSize:15,fontWeight:800,color:PC.text}}>{APP_TITLE}</div><div style={{fontSize:12,color:PC.textSub}}>{user?.name}님</div></div>
          </div>
          <button onClick={()=>{setScreen("login");setLoginName("");setLoginPw("");resetForm();}} style={{fontSize:13,color:PC.textSub,background:PC.white,border:`1px solid ${PC.border}`,borderRadius:8,padding:"6px 12px",cursor:"pointer"}}>로그아웃</button>
        </div>
        <div style={{display:"flex",gap:0,borderBottom:`1px solid ${PC.border}`}}>
          {[["record","기록입력"],["history","내 기록"]].map(([k,v])=>(
            <button key={k} style={{padding:"10px 20px",fontSize:14,fontWeight:tab===k?700:400,border:"none",background:"none",cursor:"pointer",color:tab===k?PC.primary:PC.textSub,borderBottom:tab===k?`2px solid ${PC.primary}`:"2px solid transparent",marginBottom:-1}}
              onClick={()=>{setTab(k);if(k==="history"){dbGet("records",`student_name=eq.${encodeURIComponent(user.name)}&order=created_at.desc`).then(r=>setMyHist(r));}}}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"1.25rem"}}>
        {tab==="record"&&(!submitted?(
          <>
            <div style={{...card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:14,fontWeight:600,color:PC.text}}>📅 측정 날짜</span>
              <input type="date" value={recDate} onChange={e=>setRecDate(e.target.value)} style={{border:`1px solid ${PC.border}`,borderRadius:8,padding:"7px 10px",fontSize:14,color:PC.text,background:PC.white,cursor:"pointer"}}/>
            </div>

            {COURSES.map(c=>{
              const val=ci.getSec(c.id);
              const diff=ci.has(c.id)?val-c.defaultTime:null;
              const db=dBdg(diff);
              return(
                <div key={c.id} style={card}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                    <span style={{fontWeight:700,fontSize:14,color:PC.text}}>{c.icon} {c.name}</span>
                    <span style={{fontSize:12,color:PC.textSub,background:PC.borderLight,borderRadius:20,padding:"3px 10px"}}>기준 {secToDisplay(c.defaultTime)}</span>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                    <MinSecInput mVal={ci.v[c.id+"_m"]} sVal={ci.v[c.id+"_s"]} onM={e=>ci.setM(c.id,e.target.value)} onS={e=>ci.setS(c.id,e.target.value)}/>
                    {ci.has(c.id)&&<span style={{fontSize:13,color:PC.textSub}}>{secToDisplay(val)}</span>}
                    {db&&<Bdg {...db}/>}
                  </div>
                </div>
              );
            })}

            <div style={{...card,display:"flex",justifyContent:"space-between",alignItems:"center",background:PC.primaryLight,border:`1px solid ${PC.primary}30`}}>
              <span style={{fontWeight:700,fontSize:14,color:PC.primaryDark}}>종목 합산</span>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                {allFilled&&<span style={{fontSize:13,color:PC.primaryDark}}>{secToDisplay(totalCourses)}</span>}
                <span style={{fontSize:20,fontWeight:800,color:PC.primaryDark}}>{allFilled?secToMMSS(totalCourses):"--:--"}</span>
              </div>
            </div>

            <div style={card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontWeight:700,fontSize:14,color:PC.text}}>실제 측정 총시간</span>
                <MinSecInput mVal={totalM} sVal={totalS} onM={e=>setTotalM(e.target.value)} onS={e=>setTotalS(e.target.value)}/>
              </div>
              {hasTotal&&allFilled&&(
                <div style={{marginTop:12,background:PC.borderLight,borderRadius:8,padding:"10px 14px",display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:13,color:PC.textSub}}>이동시간</span>
                  <span style={{fontWeight:700,fontSize:14,color:moveTime>=0?PC.text:PC.danger}}>{moveTime>=0?secToDisplay(moveTime):"⚠ 종목합보다 짧음"}</span>
                </div>
              )}
            </div>

            <div style={card}>
              <div style={{fontSize:14,fontWeight:700,color:PC.text,marginBottom:16}}>측정 시 특이사항</div>
              {ratingItems.map(item=>(
                <div key={item.key} style={{marginBottom:16}}>
                  <div style={{fontSize:13,color:PC.textSub,marginBottom:8,fontWeight:500}}>{item.label}</div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    {[1,2,3,4,5].map(n=>{const active=ratings[item.key]===n;return(
                      <button key={n} onClick={()=>setRatings(p=>({...p,[item.key]:active?null:n}))} style={{width:44,height:44,borderRadius:10,border:active?"none":`1px solid ${PC.border}`,background:active?rBgs[n-1]:PC.white,color:active?rFgs[n-1]:PC.textSub,fontSize:14,fontWeight:active?700:400,cursor:"pointer"}}>{n}</button>
                    );})}
                    {ratings[item.key]&&<span style={{fontSize:12,color:PC.textSub,marginLeft:4}}>{rLbls[ratings[item.key]-1]}</span>}
                  </div>
                </div>
              ))}
              <label style={lbl}>기타 특이사항</label>
              <textarea rows={3} placeholder="자유롭게 입력하세요" value={memo} onChange={e=>setMemo(e.target.value)} style={{...inSt,resize:"vertical",fontSize:13}}/>
            </div>

            <button onClick={handleSubmit} disabled={!allFilled||loading} style={btnPrimary}>{loading?"저장 중...":"기록 저장"}</button>
          </>
        ):(()=>{
          const pass=submitted.total_time<=PASS_TIME;
          const prev=myHist[1]||null;
          const tcb=cBdg(prev?submitted.total_time-prev.total_time:null);
          return(
            <div>
              <div style={{...card,textAlign:"center",background:pass?PC.successLight:PC.dangerLight,border:`1px solid ${pass?PC.success:PC.danger}30`}}>
                <div style={{fontSize:14,color:PC.textSub,marginBottom:6}}>{submitted.student_name}님 · {submitted.date}</div>
                <div style={{fontSize:44,fontWeight:800,letterSpacing:-1,marginBottom:4,color:pass?PC.success:PC.danger}}>{secToMMSS(submitted.total_time)}</div>
                <div style={{fontSize:13,color:PC.textSub,marginBottom:6}}>{secToDisplay(submitted.total_time)}</div>
                {submitted.move_time>0&&<div style={{display:"flex",justifyContent:"center",gap:16,fontSize:12,color:PC.textSub,marginBottom:12}}><span>종목 합산 {secToDisplay(submitted.total)}</span><span>이동시간 {secToDisplay(submitted.move_time)}</span></div>}
                <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
                  <span style={passTag(pass)}>{pass?"✓ PASS":"✗ FAIL"} — {pass?`기준보다 ${PASS_TIME-submitted.total_time}초 빠름`:`기준보다 ${submitted.total_time-PASS_TIME}초 초과`}</span>
                  {tcb&&<Bdg {...tcb}/>}
                </div>
              </div>
              <div style={{fontSize:11,fontWeight:700,color:PC.textSub,margin:"16px 0 8px",textTransform:"uppercase",letterSpacing:"0.6px"}}>코스별 결과</div>
              {COURSES.map(c=>{
                const val=Number(submitted.times[c.id]);
                const diff=val-c.defaultTime;
                const db=dBdg(diff);
                const cb=cBdg(prev?val-Number(prev.times[c.id]):null);
                return(
                  <div key={c.id} style={{...card,padding:"0.85rem 1.25rem"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:14,color:PC.text}}>{c.icon} {c.name}</span>
                      <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
                        <span style={{fontSize:14,fontWeight:700,color:PC.text}}>{secToDisplay(val)}</span>
                        {db&&<Bdg {...db}/>}
                        {cb&&<Bdg {...cb}/>}
                      </div>
                    </div>
                    <div style={{marginTop:8,height:5,borderRadius:3,background:PC.borderLight,overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:3,width:`${Math.min(100,(c.defaultTime/val)*100)}%`,background:diff>0?PC.danger:PC.success,transition:"width 0.4s"}}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:PC.textSub,marginTop:3}}>
                      <span>기준 {secToDisplay(c.defaultTime)}</span>
                      <span>{diff===0?"기준과 동일":diff>0?`${diff}초 느림`:`${Math.abs(diff)}초 빠름`}</span>
                    </div>
                  </div>
                );
              })}
              <button onClick={resetForm} style={{...btnPrimary,marginTop:4}}>새 기록 입력</button>
            </div>
          );
        })())}

        {tab==="history"&&(
          histLoad?<div style={{textAlign:"center",padding:"3rem 0",color:PC.textSub}}>불러오는 중...</div>:
          myHist.length===0?<div style={{textAlign:"center",padding:"3rem 0",color:PC.textSub,fontSize:14}}>아직 저장된 기록이 없습니다.</div>:
          <HistoryList records={myHist}/>
        )}
      </div>
    </div>
  );
}