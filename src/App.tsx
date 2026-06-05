import { useState } from "react";

const SUPABASE_URL = "https://xivairsxhdzignniithm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpdmFpcnN4aGR6aWdubmlpdGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0ODE0MzYsImV4cCI6MjA5NjA1NzQzNn0.C6oVIr2LVd_M3-O4tXeTis50ZA_sQ1UR5VpLQ90nrUk";
const MASTER_PW = "admin1234";
const PASS_TIME = 280;

function pad(n: number) { return String(n).padStart(2, "0"); }
function secToDisplay(s: number) {
  const n = Math.round(s);
  if (n <= 0) return "0초";
  return n >= 60 ? `${Math.floor(n / 60)}분 ${pad(n % 60)}초` : `${n}초`;
}
function todayISO() { return new Date().toISOString().split("T")[0]; }
function mmssToSec(mm: string, ss: string) { return (parseInt(mm) || 0) * 60 + (parseInt(ss) || 0); }

const HDR = { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

async function apiGet(table: string, query = "") {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&${query}`, { headers: { ...HDR, Accept: "application/json" } });
  return r.json();
}
async function apiPost(table: string, body: object) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST", headers: { ...HDR, Prefer: "return=representation" }, body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(data));
  return data;
}

const C = {
  primary: "#1a73e8", primaryLight: "#e8f0fe", primaryDark: "#1557b0",
  success: "#34a853", successLight: "#e6f4ea",
  danger: "#ea4335", dangerLight: "#fce8e6",
  bg: "#f8f9fa", white: "#ffffff", border: "#e0e0e0",
  text: "#202124", textSub: "#5f6368",
};
const card: React.CSSProperties = { background: C.white, borderRadius: 12, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.1)", marginBottom: 12 };
const inp: React.CSSProperties = { border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 15, width: "100%", boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: 12, color: C.textSub, marginBottom: 4, display: "block", fontWeight: 500 };
const btn = (bg = C.primary): React.CSSProperties => ({ background: bg, color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%" });

function MSInput({ mm, ss, onMM, onSS }: { mm: string; ss: string; onMM: (v: string) => void; onSS: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <input style={{ ...inp, textAlign: "center" }} type="number" min="0" max="99" placeholder="분" value={mm} onChange={e => onMM(e.target.value)} />
      <span style={{ color: C.textSub, fontWeight: 600 }}>:</span>
      <input style={{ ...inp, textAlign: "center" }} type="number" min="0" max="59" placeholder="초" value={ss} onChange={e => onSS(e.target.value)} />
    </div>
  );
}

const INOUT_COURSES = [
  { id: "hurdle", name: "장대허들", icon: "🚧" },
  { id: "resistance", name: "밀고당기기", icon: "💪" },
  { id: "rescue", name: "구조하기", icon: "🤝" },
  { id: "trigger", name: "방아쇠당기기", icon: "🎯" },
];

const emptyInout = () => Object.fromEntries(INOUT_COURSES.map(c => [c.id, { inMM: "", inSS: "", outMM: "", outSS: "" }]));
const emptyLaps = () => Array.from({ length: 6 }, () => ({ mm: "", ss: "" }));

export default function App() {
  // 화면: login | record | history | admin
  const [screen, setScreen] = useState<"login" | "record" | "history" | "admin">("login");
  const [userName, setUserName] = useState("");
  const [userPw, setUserPw] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // 기록 입력
  const [recDate, setRecDate] = useState(todayISO());
  const [laps, setLaps] = useState(emptyLaps());
  const [inout, setInout] = useState(emptyInout());
  const [condition, setCondition] = useState(0);
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // 기록 목록
  const [records, setRecords] = useState<any[]>([]);
  const [loadingRec, setLoadingRec] = useState(false);

  // ── 계산 ──────────────────────────────────────
  const lapSecs = laps.map(l => mmssToSec(l.mm, l.ss));
  const lapIntervals = lapSecs.map((s, i) => i === 0 ? s : Math.max(0, s - lapSecs[i - 1]));
  const obstacleSec = lapSecs[5] || 0;

  function getElapsed(id: string) {
    const v = inout[id];
    return Math.max(0, mmssToSec(v.outMM, v.outSS) - mmssToSec(v.inMM, v.inSS));
  }
  function getMove(fromSec: number, toId: string) {
    const toIn = mmssToSec(inout[toId]?.inMM, inout[toId]?.inSS);
    return toIn > 0 ? Math.max(0, toIn - fromSec) : null;
  }
  const moves = [
    getMove(obstacleSec, "hurdle"),
    getMove(mmssToSec(inout.hurdle.outMM, inout.hurdle.outSS), "resistance"),
    getMove(mmssToSec(inout.resistance.outMM, inout.resistance.outSS), "rescue"),
    getMove(mmssToSec(inout.rescue.outMM, inout.rescue.outSS), "trigger"),
  ];
  const totalSec = inout.trigger.outMM ? mmssToSec(inout.trigger.outMM, inout.trigger.outSS) : 0;
  const passed = totalSec > 0 && totalSec <= PASS_TIME;

  // ── 로그인: 가입된 계정이면 로그인, 처음이면 자동 가입 후 로그인 ──
  async function handleLogin() {
    const name = userName.trim();
    const pw = userPw.trim();
    if (!name) { setLoginErr("이름을 입력하세요"); return; }
    if (!pw) { setLoginErr("비밀번호를 입력하세요"); return; }

    // 원장님 마스터 로그인
    if (pw === MASTER_PW) {
      setLoginErr("");
      await loadRecords();
      setScreen("admin");
      return;
    }

    setLoginLoading(true);
    setLoginErr("");
    try {
      // 기존 계정 조회
      const existing = await apiGet("students", `name=eq.${encodeURIComponent(name)}`);

      if (existing.length > 0) {
        // 계정 있음 → 비번 확인
        if (existing[0].password !== pw) {
          setLoginErr("비밀번호가 틀렸어요");
          setLoginLoading(false);
          return;
        }
        // 로그인 성공
      } else {
        // 계정 없음 → 자동 가입
        await apiPost("students", { name, password: pw });
      }

      setLoginErr("");
      setScreen("record");
    } catch (e: any) {
      setLoginErr("오류가 발생했어요: " + e.message);
    }
    setLoginLoading(false);
  }

  // ── 기록 저장 ──────────────────────────────────
  async function handleSave() {
    if (!obstacleSec) { setSaveMsg("장애물달리기 시간을 입력하세요"); return; }
    if (!inout.trigger.outMM) { setSaveMsg("방아쇠당기기 OUT 시간을 입력하세요"); return; }
    setSaving(true); setSaveMsg("");
    try {
      await apiPost("records", {
        student_name: userName,
        record_date: recDate,
        obstacle_laps: laps.map((l, i) => ({ lap: i + 1, cumulative: lapSecs[i], interval: lapIntervals[i] })),
        inout_times: Object.fromEntries(INOUT_COURSES.map(c => [c.id, {
          in: mmssToSec(inout[c.id].inMM, inout[c.id].inSS),
          out: mmssToSec(inout[c.id].outMM, inout[c.id].outSS),
          elapsed: getElapsed(c.id),
        }])),
        total_sec: totalSec,
        passed,
        condition,
        memo,
      });
      setSaveMsg("✅ 저장 완료!");
      setLaps(emptyLaps());
      setInout(emptyInout());
      setCondition(0); setMemo("");
    } catch (e: any) {
      setSaveMsg("❌ 저장 실패: " + e.message);
    }
    setSaving(false);
  }

  // ── 기록 불러오기 ──────────────────────────────
  async function loadRecords(name?: string) {
    setLoadingRec(true);
    const q = name ? `student_name=eq.${encodeURIComponent(name)}&order=record_date.desc` : `order=record_date.desc`;
    const data = await apiGet("records", q);
    setRecords(Array.isArray(data) ? data : []);
    setLoadingRec(false);
  }

  function resetAll() { setScreen("login"); setUserName(""); setUserPw(""); setLoginErr(""); setRecords([]); }

  // ── 공통 헤더 ──────────────────────────────────
  const Header = () => (
    <div style={{ background: C.primary, color: "#fff", padding: "14px 16px", textAlign: "center" }}>
      <div style={{ fontSize: 11, opacity: 0.8 }}>🚔 경찰 순환식 체력시험</div>
      <div style={{ fontSize: 17, fontWeight: 700 }}>김민기 원장의 기록관리 시스템</div>
    </div>
  );

  // ── 로그인 화면 ────────────────────────────────
  if (screen === "login") return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <Header />
      <div style={{ maxWidth: 420, margin: "0 auto", padding: 20 }}>
        <div style={card}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 44 }}>🏃</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>로그인 / 첫 방문 시 자동가입</div>
            <div style={{ fontSize: 12, color: C.textSub, marginTop: 4 }}>처음 오신 분은 이름+비번 입력하면 바로 가입돼요</div>
          </div>
          <label style={lbl}>이름</label>
          <input style={{ ...inp, marginBottom: 10 }} placeholder="이름 입력" value={userName} onChange={e => setUserName(e.target.value)} />
          <label style={lbl}>비밀번호</label>
          <input style={{ ...inp, marginBottom: 16 }} type="password" placeholder="비밀번호 입력" value={userPw}
            onChange={e => setUserPw(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} />
          {loginErr && <div style={{ color: C.danger, fontSize: 13, marginBottom: 10, textAlign: "center" }}>{loginErr}</div>}
          <button style={btn()} onClick={handleLogin} disabled={loginLoading}>
            {loginLoading ? "확인 중..." : "로그인 / 가입"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── 기록 입력 화면 ─────────────────────────────
  if (screen === "record") return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <Header />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button style={{ ...btn(C.primary), flex: 1 }}>📝 기록입력</button>
          <button style={{ ...btn("#5f6368"), flex: 1 }} onClick={() => { loadRecords(userName); setScreen("history"); }}>📋 내 기록</button>
          <button style={{ ...btn("#999"), flex: 1, fontSize: 12 }} onClick={resetAll}>🚪 로그아웃</button>
        </div>

        <div style={{ ...card, background: C.primaryLight }}>
          <span style={{ fontSize: 13, color: C.primaryDark, fontWeight: 600 }}>안녕하세요, {userName}님! 👋</span>
        </div>

        <div style={card}>
          <label style={lbl}>📅 기록 날짜</label>
          <input style={inp} type="date" value={recDate} onChange={e => setRecDate(e.target.value)} />
        </div>

        {/* 장애물달리기 */}
        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>🏃 장애물달리기 (6랩 누적시간 입력)</div>
          {laps.map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ width: 36, fontSize: 13, color: C.textSub, fontWeight: 600, flexShrink: 0 }}>{i + 1}랩</span>
              <MSInput mm={l.mm} ss={l.ss}
                onMM={v => setLaps(p => p.map((x, j) => j === i ? { ...x, mm: v } : x))}
                onSS={v => setLaps(p => p.map((x, j) => j === i ? { ...x, ss: v } : x))} />
              {lapSecs[i] > 0 && i > 0 && (
                <span style={{ fontSize: 12, color: C.success, whiteSpace: "nowrap", flexShrink: 0 }}>+{secToDisplay(lapIntervals[i])}</span>
              )}
            </div>
          ))}
          {obstacleSec > 0 && (
            <div style={{ background: C.primaryLight, borderRadius: 8, padding: "8px 12px", marginTop: 4 }}>
              <div style={{ fontSize: 13, color: C.primaryDark, fontWeight: 700 }}>총 {secToDisplay(obstacleSec)}</div>
              <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>
                {lapIntervals.map((s, i) => s > 0 ? `${i + 1}랩 ${secToDisplay(s)}` : null).filter(Boolean).join(" · ")}
              </div>
            </div>
          )}
        </div>

        {/* IN/OUT 코스 */}
        {INOUT_COURSES.map((course, ci) => {
          const v = inout[course.id];
          const elapsed = getElapsed(course.id);
          const moveSec = moves[ci];
          return (
            <div key={course.id}>
              {moveSec !== null && moveSec !== undefined && (
                <div style={{ textAlign: "center", fontSize: 12, color: C.textSub, padding: "2px 0 6px" }}>🚶 이동 {secToDisplay(moveSec)}</div>
              )}
              <div style={card}>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>{course.icon} {course.name}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={lbl}>IN (분:초)</label>
                    <MSInput mm={v.inMM} ss={v.inSS}
                      onMM={val => setInout(p => ({ ...p, [course.id]: { ...p[course.id], inMM: val } }))}
                      onSS={val => setInout(p => ({ ...p, [course.id]: { ...p[course.id], inSS: val } }))} />
                  </div>
                  <div>
                    <label style={lbl}>OUT (분:초)</label>
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
            <div style={{ fontSize: 22, fontWeight: 800, color: passed ? C.success : C.danger, textAlign: "center" }}>
              {passed ? "✅ 통과" : "❌ 미통과"}
            </div>
            <div style={{ textAlign: "center", fontSize: 16, fontWeight: 700, marginTop: 4 }}>총시간: {secToDisplay(totalSec)}</div>
            <div style={{ textAlign: "center", fontSize: 12, color: C.textSub, marginTop: 2 }}>기준: 4분 40초</div>
          </div>
        )}

        {/* 컨디션 & 메모 */}
        <div style={card}>
          <label style={lbl}>컨디션 (1=매우나쁨 ~ 5=매우좋음)</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setCondition(n)}
                style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `2px solid ${condition === n ? C.primary : C.border}`, background: condition === n ? C.primaryLight : "#fff", cursor: "pointer", fontSize: 15, fontWeight: 700, color: condition === n ? C.primary : C.textSub }}>
                {n}
              </button>
            ))}
          </div>
          <label style={lbl}>메모</label>
          <textarea style={{ ...inp, height: 70, resize: "none" as const }} placeholder="오늘의 훈련 메모..." value={memo} onChange={e => setMemo(e.target.value)} />
        </div>

        <button style={btn(C.success)} onClick={handleSave} disabled={saving}>
          {saving ? "저장 중..." : "💾 기록 저장"}
        </button>
        {saveMsg && <div style={{ textAlign: "center", fontSize: 14, color: saveMsg.startsWith("✅") ? C.success : C.danger, padding: 8 }}>{saveMsg}</div>}
        <div style={{ height: 40 }} />
      </div>
    </div>
  );

  // ── 내 기록 화면 ────────────────────────────────
  if (screen === "history") return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <Header />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
        <button style={{ ...btn("#5f6368"), marginBottom: 12 }} onClick={() => setScreen("record")}>← 기록입력으로</button>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>{userName}님의 기록</div>
        {loadingRec && <div style={{ textAlign: "center", padding: 20, color: C.textSub }}>불러오는 중...</div>}
        {!loadingRec && records.length === 0 && <div style={{ textAlign: "center", padding: 20, color: C.textSub }}>저장된 기록이 없어요</div>}
        {records.map((r, i) => {
          const lapsData: any[] = r.obstacle_laps || [];
          const inoutData: any = r.inout_times || {};
          return (
            <div key={i} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontWeight: 700 }}>{r.record_date}</span>
                <span style={{ background: r.passed ? C.successLight : C.dangerLight, color: r.passed ? C.success : C.danger, borderRadius: 20, padding: "2px 12px", fontSize: 12, fontWeight: 700 }}>
                  {r.passed ? "통과" : "미통과"}
                </span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.primary, marginBottom: 6 }}>총시간: {secToDisplay(r.total_sec)}</div>
              {lapsData.length > 0 && (
                <div style={{ fontSize: 12, color: C.textSub, marginBottom: 4 }}>
                  🏃 장애물: {secToDisplay(lapsData[5]?.cumulative || 0)}
                  {" · "}{lapsData.map((l: any) => secToDisplay(l.interval)).join(" / ")}
                </div>
              )}
              {["hurdle", "resistance", "rescue", "trigger"].map(id => {
                const d = inoutData[id];
                if (!d) return null;
                const names: any = { hurdle: "장대허들", resistance: "밀고당기기", rescue: "구조하기", trigger: "방아쇠" };
                return <div key={id} style={{ fontSize: 12, color: C.textSub }}>{names[id]}: {secToDisplay(d.elapsed)}</div>;
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

  // ── 관리자 화면 ─────────────────────────────────
  if (screen === "admin") return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <Header />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
        <div style={{ ...card, background: "#fff3cd" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#856404" }}>🔐 원장님 관리자 모드 — 전체 기록 {records.length}건</span>
        </div>
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
        <button style={{ ...btn("#5f6368"), marginTop: 8 }} onClick={resetAll}>🚪 로그아웃</button>
      </div>
    </div>
  );

  return null;
}
