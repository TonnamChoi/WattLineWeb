# WattLineWeb

한전 수목전지작업 앱/웹 관리프로젝트

## ⚠️ 필수 참고: WattLine 프로젝트 구성

WattLine 프로젝트는 **한전 수목전지작업 프로젝트**이며, GitHub 기준으로 별도의 프로그램 2개로 이루어져 있다.

| 구분 | WattLineApp | WattLineWeb (이 프로젝트) |
|---|---|---|
| 사용자 | 현장 작업자 | 각 회사(한전 협력사) 담당자 |
| 역할 | 현장에 출동해 스마트폰 앱으로 작업 사진을 찍고 업로드 | 현장 작업자에게 작업을 지시하고, 업로드된 사진과 전지작업 내용을 편집·관리해 **한전에 보낼 엑셀 자료**를 만듦 |
| Vercel 도메인 | https://wattline-app.vercel.app/ | https://wattline-web.vercel.app/ |
| 로컬 개발 | http://localhost:4000/ | http://localhost:4004/ |

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
- 디자인 규칙은 `DESIGN.md`를 따른다.

# Web 버전 (현장에서 업로드한 사진을 관리)

https://wattline-web.vercel.app/
http://localhost:4004/ WattLineWeb

# App 버전 (현장에서 사직을 찍어 업로드)

https://wattline-app.vercel.app/
http://localhost:4000/ WattLineApp

## 👤 제작자

- **이름**: Rian
- **이메일**: therianchoi@gmail.com
- **변경정보**
  2026.09.08 최초제작
