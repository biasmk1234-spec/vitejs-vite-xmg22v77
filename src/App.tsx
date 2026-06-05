import { useState } from "react";

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

const INOUT_COURSES = [
  { id:"hurdle",     name:"장대허들",     icon:"🚧", defaultTime:25 },
  { id:"resistance", name:"밀고당기기",   icon:"💪", defaultTime:30 },
  { id:"rescue",     name:"구조하기",     icon:"🤝", defaultTime:30 },
  { id:"trigger",    name:"방아쇠당기기", icon:"🎯", defaultTime:25 },
];

const PASS_TIME_SEC = 280;
function pad(n:number){ return String(n).padStart(2,"0"); }
function secToMMSS(s:number){ const n=Math.round(s); return `${pad(Math.floor(n/60))}:${pad(n%60)}`; }
function secToDisplay(s:number){ const n=Math.round(s); if(n<=0) return "0초"; return n>=60?`${Math.floor(n/60)}분 ${pad(n%60)}초`:`${n}초`; }
function todayISO(){ return new Date().toISOString().split("T")[0]; }
function isoToKR(iso:string){ if(!iso)return""; const[y,m,d]=iso.split("-"); return `${y}.${m}.${d}`; }

const H:Record<string,string> = { "Content-Type":"application/json", apikey:SUPABASE_KEY, Authorization:`Bearer ${SUPABASE_KEY}` };
async function dbGet(t:string,q=""){ const r=await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=*&${q}`,{headers:{...H,Accept:"application/json"}}); return r.json(); }
async function dbPost(t:string,b:any){ const r=await fetch(`${SUPABASE_URL}/rest/v1/${t}`,{method:"POST",headers:{...H,Prefer:"return=representation"},body:JSON.stringify(b)}); return r.json(); }

// 분/초 입력 컴포넌트
function MSInput({mVal,sVal,onM,onS,placeholder=""}:{mVal:string,sVal:string,onM:any,onS:any,placeholder?:string}){
  const st:any={width:48,borderRadius:8,border:`1px solid ${PC.border}`,padding:"7px 4px",fontSize:13,color:PC.text,textAlign:"center",background:PC.white};
  return(
    <div style={{display:"flex",gap:3,alignItems:"center"}}>
      <input type="number" min={0} placeholder="분" value={mVal} onChange={onM} style={st}/>
      <span style={{fontSize:12,color:PC.textSub}}>분</span>
      <input type="number" min={0} max={59} placeholder="초" value={sVal} onChange={onS} style={st}/>
      <span style={{fontSize:12,color:PC.textSub}}>초</span>
    </div>
  );
}

function toSec(m:string,s:string){ return (Number(m)||0)*60+(Number(s)||0); }
function hasMSValue(m:string,s:string){ return m!==""||s!==""; }

function dBdg(diff:number|null){
  if(diff===null)return null;
  if(diff>0)return{bg:PC.dangerLight,fg:PC.danger,txt:`+${diff}초 초과`};
  if(diff<0)return{bg:PC.successLight,fg:PC.success,txt:`${Math.abs(diff)}초 단축`};
  return{bg:PC.borderLight,fg:PC.textSub,txt:"기준"};
}
function cBdg(d:number|null){
  if(d===null)return null;
  if(d<0)return{bg:PC.successLight,fg:PC.success,txt:`▼${Math.abs(d)}초`};
  if(d>0)return{bg:PC.dangerLight,fg:PC.danger,txt:`▲${d}초`};
  return{bg:PC.borderLight,fg:PC.textSub,txt:"→"};
}

function Bdg({bg,fg,txt}:{bg:string,fg:string,txt:string}){
  return <span style={{background:bg,color:fg,borderRadius:20,padding:"3px 9px",fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>{txt}</span>;
}

const card:any={background:PC.white,border:`1px solid ${PC.border}`,borderRadius:12,padding:"1rem 1.25rem",marginBottom:10,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"};
const inSt:any={borderRadius:8,border:`1px solid ${PC.border}`,padding:"10px 12px",fontSize:14,color:PC.text,background:PC.white,width:"100%",boxSizing:"border-box"};
const passTag=(p:boolean):any=>({background:p?PC.successLight:PC.dangerLight,color:p?PC.success:PC.danger,borderRadius:20,padding:"6px 18px",fontSize:13,fontWeight:700});
const btnPrimary:any={background:PC.primary,color:PC.white,border:"none",borderRadius:10,padding:"12px",fontSize:15,fontWeight:700,cursor:"pointer",width:"100%"};
const hdrSt:any={background:PC.white,borderBottom:`1px solid ${PC.border}`,padding:"0 1.25rem",position:"sticky",top:0,zIndex:10};

const RATING_KEYS=[
  {key:"i_obstacle",label:"장애물"},
  {key:"i_hurdle",label:"장대허들"},
  {key:"i_resistance",label:"밀고당기기"},
  {key:"i_rescue",label:"구조하기"},
  {key:"i_trigger",label:"방아쇠"},
];

function RecordCard({h,prev}:{h:any,prev:any}){
  const chg=prev?h.total_time-prev.total_time:null;
  const cb=cBdg(chg);
  const r=h.ratings||{};
  const hasR=r.condition||r.i_obstacle||r.i_hurdle||r.i_resistance||r.i_rescue||r.i_trigger;
  const obs=h.obstacle_laps||[];
  return(
    <div style={card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:13,color:PC.textSub,fontWeight:500}}>📅 {h.date}</span>
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
          <span style={{fontWeight:700,color:PC.text}}>{secToMMSS(h.total_time)}</span>
          <span style={passTag(h.total_time<=PASS_TIME_SEC)}>{h.total_time<=PASS_TIME_SEC?"PASS":"FAIL"}</span>
          {cb&&<Bdg {...cb}/>}
        </div>
      </div>

      {/* 장애물 랩 또는 times.obstacle */}
      {(() => {
        const obs:number[]=h.obstacle_laps||[];
        const obsTotalFromTimes=h.times?.obstacle||0;
        if(obs.length>0&&obs[obs.length-1]>0){
          return(
            <div style={{marginBottom:8}}>
              <div style={{fontSize:12,fontWeight:600,color:PC.textSub,marginBottom:4}}>🏃 장애물달리기</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {obs.map((lap:number,i:number)=>{
                  const prev_lap=i>0?obs[i-1]:0;
                  const interval=lap-prev_lap;
                  return(
                    <span key={i} style={{fontSize:11,background:PC.borderLight,borderRadius:6,padding:"2px 7px",color:PC.textSub}}>
                      {i+1}R {secToDisplay(interval)} <span style={{color:PC.textLight}}>({secToDisplay(lap)})</span>
                    </span>
                  );
                })}
              </div>
            </div>
          );
        } else if(obsTotalFromTimes>0){
          const diff=obsTotalFromTimes-160;
          const db=dBdg(diff);
          return(
            <span style={{fontSize:12,display:"inline-flex",alignItems:"center",gap:4,marginBottom:6}}>
              🏃 <span style={{color:PC.textSub}}>{secToDisplay(obsTotalFromTimes)}</span>
              {db&&diff!==0&&<span style={{color:db.fg}}>({diff>0?`+${diff}`:diff}초)</span>}
            </span>
          );
        }
        return null;
      })()}

      {/* IN/OUT 코스별 소요시간 — 신규/구형 데이터 모두 지원 */}
      {(() => {
        const timeData = h.inout_times || h.times || {};
        const hasData = INOUT_COURSES.some(c => timeData[c.id]);
        if (!hasData) return null;
        return (
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:6}}>
            {INOUT_COURSES.map(c=>{
              const t=timeData[c.id];
              if(!t)return null;
              const diff=t-c.defaultTime;
              const db=dBdg(diff);
              return(
                <span key={c.id} style={{fontSize:12,display:"flex",alignItems:"center",gap:4}}>
                  {c.icon} <span style={{color:PC.textSub}}>{secToDisplay(t)}</span>
                  {db&&diff!==0&&<span style={{color:db.fg}}>({diff>0?`+${diff}`:diff}초)</span>}
                </span>
              );
            })}
          </div>
        );
      })()}

      {h.move_time>0&&<div style={{fontSize:12,color:PC.textSub,marginTop:4}}>이동시간 {secToDisplay(h.move_time)}</div>}
      {hasR&&(
        <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${PC.borderLight}`,display:"flex",gap:6,flexWrap:"wrap"}}>
          {r.condition&&<span style={{fontSize:12,background:PC.primaryLight,color:PC.primaryDark,borderRadius:20,padding:"3px 10px"}}>컨디션 {r.condition}/5</span>}
          {RATING_KEYS.map(({key,label})=>r[key]?<span key={key} style={{fontSize:12,background:PC.borderLight,color:PC.textSub,borderRadius:20,padding:"3px 10px"}}>{label} {r[key]}/5</span>:null)}
        </div>
      )}
      {h.memo&&<div style={{fontSize:12,color:PC.textSub,marginTop:6,paddingTop:6,borderTop:`1px solid ${PC.borderLight}`}}>📝 {h.memo}</div>}
    </div>
  );
}

