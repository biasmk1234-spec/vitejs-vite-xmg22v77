import { useState, useEffect } from "react";

const SUPABASE_URL = "https://xivairsxhdzignniithm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpdmFpcnN4aGR6aWdubmlpdGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0ODE0MzYsImV4cCI6MjA5NjA1NzQzNn0.C6oVIr2LVd_M3-O4tXeTis50ZA_sQ1UR5VpLQ90nrUk";
const MASTER_PW = "admin1234";
const PASS_TIME = 280; // 4분 40초

// ── 유틸 ──────────────────────────────────────────
function pad(n: number) { return String(n).padStart(2, "0"); }
function secToDisplay(s: number) {
  const n = Math.round(s);
  if (n <= 0) return "0초";
  return n >= 60 ? `${Math.floor(n / 60)}분 ${pad(n % 60)}초` : `${n}초`;
}
function todayISO() { return new Date().toISOString().split("T")[0]; }
function mmssToSec(mm: string, ss: string) {
  const m = parseInt(mm) || 0, s = parseInt(ss) || 0;
  return m * 60 + s;
}

// ── Supabase API ──────────────────────────────────
const HDR = {
  "Content-Type": "application/json",
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};
async function dbGet(query = "") {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/records?select=*&${query}`, {
    headers: { ...HDR, Accept: "application/json" },
  });
  return r.json();
}
async function dbPost(body: object) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/records`, {
    method: "POST",
    headers: { ...HDR, Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(data));
  return data;
}

// ── 스타일 상수 ───────────────────────────────────
const C = {
  primary: "#1a73e8", primaryLight: "#e8f0fe", primaryDark: "#1557b0",
  success: "#34a853", successLight: "#e6f4ea",
  danger: "#ea4335", dangerLight: "#fce8e6",
  bg: "#f8f9fa", white: "#ffffff",
  border: "#e0e0e0", text: "#202124", textSub: "#5f6368",
};

const card: React.CSSProperties = {
  background: C.white, borderRadius: 12, padding: "16px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.1)", marginBottom: 12,
};
const label: React.CSSProperties = {
  fontSize: 12, color: C.textSub, marginBottom: 4, display: "block", fontWeight: 500,
};
const input: React.CSSProperties = {
  border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px",
  fontSize: 15, width: "100%", boxSizing: "border-box" as const,
};
const btn = (color = C.primary): React.CSSProperties => ({
  background: color, color: "#fff", border: "none", borderRadius: 8,
  padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%",
});

// ── 분:초 입력 컴포넌트 ───────────────────────────
function MSInput({ mm, ss, onMM, onSS }: { mm: string; ss: string; onMM: (v: string) => void; onSS: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <input style={{ ...input, textAlign: "center" }} type="number" min="0" max="99" placeholder="분" value={mm} onChange={e => onMM(e.target.value)} />
      <span style={{ color: C.textSub, fontWeight: 600 }}>:</span>
      <input style={{ ...input, textAlign: "center" }} type="number" min="0" max="59" placeholder="초" value={ss} onChange={e => onSS(e.target.value)} />
    </div>
  );
}

// ── 메인 앱 ──────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<"login" | "record" | "history" | "admin">("login");
  const [userName, setUserName] = useState("");
  const [userPw, setUserPw] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginErr, setLoginErr] = useState("");

  // 기록 입력 상태
  const [recDate, setRecDate] = useState(todayISO());
  const [condition, setCondition] = useState(0);
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // 장애물달리기: 6랩 누적시간 (분/초)
  const [laps, setLaps] = useState(Array.from({ length: 6 }, () => ({ mm: "", ss: "" })));

  // IN/OUT 코스
  const INOUT = [
    { id: "hurdle", name: "장대허들", icon: "🚧" },
    { id: "resistance", name: "밀고당기기", icon: "💪" },
    { id: "rescue", name: "구조하기", icon: "🤝" },
    { id: "trigger", name: "방아쇠당기기", icon: "🎯" },
  ];
  const [inout, setInout] = useState(
    Object.fromEntries(INOUT.map(c => [c.id, { inMM: "", inSS: "", outMM: "", outSS: "" }]))
  );

  // 히스토리
  const [records, setRecords] = useState<any[]>([]);
  const [loadingRec, setLoadingRec] = useState(false);

  // ── 계산 ─────────────────────────────────────
  // 랩 구간시간
  const lapSecs = laps.map(l => mmssToSec(l.mm, l.ss));
  const lapIntervals = lapSecs.map((s, i) => i === 0 ? s : Math.max(0, s - lapSecs[i - 1]));
  const obstacleSec = lapSecs[5] || 0; // 6랩 = 총 시간

  // IN/OUT 소요시간
  function getInOutSec(id: string) {
    const v = inout[id];
    const inSec = mmssToSec(v.inMM, v.inSS);
    const outSec = mmssToSec(v.outMM, v.outSS);
    return Math.max(0, outSec - inSec);
  }

  // 이동시간: 장애물OUT → 장대IN, 장대OUT → 밀고IN, 밀고OUT → 구조IN, 구조OUT → 방아쇠IN
  function getMoveSec(fromId: string, toId: string) {
    const fromOut = mmssToSec(inout[fromId]?.outMM, inout[fromId]?.outSS);
    const toIn = mmssToSec(inout[toId]?.inMM, inout[toId]?.inSS);
    if (fromId === "obstacle_out") {
      // 장애물 OUT = lapSecs[5]
      return Math.max(0, mmssToSec(inout[toId]?.inMM, inout[toId]?.inSS) - obstacleSec);
    }
    return Math.max(0, toIn - fromOut);
  }

  const move1 = obstacleSec > 0 && inout.hurdle.inMM ? Math.max(0, mmssToSec(inout.hurdle.inMM, inout.hurdle.inSS) - obstacleSec) : null;
  const move2 = inout.hurdle.outMM && inout.resistance.inMM ? Math.max(0, mmssToSec(inout.resistance.inMM, inout.resistance.inSS) - mmssToSec(inout.hurdle.outMM, inout.hurdle.outSS)) : null;
  const move3 = inout.resistance.outMM && inout.rescue.inMM ? Math.max(0, mmssToSec(inout.rescue.inMM, inout.rescue.inSS) - mmssToSec(inout.resistance.outMM, inout.resistance.outSS)) : null;
  const move4 = inout.rescue.outMM && inout.trigger.inMM ? Math.max(0, mmssToSec(inout.trigger.inMM, inout.trigger.inSS) - mmssToSec(inout.rescue.outMM, inout.rescue.outSS)) : null;

  // 총시간 = 방아쇠 OUT
  const totalSec = inout.trigger.outMM ? mmssToSec(inout.trigger.outMM, inout.trigger.outSS) : 0;
  const passed = totalSec > 0 && totalSec <= PASS_TIME;

  // ── 로그인 ────────────────────────────────────
  function handleLogin() {
    if (!userName.trim()) { setLoginErr("이름을 입력하세요"); return; }
    if (!userPw.trim()) { setLoginErr("비밀번호를 입력하세요"); return; }
    if (userPw === MASTER_PW) {
      setIsAdmin(true); loadRecords(); setScreen("admin");
    } else {
      setIsAdmin(false); setScreen("record");
    }
    setLoginErr("");
  }

  // ── 기록 저장 ─────────────────────────────────
  async function handleSave() {
    if (!obstacleSec) { setSaveMsg("장애물달리기 시간을 입력하세요"); return; }
    if (!inout.trigger.outMM) { setSaveMsg("방아쇠당기기 OUT 시간을 입력하세요"); return; }

    setSaving(true); setSaveMsg("");

    const obstacle_laps = laps.map((l, i) => ({
      lap: i + 1,
      cumulative: mmssToSec(l.mm, l.ss),
      interval: lapIntervals[i],
    }));

    const inout_times = Object.fromEntries(
      INOUT.map(c => [c.id, {
        in: mmssToSec(inout[c.id].inMM, inout[c.id].inSS),
        out: mmssToSec(inout[c.id].outMM, inout[c.id].outSS),
        elapsed: getInOutSec(c.id),
      }])
    );

    const body = {
      student_name: userName,
      record_date: recDate,
      obstacle_laps,
      inout_times,
      total_sec: totalSec,
      passed,
      condition,
      memo,
    };

    try {
      await dbPost(body);
      setSaveMsg("✅ 저장 완료!");
      // 초기화
      setLaps(Array.from({ length: 6 }, () => ({ mm: "", ss: "" })));
      setInout(Object.fromEntries(INOUT.map(c => [c.id, { inMM: "", inSS: "", outMM: "", outSS: "" }])));
      setCondition(0); setMemo("");
    } catch (e: any) {
      setSaveMsg("❌ 저장 실패: " + e.message);
    }
    setSaving(false);
  }

  // ── 기록 불러오기 ─────────────────────────────
  async function loadRecords(name?: string) {
    setLoadingRec(true);
    const q = name
      ? `student_name=eq.${encodeURIComponent(name)}&order=record_date.desc`
      : `order=record_date.desc`;
    const data = await dbGet(q);
    setRecords(Array.isArray(data) ? data : []);
    setLoadingRec(false);
  }

  // ── UI ───────────────────────────────────────
  const header = (
    <div style={{ background: C.primary, color: "#fff", padding: "16px", marginBottom: 0, textAlign: "center" }}>
      <div style={{ fontSize: 11, opacity: 0.8 }}>🚔 경찰 순환식 체력시험</div>
      <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>김민기 원장의 기록관리 시스템</div>
    </div>
  );

  // 로그인 화면
  if (screen === "login") return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      {header}
      <div style={{ maxWidth: 420, margin: "0 auto", padding: 20 }}>
        <div style={card}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 40 }}>🏃</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>로그인</div>
          </div>
          <label style={label}>이름</label>
          <input style={{ ...input, marginBottom: 10 }} placeholder="이름 입력" value={userName} onChange={e => setUserName(e.target.value)} />
          <label style={label}>비밀번호</label>
          <input style={{ ...input, marginBottom: 16 }} type="password" placeholder="비밀번호 입력" value={userPw}
            onChange={e => setUserPw(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} />
          {loginErr && <div style={{ color: C.danger, fontSize: 13, marginBottom: 8 }}>{loginErr}</div>}
          <button style={btn()} onClick={handleLogin}>로그인</button>
        </div>
      </div>
    </div>
  );

  // 기록 입력 화면
  if (screen === "record") return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      {header}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
        {/* 상단 탭 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button style={{ ...btn(C.primary), flex: 1 }} onClick={() => setScreen("record")}>📝 기록입력</button>
          <button style={{ ...btn("#5f6368"), flex: 1 }} onClick={() => { loadRecords(userName); setScreen("history"); }}>📋 내 기록</button>
          <button style={{ ...btn("#888"), flex: 1, fontSize: 12 }} onClick={() => { setScreen("login"); setUserName(""); setUserPw(""); }}>🚪 로그아웃</button>
        </div>

        <div style={{ ...card, background: C.primaryLight }}>
          <span style={{ fontSize: 13, color: C.primaryDark, fontWeight: 600 }}>안녕하세요, {userName}님! 👋</span>
        </div>

        {/* 날짜 */}
        <div style={card}>
          <label style={label}>📅 기록 날짜</label>
          <input style={input} type="date" value={recDate} onChange={e => setRecDate(e.target.value)} />
        </div>

        {/* 장애물달리기 */}
        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 12, color: C.text }}>🏃 장애물달리기 (6랩 누적시간)</div>
          {laps.map((l, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ width: 32, fontSize: 13, color: C.textSub, fontWeight: 600 }}>{i + 1}랩</span>
                <MSInput mm={l.mm} ss={l.ss}
                  onMM={v => setLaps(p => p.map((x, j) => j === i ? { ...x, mm: v } : x))}
                  onSS={v => setLaps(p => p.map((x, j) => j === i ? { ...x, ss: v } : x))} />
                {lapSecs[i] > 0 && i > 0 && (
                  <span style={{ fontSize: 12, color: C.success, whiteSpace: "nowrap" }}>
                    +{secToDisplay(lapIntervals[i])}
                  </span>
                )}
              </div>
            </div>
          ))}
          {obstacleSec > 0 && (
            <div style={{ background: C.primaryLight, borderRadius: 8, padding: "8px 12px", marginTop: 4 }}>
              <span style={{ fontSize: 13, color: C.primaryDark, fontWeight: 700 }}>총 {secToDisplay(obstacleSec)}</span>
              <div style={{ fontSize: 12, color: C.textSub, marginTop: 4 }}>
                {lapIntervals.map((s, i) => s > 0 ? `${i + 1}랩 ${secToDisplay(s)}` : null).filter(Boolean).join(" · ")}
              </div>
            </div>
          )}
        </div>

        {/* IN/OUT 코스들 */}
        {INOUT.map((course, ci) => {
          const v = inout[course.id];
          const elapsed = getInOutSec(course.id);
          const prevCourse = ci === 0 ? null : INOUT[ci - 1].id;
          const moveArr = [move1, move2, move3, move4];
          const moveSec = moveArr[ci];
          return (
            <div key={course.id}>
              {moveSec !== null && moveSec !== undefined && (
                <div style={{ textAlign: "center", fontSize: 12, color: C.textSub, padding: "4px 0" }}>
                  🚶 이동 {secToDisplay(moveSec)}
                </div>
              )}
              <div style={card}>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>{course.icon} {course.name}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={label}>IN (분:초)</label>
                    <MSInput mm={v.inMM} ss={v.inSS}
                      onMM={val => setInout(p => ({ ...p, [course.id]: { ...p[course.id], inMM: val } }))}
                      onSS={val => setInout(p => ({ ...p, [course.id]: { ...p[course.id], inSS: val } }))} />
                  </div>
                  <div>
                    <label style={label}>OUT (분:초)</label>
                    <MSInput mm={v.outMM} ss={v.outSS}
                      onMM={val => setInout(p => ({ ...p, [course.id]: { ...p[course.id], outMM: val } }))}
                      onSS={val => setInout(p => ({ ...p, [course.id]: { ...p[course.id], outSS: val } }))} />
                  </div>
                </div>
                {elapsed > 0 && (
                  <div style={{ marginTop: 8, background: C.successLight, borderRadius: 8, padding: "6px 10px", fontSize: 13, color: C.success, fontWeight: 600 }}>
                    소요시간: {secToDisplay(elapsed)}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* 총 결과 */}
        {totalSec > 0 && (
          <div style={{ ...card, background: passed ? C.successLight : C.dangerLight, border: `2px solid ${passed ? C.success : C.danger}` }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: passed ? C.success : C.danger, textAlign: "center" }}>
              {passed ? "✅ 통과" : "❌ 미통과"}
            </div>
            <div style={{ textAlign: "center", fontSize: 16, fontWeight: 700, marginTop: 4 }}>
              총시간: {secToDisplay(totalSec)}
            </div>
            <div style={{ textAlign: "center", fontSize: 12, color: C.textSub, marginTop: 2 }}>
              기준: 4분 40초 ({PASS_TIME}초)
            </div>
          </div>
        )}

        {/* 컨디션 & 메모 */}
        <div style={card}>
          <label style={label}>컨디션 (1=매우나쁨 ~ 5=매우좋음)</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setCondition(n)}
                style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `2px solid ${condition === n ? C.primary : C.border}`, background: condition === n ? C.primaryLight : "#fff", cursor: "pointer", fontSize: 15, fontWeight: 700, color: condition === n ? C.primary : C.textSub }}>
                {n}
              </button>
            ))}
          </div>
          <label style={label}>메모</label>
          <textarea style={{ ...input, height: 70, resize: "none" as const }} placeholder="오늘의 훈련 메모..." value={memo} onChange={e => setMemo(e.target.value)} />
        </div>

        <button style={{ ...btn(C.success), marginBottom: 8 }} onClick={handleSave} disabled={saving}>
          {saving ? "저장 중..." : "💾 기록 저장"}
        </button>
        {saveMsg && <div style={{ textAlign: "center", fontSize: 14, color: saveMsg.startsWith("✅") ? C.success : C.danger, padding: 8 }}>{saveMsg}</div>}
        <div style={{ height: 40 }} />
      </div>
    </div>
  );

  // 내 기록 화면
  if (screen === "history") return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      {header}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button style={{ ...btn("#5f6368"), flex: 1 }} onClick={() => setScreen("record")}>← 기록입력</button>
        </div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>{userName}님의 기록</div>
        {loadingRec && <div style={{ textAlign: "center", padding: 20, color: C.textSub }}>불러오는 중...</div>}
        {!loadingRec && records.length === 0 && <div style={{ textAlign: "center", padding: 20, color: C.textSub }}>기록이 없습니다</div>}
        {records.map((r, i) => {
          const lapsData: any[] = r.obstacle_laps || [];
          const inoutData: any = r.inout_times || {};
          return (
            <div key={i} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontWeight: 700 }}>{r.record_date}</span>
                <span style={{ background: r.passed ? C.successLight : C.dangerLight, color: r.passed ? C.success : C.danger, borderRadius: 20, padding: "2px 12px", fontSize: 12, fontWeight: 700 }}>
                  {r.passed ? "통과" : "미통과"}
                </span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.primary, marginBottom: 6 }}>
                총시간: {secToDisplay(r.total_sec)}
              </div>
              {/* 랩 정보 */}
              {lapsData.length > 0 && (
                <div style={{ fontSize: 12, color: C.textSub, marginBottom: 4 }}>
                  🏃 장애물: {secToDisplay(lapsData[5]?.cumulative || 0)}
                  {" "}({lapsData.map((l: any) => secToDisplay(l.interval)).join(" / ")})
                </div>
              )}
              {/* IN/OUT 정보 */}
              {["hurdle", "resistance", "rescue", "trigger"].map(id => {
                const d = inoutData[id];
                if (!d) return null;
                const names: any = { hurdle: "장대허들", resistance: "밀고당기기", rescue: "구조하기", trigger: "방아쇠" };
                return (
                  <div key={id} style={{ fontSize: 12, color: C.textSub }}>
                    {names[id]}: {secToDisplay(d.elapsed)}
                  </div>
                );
              })}
              {r.condition > 0 && <div style={{ fontSize: 12, color: C.textSub, marginTop: 4 }}>컨디션: {r.condition}/5</div>}
              {r.memo && <div style={{ fontSize: 12, color: C.textSub, marginTop: 2, fontStyle: "italic" }}>"{r.memo}"</div>}
            </div>
          );
        })}
        <div style={{ height: 40 }} />
      </div>
    </div>
  );

  // 관리자 화면
  if (screen === "admin") return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      {header}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
        <div style={{ ...card, background: "#fff3cd" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#856404" }}>🔐 원장님 관리자 모드</span>
        </div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>전체 기록 ({records.length}건)</div>
        {loadingRec && <div style={{ textAlign: "center", padding: 20 }}>불러오는 중...</div>}
        {records.map((r, i) => (
          <div key={i} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontWeight: 700 }}>{r.student_name}</span>
              <span style={{ fontSize: 12, color: C.textSub }}>{r.record_date}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.primary, fontWeight: 600 }}>총 {secToDisplay(r.total_sec)}</span>
              <span style={{ background: r.passed ? C.successLight : C.dangerLight, color: r.passed ? C.success : C.danger, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>
                {r.passed ? "통과" : "미통과"}
              </span>
            </div>
          </div>
        ))}
        <button style={{ ...btn("#5f6368"), marginTop: 8 }} onClick={() => { setScreen("login"); setUserName(""); setUserPw(""); setIsAdmin(false); }}>
          🚪 로그아웃
        </button>
      </div>
    </div>
  );

  return null;
}
