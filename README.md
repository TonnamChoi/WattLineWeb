# WattLineWeb

한전 수목전지작업 앱/웹 관리프로젝트

# Web 버전 (현장에서 업로드한 사진을 관리)

https://wattline-web.vercel.app/
http://localhost:4004/ WattLineWeb

# App 버전 (현장에서 사직을 찍어 업로드)

https://wattline-app.vercel.app/
http://localhost:4000/ WattLineApp

## ⚠️ 필수 참고: WattLine 프로젝트 구성

WattLine 프로젝트는 **한전 수목전지작업 프로젝트**이며, GitHub 기준으로 별도의 프로그램 2개로 이루어져 있다.

| 구분          | WattLineApp                                           | WattLineWeb (이 프로젝트)                                                                                     |
| ------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 사용자        | 현장 작업자                                           | 각 회사(한전 협력사) 담당자                                                                                   |
| 역할          | 현장에 출동해 스마트폰 앱으로 작업 사진을 찍고 업로드 | 현장 작업자에게 작업을 지시하고, 업로드된 사진과 전지작업 내용을 편집·관리해 **한전에 보낼 엑셀 자료**를 만듦 |
| Vercel 도메인 | https://wattline-app.vercel.app/                      | https://wattline-web.vercel.app/                                                                              |
| 로컬 개발     | http://localhost:4000/                                | http://localhost:4004/                                                                                        |

- **프론트엔드는 두 프로젝트가 따로지만, DB는 같은 Supabase 프로젝트 `WattLine`을 함께 쓴다.**
- 따라서 DB 테이블·Storage 버킷을 바꿀 때는 반대편 프로젝트에 미치는 영향을 반드시 확인해야 한다. 예: `photo_uploads` 테이블과 `photos` 버킷은 WattLineApp이 쓰고, WattLineWeb은 이를 읽는다.
- **DB 전체 구조(WattLineApp 연동용)는 `docs/20260926_supabase-db-schema.md`**를 참고한다. 로그인·관리자 기능 상세는 `docs/2026-09-26-admin-schema.md`, 앱 쪽 기록은 `docs/HANDOFF_from_WattLineApp.md`에 있다.

## WattLineWeb 주요 기능

- **로그인**: `app_users` 계정으로 로그인해야 사용할 수 있다. 권한은 3단계다.
  - 관리자(`admin`): 전체 시스템 관리
  - 회사관리자(`company_admin`): 설정(관리자)을 뺀 모든 메뉴, 소속 회사 작업장 관리, WattLineApp 사진 업로드
  - 일반사용자(`worker`): WattLineApp 사진 업로드만 가능 (웹 로그인 불가)
- **작업장 목록** (첫 화면): 소속 회사의 작업장과 작업내용·기간·작업자·완료 여부를 본다. 관리자는 회사를 고를 수 있다.
- **전지작업**: 작업장별 사진(웹 업로드 + WattLineApp 업로드)을 AI로 분석해 전주번호·수목종류·준공내역 등을 표로 정리한다.
- **번호찰추출**: 전주번호찰 사진에서 선로명·전산화번호 등을 AI로 추출한다.
- **작업장** (관리자·회사관리자): 작업장을 추가·수정·삭제한다. 회사관리자는 소속 회사 작업장만 다룬다.
- **설정(관리자)** (관리자만): 회사 / 사용자를 추가·수정·삭제한다.
- **디자인 기준은 루트 `DESIGN.md`(Deep Violet Admin v2)** 하나다. 화면을 만들거나 고칠 때 반드시 따른다.

## 기술 스펙

