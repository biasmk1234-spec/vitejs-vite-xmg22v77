# 순환식 체력시험 기록관리 시스템 — CLAUDE.md

## 프로젝트 정보

- **앱 이름**: 김민기 원장의 기록관리 시스템
- **라이브 URL**: https://mkpolice1.netlify.app
- **GitHub**: https://github.com/biasmk1234-spec/vitejs-vite-xmg22v77
- **로컬 폴더**: `/Users/mk/순환식기록관리시스템`
- **메인 파일**: `src/App.tsx` (단일 파일로 모든 로직 관리)
- **기술 스택**: React + TypeScript + Vite (프론트엔드), Supabase (DB), Netlify (배포)
- **배포 방식**: GitHub main 브랜치 push → Netlify 자동 배포 (1~2분 소요)

---

## Supabase 정보

- **URL**: https://xivairsxhdzignniithm.supabase.co
- **Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpdmFpcnN4aGR6aWdubmlpdGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0ODE0MzYsImV4cCI6MjA5NjA1NzQzNn0.C6oVIr2LVd_M3-O4tXeTis50ZA_sQ1UR5VpLQ90nrUk

### records 테이블 컬럼
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| created_at | timestamptz | 생성일시 |
| student_name | text | 학생 이름 |
| record_date | text | 측정 날짜 |
| date | text | 표시용 날짜 (YYYY.MM.DD) |
| obstacle_laps | jsonb | 장애물 6랩 누적초 배열 `[25,52,79,107,132,165]` |
| inout_times | jsonb | 코스별 IN/OUT 시간 `{hurdle:{in,out,elapsed}, ...}` |
| total_sec | numeric | 총시간(초) |
| total_time | numeric | 총시간(초) — total_sec과 동일 |
| passed | boolean | 통과 여부 (280초 기준) |
| move_time | numeric | 이동시간 합계(초) |
| condition | text | (미사용) |
| memo | text | 기타 특이사항 |
| ratings | jsonb | 컨디션·코스별 강도 `{condition, i_obstacle, i_hurdle, i_resistance, i_rescue, i_trigger}` |
| admin_comment | text | 원장님 코멘트 |
| comment_updated_at | timestamptz | 코멘트 마지막 수정일시 |

### students 테이블 컬럼
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| created_at | timestamptz | 가입일시 |
| name | text | 학생 이름 |
| password | text | 비밀번호 (평문) |
| status | text | 계정 상태 (`approved` / `pending`) |

---

## 앱 핵심 로직

- **통과 기준**: 4분 40초 (280초) → `passed` 컬럼에 boolean 저장
- **마스터 비밀번호**: `admin1234` (원장님 관리자 로그인)
- **코스 구성**: 장애물달리기(6랩) → 장대허들 → 밀고당기기 → 구조하기 → 방아쇠당기기
- **시간 계산**: 방아쇠 OUT 시간이 총시간, 없으면 각 코스 합산 + 이동시간
- **승인제**: 신규 가입 시 `status: 'pending'` → 원장님 승인 후 이용 가능
- **기존 회원**: 모두 `status: 'approved'` (67명, 변경 없음)

---

## DB 함수 패턴

```typescript
// GET
async function dbGet(t, q="") { ... }

// POST
async function dbPost(t, b) { ... }

// PATCH
async function dbPatch(t, id, b) { ... }

// DELETE
async function dbDelete(t, id) { ... }
```

---

## 현재 구현된 기능 (전체)

### 학생 화면
1. 로그인 / 신규 가입 신청 (승인 대기 시 로그인 차단)
2. 기록 입력 (장애물 6랩 누적시간 + IN/OUT 코스별 시간)
3. 기록 저장 후 결과 화면 (PASS/FAIL, 코스별 분석)
4. 내 기록 탭 — 기록 목록, 기록 비교
5. 기록 수정 (✏️ 수정 버튼 → EditModal)
6. 컨디션 · 코스별 체감 강도 5점 입력
7. 원장님 코멘트 수신 알림 (새 코멘트 시 뱃지 + 노란 배너)

### 관리자 화면 (admin1234)
1. 전체 학생 기록 조회
2. 이름 검색 + 버튼 탭 방식 학생 선택
3. 기록별 원장님 코멘트 작성 · 수정
4. 승인 대기 학생 목록 — 승인 / 거절 처리
5. 승인된 회원 탈퇴 처리 (기록은 유지, 계정만 삭제)

---

## Git / 배포

```bash
# 작업 폴더
cd /Users/mk/순환식기록관리시스템

# 수정 후 배포
git add src/App.tsx
git commit -m "커밋 메시지"
git push origin main
# → Netlify 자동 배포 (1~2분)
```

- GitHub remote에 토큰 인증 설정 완료 (별도 로그인 불필요)

---

## 작업 시 주의사항

1. `src/App.tsx` **단일 파일만 수정** — 다른 파일 건드리지 말 것
2. `students` / `records` 테이블 구조 변경 시 **반드시 기존 데이터 영향 검토**
3. 현재 학생 67명, 기록 139개 존재 — 데이터 절대 보존
4. Supabase DDL 변경 필요 시 SQL Editor에서 직접 실행 후 코드 작업
5. 배포 후 `admin1234` 로그인으로 기능 확인

---

## 관련 문서 폴더

`/Users/mk/BIAS체력학원/문서/` — 마케팅 요약 등 외부 문서 보관
