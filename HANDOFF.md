# HANDOFF — 사이드바 & 전지작업 사진 첨부 기능 (2026-09-14)

> ⚠️ **2026-09-26 업데이트 (최신 상태)**: 이후 아래 기능이 추가되어 앱 구조가 크게 바뀌었다. 상세는 `docs/2026-09-26-admin-schema.md`, 디자인 규칙은 `DESIGN.md` 참고.
> - **로그인 필수**: 첫 화면이 로그인 화면이다. `app_users` 계정(아이디/비밀번호)으로 로그인하며, 토큰은 12시간 동안 유효하다.
> - **관리자 메뉴**(role = admin만 보임): 회사(한전 협력사) / 사용자 / 작업장을 추가·수정·삭제한다. Supabase `WattLine` DB에 `companies`, `app_users`, `workplaces`, `workplace_workers` 테이블을 추가했다.
> - **작업장 목록**이 로그인 후 첫 화면이다. 작업자는 자기 회사 작업장만 보고, 관리자는 회사를 골라 본다. 작업장명을 누르면 해당 작업장의 전지작업 화면으로 이동한다.
> - **전지작업은 작업장 단위**로 동작한다. 웹 업로드 사진은 `pruning-photos/{workplace_id}/...`에 저장하고, 모바일 앱 사진은 `photo_uploads.workplace_id`(신규 열)로 연결한다.
> - **화면 구조/디자인**: 상단 흰색 헤더(오른쪽에 사용자명·소속·로그아웃)와 흰색 사이드바, 밝은 보라 톤 + 녹색 버튼. 디자인 기준은 `src/DESIGN.md`, 적용 규칙은 `DESIGN.md`, 색상은 `src/index.css`의 `@theme` 토큰(2026-09-27 변경).
> - AI 분석 결과는 여전히 DB에 저장되지 않는다(새로고침 시 재분석 필요).

> ⚠️ **2026-09-18 업데이트**: 아래 문서는 작성 당시(2026-09-14) 기준 기록이다. 이후 전지작업 사진 저장소는 **Vercel Blob에서 Supabase Storage(`pruning-photos` 버킷)로 완전히 이전**했고, Vercel 프로젝트도 `pole-number`를 삭제하고 `wattline-web` 하나로 통합했다. `BLOB_READ_WRITE_TOKEN` 등 아래 언급된 Blob 관련 환경변수/스토어는 더 이상 쓰이지 않는다. 최신 상태는 `docs/신규앱.md` 1장을 참고.

## 무엇을 했나

1. **좌측 사이드바 도입** — 기존 상단 헤더의 ☰ 드롭다운 메뉴를 없애고 좌측 고정 사이드바로 교체.
   - 주 메뉴: **번호찰추출**(기존 화면), **전지작업**(신규 화면)
   - 하단 메뉴: **번호찰이란?** → **AI 설정** 순서
   - "한전 전산화번호 검색" 메뉴는 사용자 요청으로 삭제됨
   - 모바일: 상단 바 + 슬라이드인 드로어 방식 유지
2. **전지작업 사진 첨부 화면 신설** — 전지작업 관련 사진을 드래그앤드롭/클릭으로 업로드, 썸네일 목록 표시, 개별 삭제 기능.
   - 사진은 **Vercel Blob**(Public 스토어)에 저장됨
   - 클라이언트에서 업로드 전 리사이즈(긴 변 1600px, JPEG 90%)하여 Serverless 요청 본문 제한(4.5MB) 회피

## 변경/신규 파일

| 파일 | 설명 |
|---|---|
| `src/components/Sidebar.tsx` (신규) | 사이드바 UI, 데스크톱 고정 + 모바일 드로어 |
| `src/components/PruningWork.tsx` (신규) | 전지작업 사진 첨부/목록/삭제 화면 |
| `src/lib/resizeImage.ts` (신규) | `DropZone.tsx`에서 분리한 이미지 리사이즈 유틸 (동작 변경 없음) |
| `providers/handlePruningRequest.ts` (신규) | Blob 목록조회(`list`)/업로드(`put`)/삭제(`del`) 공용 로직 |
| `api/pruning.ts` (신규) | Vercel 서버리스 핸들러 (GET/POST/DELETE) |
| `server.ts` | 로컬 dev용 `/api/pruning` 라우트 3개 추가 (Express) |
| `src/App.tsx` | 사이드바 레이아웃으로 재구성, `view`에 `"pruning"` 추가 |
| `src/components/DropZone.tsx` | 리사이즈 로직을 `resizeImage.ts` 참조로 변경 |
| `package.json` | `@vercel/blob` 의존성 추가 |

커밋: `c842ead` — "feat: add sidebar navigation and pruning-work photo attachment screen" (main에 push 완료)

## 배포 상태

- **URL**: https://wattline-web.vercel.app/
- main push → Vercel 자동 빌드(GitHub 연동), 정상 배포 확인됨
- **Vercel Blob 스토어**: `pole-number-blob` (Public 접근, region iad1) 생성 및 `wattline-web` 프로젝트에 연결 완료 (Production/Preview 환경변수: `BLOB_READ_WRITE_TOKEN`, `BLOB_STORE_ID`, `BLOB_WEBHOOK_PUBLIC_KEY`)
- 연결 후 1회 수동 Redeploy 필요했음 (환경변수 연결은 기존 실행 중인 함수에 즉시 반영되지 않음)
- 확인: `curl https://wattline-web.vercel.app/api/pruning` → `{"photos":[]}` (HTTP 200) 정상