function HistoryList({records}:{records:any[]}){
  const sorted=[...records].sort((a,b)=>{
    const da=a.date?a.date.replace(/\./g,"-"):"";
    const db2=b.date?b.date.replace(/\./g,"-"):"";
    if(db2>da)return 1;
    if(db2<da)return -1;
    return b.id-a.id;
  });
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
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr>
                <th style={{textAlign:"left",padding:"6px 8px",color:PC.textSub,fontWeight:600,borderBottom:`1px solid ${PC.border}`}}>항목</th>
                {sorted.map(h=><th key={h.id} style={{textAlign:"right",padding:"6px 8px",color:PC.textSub,fontWeight:600,borderBottom:`1px solid ${PC.border}`,whiteSpace:"nowrap"}}>{h.date}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{padding:"6px 8px",color:PC.textSub,whiteSpace:"nowrap"}}>🏃 장애물(총)</td>
                {sorted.map((h,i)=>{
                  const val=h.obstacle_laps?.at(-1)||h.times?.obstacle||0;
                  const prev=sorted[i+1];
                  const prevVal=prev?(prev.obstacle_laps?.at(-1)||prev.times?.obstacle||0):null;
                  const cb=cBdg(prevVal!==null?val-prevVal:null);
                  return <td key={h.id} style={{textAlign:"right",padding:"6px 8px",whiteSpace:"nowrap"}}>{val?secToDisplay(val):"-"}{cb&&val?<span style={{marginLeft:3,fontSize:11,color:cb.fg}}>{cb.txt}</span>:null}</td>;
                })}
              </tr>
              {INOUT_COURSES.map(c=>(
                <tr key={c.id}>
                  <td style={{padding:"6px 8px",color:PC.textSub,whiteSpace:"nowrap"}}>{c.icon} {c.name}</td>
                  {sorted.map((h,i)=>{
                    const val=(h.inout_times?.[c.id]||h.times?.[c.id])||0;
                    const prev=sorted[i+1];
                    const prevVal=prev?(prev.inout_times?.[c.id]||prev.times?.[c.id])||0:null;
                    const cb=cBdg(prevVal!==null?val-prevVal:null);
                    return <td key={h.id} style={{textAlign:"right",padding:"6px 8px",whiteSpace:"nowrap"}}>{val?secToDisplay(val):"-"}{cb&&val?<span style={{marginLeft:3,fontSize:11,color:cb.fg}}>{cb.txt}</span>:null}</td>;
                  })}
                </tr>
              ))}
              <tr style={{borderTop:`1px solid ${PC.border}`}}>
                <td style={{padding:"8px",fontWeight:700,fontSize:13}}>이동시간</td>
                {sorted.map((h,i)=>{ const cb=cBdg(sorted[i+1]?(h.move_time||0)-(sorted[i+1].move_time||0):null); return <td key={h.id} style={{textAlign:"right",padding:"8px",whiteSpace:"nowrap"}}>{h.move_time>0?secToDisplay(h.move_time):"-"}{cb&&h.move_time>0?<span style={{marginLeft:3,fontSize:11,color:cb.fg}}>{cb.txt}</span>:null}</td>; })}
              </tr>
              <tr style={{borderTop:`1px solid ${PC.border}`}}>
                <td style={{padding:"8px",fontWeight:700,fontSize:13,color:PC.text}}>총시간</td>
                {sorted.map((h,i)=>{ const cb=cBdg(sorted[i+1]?h.total_time-sorted[i+1].total_time:null); return <td key={h.id} style={{textAlign:"right",padding:"8px",fontWeight:700,whiteSpace:"nowrap"}}><span style={{color:h.total_time<=PASS_TIME_SEC?PC.success:PC.danger}}>{secToMMSS(h.total_time)}</span>{cb&&<span style={{marginLeft:3,fontSize:11,color:cb.fg}}>{cb.txt}</span>}</td>; })}
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
  const [user,setUser]=useState<any>(null);
  const [loginName,setLoginName]=useState("");
  const [loginPw,setLoginPw]=useState("");
  const [loginPwC,setLoginPwC]=useState("");
  const [isNew,setIsNew]=useState(false);
  const [loginErr,setLoginErr]=useState("");
  const [loading,setLoading]=useState(false);
  const [tab,setTab]=useState("record");
  const [submitted,setSubmitted]=useState<any>(null);
  const [recDate,setRecDate]=useState(todayISO());
  const [myHist,setMyHist]=useState<any[]>([]);
  const [allHist,setAllHist]=useState<any[]>([]);
  const [adminStu,setAdminStu]=useState("");

  // 장애물 6랩 누적 시간
  const [laps,setLaps]=useState<{m:string,s:string}[]>(Array(6).fill(null).map(()=>({m:"",s:""})));
  const updateLap=(i:number,field:"m"|"s",v:string)=>setLaps(prev=>prev.map((l,idx)=>idx===i?{...l,[field]:v}:l));
  const lapSecs=laps.map(l=>toSec(l.m,l.s));
  const obstacleTotalSec=lapSecs[5]||0; // 6번째 랩 누적 = 총시간

  // IN/OUT 코스
  const [inout,setInout]=useState<Record<string,{inM:string,inS:string,outM:string,outS:string}>>(
    Object.fromEntries(INOUT_COURSES.map(c=>[c.id,{inM:"",inS:"",outM:"",outS:""}]))
  );
  const updateInout=(id:string,field:string,v:string)=>setInout(p=>({...p,[id]:{...p[id],[field]:v}}));
  const getInoutSec=(id:string)=>{
    const {inM,inS,outM,outS}=inout[id];
    const inSec=toSec(inM,inS); const outSec=toSec(outM,outS);
    return outSec>inSec?outSec-inSec:0;
  };
  const hasInout=(id:string)=>{const o=inout[id]; return hasMSValue(o.inM,o.inS)||hasMSValue(o.outM,o.outS);};

  // 코스별 합산
  const inoutSum=INOUT_COURSES.reduce((s,c)=>s+getInoutSec(c.id),0);
  const coursesSum=obstacleTotalSec+inoutSum;

  // 구간별 이동시간 계산
  const getMoveTimes=()=>{
    const moves:number[]=[];
    // 장애물 OUT → 장대허들 IN
    const obsOut=obstacleTotalSec;
    const hurdleIn=toSec(inout["hurdle"].inM,inout["hurdle"].inS);
    if(obsOut>0&&hurdleIn>0) moves.push(Math.max(0,hurdleIn-obsOut));
    // 장대허들 OUT → 밀고당기기 IN
    const hurdleOut=toSec(inout["hurdle"].outM,inout["hurdle"].outS);
    const resistIn=toSec(inout["resistance"].inM,inout["resistance"].inS);
    if(hurdleOut>0&&resistIn>0) moves.push(Math.max(0,resistIn-hurdleOut));
    // 밀고당기기 OUT → 구조하기 IN
    const resistOut=toSec(inout["resistance"].outM,inout["resistance"].outS);
    const rescueIn=toSec(inout["rescue"].inM,inout["rescue"].inS);
    if(resistOut>0&&rescueIn>0) moves.push(Math.max(0,rescueIn-resistOut));
    // 구조하기 OUT → 방아쇠 IN
    const rescueOut=toSec(inout["rescue"].outM,inout["rescue"].outS);
    const triggerIn=toSec(inout["trigger"].inM,inout["trigger"].inS);
    if(rescueOut>0&&triggerIn>0) moves.push(Math.max(0,triggerIn-rescueOut));
    return moves;
  };
  const moveTimes=getMoveTimes();
  const totalMoveTime=moveTimes.reduce((s,v)=>s+v,0);

  // 총시간 = 마지막 코스 OUT 시간
  const triggerOut=toSec(inout["trigger"].outM,inout["trigger"].outS);
  const finalTime=triggerOut>0?triggerOut:coursesSum+totalMoveTime;
  const moveTime=totalMoveTime>0?totalMoveTime:null;

  const allFilled=lapSecs[5]>0&&INOUT_COURSES.every(c=>getInoutSec(c.id)>0);

  // 특이사항
  const [ratings,setRatings]=useState<Record<string,number|null>>({});
  const [memo,setMemo]=useState("");

  const ratingItems=[
    {key:"condition",label:"오늘 나의 컨디션은?"},
    {key:"i_obstacle",label:"장애물달리기 체감 강도는?"},
    {key:"i_hurdle",label:"장대허들 체감 강도는?"},
    {key:"i_resistance",label:"밀고당기기 체감 강도는?"},
    {key:"i_rescue",label:"구조하기 체감 강도는?"},
    {key:"i_trigger",label:"방아쇠당기기 체감 강도는?"},
  ];
  const rBgs=["#e6f4ea","#e6f4ea","#fef7e0","#fce8e6","#fce8e6"];
  const rFgs=["#34a853","#34a853","#f29900","#ea4335","#c5221f"];
  const rLbls=["매우 힘듦","힘듦","보통","좋음","매우 좋음"];

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
    const times:Record<string,number>={obstacle:obstacleTotalSec};
    INOUT_COURSES.forEach(c=>{times[c.id]=getInoutSec(c.id);});
    const body={
      student_name:user.name, password:user.password,
      date:isoToKR(recDate),
      obstacle_laps:lapSecs,
      inout_times:times,
      times,
      total:coursesSum, total_time:finalTime,
      move_time:moveTime||0,
      ratings, memo,
    };
    await dbPost("records",body);
    const newEntry={...body,id:Date.now()};
    setMyHist(h=>[newEntry,...h]);
    setSubmitted(newEntry);
    setLoading(false);
  }

  function resetForm(){
    setLaps(Array(6).fill(null).map(()=>({m:"",s:""})));
    setInout(Object.fromEntries(INOUT_COURSES.map(c=>[c.id,{inM:"",inS:"",outM:"",outS:""}])));
    setRatings({});setMemo("");
    setSubmitted(null);
    setRecDate(todayISO());
  }

  const stuNames=[...new Set(allHist.map((h:any)=>h.student_name))];
  const activeStu=adminStu||stuNames[0]||"";

  const LogoBox=({size=36,fs=18}:{size?:number,fs?:number})=>(
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
              <button key={String(l)} onClick={()=>{setIsNew(nu as boolean);setLoginErr("");}} style={{flex:1,padding:"8px",fontSize:13,fontWeight:700,borderRadius:8,border:"none",background:isNew===nu?PC.white:"transparent",color:isNew===nu?PC.primary:PC.textSub,cursor:"pointer",boxShadow:isNew===nu?"0 1px 4px rgba(0,0,0,0.12)":"none"}}>{l as string}</button>
            ))}
          </div>
          <label style={{fontSize:13,color:PC.textSub,marginBottom:4,display:"block",fontWeight:500}}>이름</label>
          <input style={{...inSt,marginBottom:12}} placeholder="이름 입력" value={loginName} onChange={e=>setLoginName(e.target.value)}/>
          <label style={{fontSize:13,color:PC.textSub,marginBottom:4,display:"block",fontWeight:500}}>비밀번호</label>
          <input type="password" style={{...inSt,marginBottom:isNew?12:0}} placeholder="비밀번호 입력" value={loginPw} onChange={e=>setLoginPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
          {isNew&&<><label style={{fontSize:13,color:PC.textSub,marginBottom:4,display:"block",fontWeight:500}}>비밀번호 확인</label><input type="password" style={inSt} placeholder="비밀번호 재입력" value={loginPwC} onChange={e=>setLoginPwC(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/></>}
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
            <select value={activeStu} onChange={e=>setAdminStu(e.target.value)} style={{...inSt,marginBottom:14}}>
              {stuNames.map(n=><option key={n as string} value={n as string}>{n as string}</option>)}
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
              onClick={()=>{setTab(k);if(k==="history"){dbGet("records",`student_name=eq.${encodeURIComponent(user.name)}&order=created_at.desc`).then((r:any[])=>setMyHist(r));}}}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"1.25rem"}}>
        {tab==="record"&&(!submitted?(
          <>
            {/* 날짜 */}
            <div style={{...card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:14,fontWeight:600,color:PC.text}}>📅 측정 날짜</span>
              <input type="date" value={recDate} onChange={e=>setRecDate(e.target.value)} style={{border:`1px solid ${PC.border}`,borderRadius:8,padding:"7px 10px",fontSize:14,color:PC.text,background:PC.white,cursor:"pointer"}}/>
            </div>

            {/* 장애물달리기 6랩 */}
            <div style={card}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                <span style={{fontWeight:700,fontSize:14,color:PC.text}}>🏃 장애물달리기</span>
                <span style={{fontSize:12,color:PC.textSub,background:PC.borderLight,borderRadius:20,padding:"3px 10px"}}>기준 2분 40초</span>
              </div>
              <div style={{fontSize:12,color:PC.textSub,marginBottom:10}}>각 바퀴 통과 시 누적 시간을 입력하세요</div>
              {laps.map((l,i)=>{
                const cumSec=lapSecs[i];
                const prevSec=i>0?lapSecs[i-1]:0;
                const interval=cumSec>0&&(i===0||prevSec>0)?cumSec-prevSec:null;
                return(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <span style={{fontSize:13,fontWeight:600,color:PC.primary,width:28,flexShrink:0}}>{i+1}R</span>
                    <MSInput mVal={l.m} sVal={l.s} onM={(e:any)=>updateLap(i,"m",e.target.value)} onS={(e:any)=>updateLap(i,"s",e.target.value)}/>
                    {cumSec>0&&<span style={{fontSize:12,color:PC.textSub,whiteSpace:"nowrap"}}>{secToDisplay(cumSec)}</span>}
                    {interval!==null&&<span style={{fontSize:12,background:PC.primaryLight,color:PC.primaryDark,borderRadius:20,padding:"2px 8px",whiteSpace:"nowrap"}}>구간 {secToDisplay(interval)}</span>}
                  </div>
                );
              })}
              {obstacleTotalSec>0&&(
                <div style={{marginTop:8,background:PC.borderLight,borderRadius:8,padding:"8px 12px",display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:13,color:PC.textSub}}>장애물 총시간</span>
                  <span style={{fontWeight:700,fontSize:14,color:PC.text}}>{secToDisplay(obstacleTotalSec)}</span>
                </div>
              )}
            </div>

            {/* IN/OUT 코스 */}
            {INOUT_COURSES.map(c=>{
              const sec=getInoutSec(c.id);
              const diff=sec>0?sec-c.defaultTime:null;
              const db=dBdg(diff);
              const io=inout[c.id];
              const inSec=toSec(io.inM,io.inS);
              const outSec=toSec(io.outM,io.outS);
              return(
                <div key={c.id} style={card}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                    <span style={{fontWeight:700,fontSize:14,color:PC.text}}>{c.icon} {c.name}</span>
                    <span style={{fontSize:12,color:PC.textSub,background:PC.borderLight,borderRadius:20,padding:"3px 10px"}}>기준 {secToDisplay(c.defaultTime)}</span>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:13,color:PC.textSub,width:32,flexShrink:0}}>IN</span>
                      <MSInput mVal={io.inM} sVal={io.inS} onM={(e:any)=>updateInout(c.id,"inM",e.target.value)} onS={(e:any)=>updateInout(c.id,"inS",e.target.value)}/>
                      {inSec>0&&<span style={{fontSize:12,color:PC.textSub}}>{secToDisplay(inSec)}</span>}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:13,color:PC.textSub,width:32,flexShrink:0}}>OUT</span>
                      <MSInput mVal={io.outM} sVal={io.outS} onM={(e:any)=>updateInout(c.id,"outM",e.target.value)} onS={(e:any)=>updateInout(c.id,"outS",e.target.value)}/>
                      {outSec>0&&<span style={{fontSize:12,color:PC.textSub}}>{secToDisplay(outSec)}</span>}
                    </div>
                  </div>
                  {sec>0&&(
                    <div style={{marginTop:8,background:PC.borderLight,borderRadius:8,padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:13,color:PC.textSub}}>소요시간</span>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <span style={{fontWeight:700,fontSize:14}}>{secToDisplay(sec)}</span>
                        {db&&<Bdg {...db}/>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* 종목 합산 + 이동시간 + 총시간 */}
            <div style={card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span style={{fontWeight:700,fontSize:14,color:PC.text}}>종목 합산</span>
                <span style={{fontSize:18,fontWeight:800,color:PC.primaryDark}}>{coursesSum>0?secToDisplay(coursesSum):"--"}</span>
              </div>
              {moveTimes.length>0&&(
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:12,color:PC.textSub,marginBottom:6}}>구간별 이동시간</div>
                  {moveTimes.map((t,i)=>{
                    const labels=["장애물→장대허들","장대허들→밀고당기기","밀고당기기→구조하기","구조하기→방아쇠"];
                    return(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,color:PC.textSub,marginBottom:4}}>
                        <span>{labels[i]}</span>
                        <span style={{fontWeight:500,color:PC.text}}>{secToDisplay(t)}</span>
                      </div>
                    );
                  })}
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:600,marginTop:6,paddingTop:6,borderTop:`1px solid ${PC.borderLight}`}}>
                    <span style={{color:PC.textSub}}>이동시간 합계</span>
                    <span>{secToDisplay(totalMoveTime)}</span>
                  </div>
                </div>
              )}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:10,borderTop:`1px solid ${PC.borderLight}`,background:PC.primaryLight,margin:"0 -1.25rem -1rem",padding:"10px 1.25rem 1rem",borderRadius:"0 0 12px 12px"}}>
                <span style={{fontWeight:700,fontSize:14,color:PC.primaryDark}}>총시간 (방아쇠 OUT)</span>
                <span style={{fontSize:20,fontWeight:800,color:PC.primaryDark}}>{finalTime>0?secToMMSS(finalTime):"--:--"}</span>
              </div>
            </div>

            {/* 특이사항 */}
            <div style={card}>
              <div style={{fontSize:14,fontWeight:700,color:PC.text,marginBottom:16}}>측정 시 특이사항</div>
              {ratingItems.map(item=>(
                <div key={item.key} style={{marginBottom:16}}>
                  <div style={{fontSize:13,color:PC.textSub,marginBottom:8,fontWeight:500}}>{item.label}</div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    {[1,2,3,4,5].map(n=>{const active=ratings[item.key]===n;return(
                      <button key={n} onClick={()=>setRatings(p=>({...p,[item.key]:active?null:n}))} style={{width:44,height:44,borderRadius:10,border:active?"none":`1px solid ${PC.border}`,background:active?rBgs[n-1]:PC.white,color:active?rFgs[n-1]:PC.textSub,fontSize:14,fontWeight:active?700:400,cursor:"pointer"}}>{n}</button>
                    );})}
                    {ratings[item.key]&&<span style={{fontSize:12,color:PC.textSub,marginLeft:4}}>{rLbls[(ratings[item.key]||1)-1]}</span>}
                  </div>
                </div>
              ))}
              <label style={{fontSize:13,color:PC.textSub,marginBottom:4,display:"block",fontWeight:500}}>기타 특이사항</label>
              <textarea rows={3} placeholder="자유롭게 입력하세요" value={memo} onChange={e=>setMemo(e.target.value)} style={{...inSt,resize:"vertical" as const,fontSize:13}}/>
            </div>

            <button onClick={handleSubmit} disabled={!allFilled||loading} style={btnPrimary}>{loading?"저장 중...":"기록 저장"}</button>
          </>
        ):(()=>{
          const pass=submitted.total_time<=PASS_TIME_SEC;
          const prev=myHist[1]||null;
          const tcb=cBdg(prev?submitted.total_time-prev.total_time:null);
          const obs:number[]=submitted.obstacle_laps||[];
          return(
            <div>
              <div style={{...card,textAlign:"center",background:pass?PC.successLight:PC.dangerLight,border:`1px solid ${pass?PC.success:PC.danger}30`}}>
                <div style={{fontSize:14,color:PC.textSub,marginBottom:6}}>{submitted.student_name}님 · {submitted.date}</div>
                <div style={{fontSize:44,fontWeight:800,letterSpacing:-1,marginBottom:4,color:pass?PC.success:PC.danger}}>{secToMMSS(submitted.total_time)}</div>
                <div style={{fontSize:13,color:PC.textSub,marginBottom:6}}>{secToDisplay(submitted.total_time)}</div>
                {submitted.move_time>0&&<div style={{display:"flex",justifyContent:"center",gap:16,fontSize:12,color:PC.textSub,marginBottom:12}}><span>종목 합산 {secToDisplay(submitted.total)}</span><span>이동시간 {secToDisplay(submitted.move_time)}</span></div>}
                <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
                  <span style={passTag(pass)}>{pass?"✓ PASS":"✗ FAIL"} — {pass?`기준보다 ${PASS_TIME_SEC-submitted.total_time}초 빠름`:`기준보다 ${submitted.total_time-PASS_TIME_SEC}초 초과`}</span>
                  {tcb&&<Bdg {...tcb}/>}
                </div>
              </div>

              {/* 장애물 랩 결과 */}
              {obs.length>0&&(
                <div style={card}>
                  <div style={{fontWeight:700,fontSize:14,color:PC.text,marginBottom:10}}>🏃 장애물달리기 랩 기록</div>
                  {obs.map((cum:number,i:number)=>{
                    const prev_lap=i>0?obs[i-1]:0;
                    const interval=cum-prev_lap;
                    return(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                        <span style={{fontSize:13,fontWeight:600,color:PC.primary}}>{i+1}R</span>
                        <div style={{display:"flex",gap:8}}>
                          <span style={{fontSize:13}}>구간 {secToDisplay(interval)}</span>
                          <span style={{fontSize:12,color:PC.textSub}}>누적 {secToDisplay(cum)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* IN/OUT 결과 */}
              <div style={{fontSize:11,fontWeight:700,color:PC.textSub,margin:"16px 0 8px",textTransform:"uppercase" as const,letterSpacing:"0.6px"}}>코스별 결과</div>
              {INOUT_COURSES.map(c=>{
                const sec=submitted.inout_times?.[c.id]||0;
                const diff=sec-c.defaultTime;
                const db=dBdg(diff);
                return(
                  <div key={c.id} style={{...card,padding:"0.85rem 1.25rem"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:14}}>{c.icon} {c.name}</span>
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        <span style={{fontSize:14,fontWeight:700}}>{secToDisplay(sec)}</span>
                        {db&&<Bdg {...db}/>}
                      </div>
                    </div>
                    <div style={{marginTop:8,height:5,borderRadius:3,background:PC.borderLight,overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:3,width:`${Math.min(100,(c.defaultTime/Math.max(sec,1))*100)}%`,background:diff>0?PC.danger:PC.success,transition:"width 0.4s"}}/>
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
          myHist.length===0?<div style={{textAlign:"center",padding:"3rem 0",color:PC.textSub,fontSize:14}}>아직 저장된 기록이 없습니다.</div>:
          <HistoryList records={myHist}/>
        )}
      </div>
    </div>
  );
}