| 구분 | 내용 |
|---|---|
| 런타임 | Node.js 20 이상 |
| 프론트엔드 | React 19 + TypeScript 5.8, Vite 6, Tailwind CSS 4 (`@tailwindcss/vite`, `src/index.css`의 `@theme` 토큰), lucide-react 아이콘, Pretendard 글꼴 |
| 백엔드 (로컬) | Express 4 (`server.ts`, `npm run dev` → http://localhost:4004, Vite 미들웨어로 프론트도 함께 제공) |
| 백엔드 (배포) | Vercel Serverless Functions (`api/*.ts`). 로컬과 배포가 같은 로직(`providers/`)을 공유한다 |
| DB · 저장소 | Supabase `WattLine` 프로젝트 (Postgres + Storage 버킷 `photos`, `pruning-photos`). WattLineApp과 공유. 서버에서만 Secret key로 접근(RLS 켜짐, 정책 없음) |
| 인증 | 자체 계정 테이블 `app_users` + scrypt 비밀번호 해시 + HMAC 서명 토큰(12시간). Supabase Auth는 쓰지 않음 |
| AI 분석 | Claude(`@anthropic-ai/sdk`) / Gemini(`@google/genai`) / OpenAI(`openai`) 중 선택. 사용자가 AI 설정에서 API 키를 직접 입력(BYOK, 브라우저 `localStorage` 보관) |
| 배포 | GitHub `main` push → Vercel 자동 배포 (https://wattline-web.vercel.app/) |
| 환경변수 | `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (로컬은 `.env.local`, 배포는 Vercel 환경변수) |

**명령어**

| 명령 | 설명 |
|---|---|
| `npm run dev` | 로컬 개발 서버 (포트 4004). 서버 코드(`server.ts`, `api/`, `providers/`)를 고치면 재시작 필요 |
| `npm run build` | 프론트 빌드(`dist/`) + 서버 번들(`dist/server.cjs`) |
| `npm run lint` | 타입 검사 (`tsc --noEmit`) |

## 폴더 구조

```
WattLineWeb/
├── api/                      # Vercel Serverless 진입점 (배포용, 로직은 providers/ 호출)
│   ├── auth.ts               #   로그인 / 세션 확인
│   ├── admin.ts              #   회사·사용자·작업장 CRUD (권한 검사)
│   ├── workplaces.ts         #   작업장 목록 (권한별 회사 제한)
│   ├── pruning.ts            #   전지작업 웹 업로드 사진 조회·업로드·삭제
│   ├── pruning-extract.ts    #   전지작업 사진 AI 분석
│   ├── wattline-db.ts        #   WattLineApp 업로드 사진 조회
│   └── extract.ts            #   전주번호찰 AI 추출
├── providers/                # 서버 공용 로직 (api/ 와 server.ts 가 함께 사용)
│   ├── handleAuthRequest.ts  #   로그인·토큰
│   ├── handleAdminRequest.ts #   관리 CRUD·권한
│   ├── handlePruning*.ts     #   전지작업 사진·AI 분석
│   ├── handleWattlineDbRequest.ts
│   ├── handleExtractRequest.ts
│   └── claude.ts / gemini.ts / openai.ts / *Prompt.ts / *Types.ts  # AI 프로바이더별 호출·프롬프트
├── src/                      # 프론트엔드 (React)
│   ├── App.tsx               #   화면 전환(view 상태), 로그인 게이트, 번호찰추출 화면
│   ├── index.css             #   디자인 토큰(@theme), 셸 색 재정의, 글자 크기 통일
│   ├── components/
│   │   ├── Sidebar.tsx       #     상단바 + 사이드바(메뉴, 사용자 정보)
│   │   ├── LoginPage.tsx     #     로그인 화면
│   │   ├── WorkplaceList.tsx #     작업장 목록 (첫 화면)
│   │   ├── PruningWork.tsx   #     전지작업 (작업장 선택·사진 업로드·AI 분석)
│   │   ├── PruningTable.tsx / PruningDetail.tsx
│   │   ├── AdminPanel.tsx    #     회사·사용자·작업장 관리
│   │   ├── PoleTable.tsx / PoleDetail.tsx / DropZone.tsx  # 번호찰추출
│   │   ├── SettingsPanel.tsx #     AI 설정 (API 키)
│   │   └── TreePruningGuide.tsx / AboutPlate.tsx          # 안내 화면
│   ├── lib/                  #   auth(토큰), settings, resizeImage, cropImage, asyncQueue, version
│   ├── assets/               #   안내 화면 이미지
│   └── types.ts
├── icons/                    # 로고·파비콘 (WattLineApp과 동일)
├── docs/                     # 설계·DB 구조·작업 기록 (새 파일은 yyyymmdd_ 접두어)
├── scripts/                  # docs-private.md 암호화 백업 (backup_private.bat, git 미포함)
├── server.ts                 # 로컬 개발용 Express 서버
├── index.html                # HTML 진입점 (파비콘, Pretendard 글꼴)
├── DESIGN.md                 # 디자인 기준 (Deep Violet Admin v2)
├── CLAUDE.md                 # AI 작업 규칙
├── HANDOFF.md                # 작업 인수인계 기록
└── docs-private.md           # 비밀 정보 메모 (git 제외)
```

## 👤 제작자

- **이름**: Rian
- **이메일**: therianchoi@gmail.com
- **변경정보**
  2026.09.08 최초제작