## 참고사항 / 주의점

- **로컬 개발 시**: `BLOB_READ_WRITE_TOKEN`이 없으면 전지작업 업로드가 "파일 저장소가 연결되어 있지 않습니다" 오류를 반환함(의도된 동작). 로컬에서 실제 업로드까지 테스트하려면 `vercel env pull`로 토큰을 받아와야 함 (단, 현재 `server.ts`는 dotenv 로딩 코드가 없어 `.env.local`을 자동으로 읽지 않음 — 필요 시 추가 작업 필요).
- **`tsx server.ts`는 파일 변경을 자동 감지하지 않음** — `server.ts`/`api/`/`providers/` 등 서버 코드를 고치면 개발 서버를 껐다 켜야 반영됨 (프론트 `src/`는 Vite HMR로 자동 반영).
- 실제 Blob 토큰 값 등 민감 정보는 `docs-private.md` (git에 커밋되지 않음, `.gitignore` 등록됨)에 기록되어 있음.
- 저장소(GitHub `TonnamChoi/WattLineWeb`)는 **public** 저장소이므로, 토큰/키는 절대 코드나 커밋에 직접 넣지 말 것.

## 남은 일 / 다음에 이어서 할 수 있는 것

- 브라우저 자동화 도구(chromium-cli/playwright)가 이 환경에 없어, 실제 화면에서 드래그앤드롭 업로드 등은 사용자가 직접 확인함(스크린샷으로 확인됨, 정상 동작).
- 향후 사진에 메타데이터(작업 위치, 날짜, 담당자 등)를 연결해야 한다면 Supabase(Postgres+Storage)로의 이전을 고려할 수 있음(현재는 Vercel Blob으로 충분히 커버됨 — 2026-09-14 논의 결과 "일단 Vercel로" 결정).

## 추가 — 전지작업 AI 자동 분석 기능 (2026-09-14, 같은 날 후속 작업)

전지작업 화면을 "사진 첨부만"에서 **번호찰추출과 동일한 AI 자동 추출 파이프라인**으로 확장. 설계 배경/결정사항 전체는 [`docs/superpowers/specs/2026-09-14-pruning-ai-extraction-design.md`](docs/superpowers/specs/2026-09-14-pruning-ai-extraction-design.md) 참고.

**핵심 동작**: 사진 1장 업로드 = 행 1개. 업로드 즉시 (a) Vercel Blob에 저장 + (b) AI가 사진을 분석해 전주번호/수목종류/준공내역(굵기별 본수)/작업강도/나무분류/경간구분/작업내용을 자동 추출 → 번호찰추출과 같은 표(정확도/판독상태/재분석/상세보기)로 표시.

**신규/변경 파일**
| 파일 | 설명 |
|---|---|
| `providers/pruningTypes.ts`, `pruningPrompt.ts`, `pruningExtract.ts` (신규) | 전지작업 전용 추출 스키마·프롬프트·3개 AI 프로바이더(Claude/Gemini/OpenAI) 호출 로직. 기존 번호찰추출용 `providers/claude.ts` 등은 건드리지 않고 **병렬로 새로 작성**함 (Gemini/OpenAI는 구조화 스키마가 필드에 강하게 결합돼 있어 프롬프트만 바꾸는 리팩터링이 불가능했음) |
| `providers/handlePruningExtractRequest.ts`, `api/pruning-extract.ts` (신규) | `/api/pruning-extract` 엔드포인트 (기존 `/api/extract` 패턴과 동일) |
| `src/components/PruningTable.tsx`, `PruningDetail.tsx` (신규) | `PoleTable`/`PoleDetail`과 같은 UX (검색, TSV/CSV 내보내기, 정확도 바, 상세 수정 모달). 상세 모달에는 참고용 사진 2장 추가 첨부 기능 포함 |
| `src/types.ts` | `DiameterCounts`, `PruningRecord` 타입 추가 |
| `src/components/PruningWork.tsx` | 업로드 시 Blob 저장과 AI 분석을 동시에 실행하도록 재작성 (기존 "업로드만" 로직 대체) |
| `server.ts` | `/api/pruning-extract` 로컬 dev 라우트 추가 |

**중요 결정/제약**
- AI 분석 결과는 **새로고침하면 사라짐** (번호찰추출과 동일 — 메모리에만 보관, DB 없음). 사진 자체는 Blob에 남지만 재분석이 필요함.
- 사진 1장 = 나무 1그루로 가정하고 프롬프트에서 지시함. 밑동 굵기 구간·작업강도(강전지/약전지) 판단은 사진만으로는 부정확할 수 있어 AI에게 보수적인 confidence를 매기도록 지시했고, 상세보기에서 모든 필드를 수동 수정 가능하게 해둠.
- 실제 로컬 브라우저 테스트(전주번호찰 샘플 이미지로) 결과: AI가 "사진에 나무가 없다"는 것까지 정확히 인지하고 reasoning에 남김 — 프롬프트가 의도대로 동작함을 확인.
