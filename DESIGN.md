# WattLineWeb — 디자인 적용 가이드

> **기준 문서: [`src/DESIGN.md`](src/DESIGN.md) — Deep Violet Admin v2** (2026-09-27 적용)
> 색·글꼴·모서리·그림자 값은 모두 그 문서를 따른다. 이 파일은 그 기준을 **이 웹에 어떻게 적용했는지**만 적는다.
> 이전 기준(WattLineApp 다크 테마, Delivery App v1 밝은 테마)은 더 이상 쓰지 않는다.

## 1. 원칙 (src/DESIGN.md 1장)

- **어두운 틀, 밝은 작업 영역**: 상단바·사이드바는 짙은 보라, 본문은 밝게.
- **동작 색은 하나**: 보라(`accent` = 코드의 `blue`)만 주요 버튼·링크·선택에 쓴다. 녹색·주황·빨강은 **상태 표시 전용**이다.
- **라임(lime)은 셸에서만**: 상단바의 작은 배지(소속 회사)에만 쓴다.
- **읽기 쉬움 우선**: 모든 글자/배경 조합은 대비 4.5:1 이상. `text-muted`는 placeholder·비활성 글자에만 쓴다. 글자에 투명도를 주지 않는다.
- **평평하게**: 그림자 대신 1px `line`으로 구분한다.

## 2. 토큰 구현 (`src/index.css`)

src/DESIGN.md 8장 코드를 그대로 옮겼다. 코드 클래스명은 기존 이름을 유지한다.

| 코드 클래스 | 본문 값 | src/DESIGN.md 토큰 |
|---|---|---|
| `bg-bg` | `#F4F1F8` | bg |
| `bg-panel` | `#FFFFFF` | panel |
| `bg-panel-2` | `#ECE6F4` | panel-2 (표 헤더, hover, 중립 칩) |
| `border-line` | `#E3DCEC` | line |
| `text-text` | `#1E1433` | text |
| `text-text-soft` | `#5E5373` | text-soft |
| `text-text-muted` | `#8C80A0` | text-muted (placeholder·비활성만) |
| `bg-blue` / `text-blue` | `#7203FF` | **accent** (주요 버튼·링크·선택) |
| `bg-blue-hover` | `#5E00D6` | accent-hover |
| `bg-violet-soft` | `#EEE4FF` | accent-soft |
| `green` / `amber` / `red` | `#05704A` / `#9A5700` / `#BE2537` | 상태: 완료 / 미완료·주의 / 오류·삭제 |
| `bg-bg-2` | `#2D0C57` (상단바), `#24104A` (사이드바) | shell-top / shell-side |

### 셸 범위 재정의
`src/index.css`의 `header { ... }`, `aside { ... }` 규칙이 **셸 안에서만** 토큰 값을 다크용으로 바꾼다(src/DESIGN.md 8장). 그래서 `Sidebar.tsx`는 본문과 같은 클래스(`text-text`, `text-text-soft`, `bg-panel-2`, `border-line`)를 쓰면서도 어두운 배경 위 밝은 글자로 그려진다.

| 셸 안에서 | 값 | 쓰임 |
|---|---|---|
| `text-text` | `#F4EEFF` | 앱 이름, 사용자명, hover·선택된 메뉴 글자 |
| `text-text-soft` | `#B9ACD3` | 메뉴 기본 글자, 부제, 아이콘 |
| `bg-panel-2` | 흰색 6~8% | 메뉴·아이콘 버튼 hover |
| `bg-violet-soft` (header) + `text-blue` | 라임 16% 배경 + `#CBF265` | 소속 회사 배지 |
| `bg-violet-soft` (aside) | `rgba(155,107,255,.24)` | 선택된 메뉴 배경 |

⚠️ **본문 컴포넌트에서 `<header>`, `<aside>` 태그를 쓰지 않는다.** 쓰면 그 안이 다크 셸 색이 된다(필요하면 `<div>` 사용).

- 정확도 막대: 90%↑ `green`, 70%↑ `blue`, 미만 `red`.

## 3. 글꼴

- **Pretendard** (`index.html`에서 jsDelivr CDN으로 로드), 없으면 SF Pro → Inter → Segoe UI → 맑은 고딕.
- 크기: src/DESIGN.md 3장은 12~18px를 쓴다. 이 웹은 `src/index.css`에서 `text-xs`~`text-lg`를 모두 **14px**(`table`/`label` 크기)로 통일해 두었다(기존 사용자 요청). 위계는 굵기와 색(`text` / `text-soft`)으로 만든다.

## 4. 모서리 / 그림자

| 요소 | 값 | Tailwind |
|---|---|---|
| 버튼·입력창·카드·메뉴 (기본) | 8px | `rounded-lg` |
| 칩·배지·아바타 | full | `rounded-full` |
| 모달 | 24px | `rounded-3xl` |

- 그림자 기본 없음. 모달·미리보기·드로어만 `shadow-card`(`0 8px 24px rgba(30,20,51,.12)`).

## 5. 레이아웃 (`src/components/Sidebar.tsx`, `App.tsx`)

- **상단바**: `h-14`, 고정, `#2D0C57`. 왼쪽 로고 32px + "수목전지 작업관리" / 부제. 오른쪽 사용자명 + 소속 배지(라임) + 아바타 + 로그아웃.
- **사이드바**: 폭 168px, `#24104A`. 메뉴 기본 `text-soft`, hover `bg-panel-2` + `text`, 선택 `bg-violet-soft` + `text` + 굵게.
  - 순서: 작업장 목록 → 전지작업 → 작업장(admin·company_admin) → 번호찰추출 → 설정(관리자)(회사/사용자, admin만) → 하단(수목전지 기초, 번호찰이란?, AI 설정) → 버전
- **본문**: `bg-bg`, 콘텐츠는 `bg-panel` + 1px `line` + `rounded-lg`.
- **로그인 화면**: 셸 없이 `bg-bg` 위 중앙 카드(`max-w-sm`).

## 6. 컴포넌트 패턴 (src/DESIGN.md 7장)

| 패턴 | 클래스 |
|---|---|
| 주요 버튼 (화면당 1개 권장) | `rounded-lg bg-blue text-white font-semibold hover:bg-blue-hover` |
| 보조 버튼 | `rounded-lg border border-line bg-panel text-text hover:bg-panel-2` |
| 아이콘 버튼 | `rounded-lg border border-line bg-panel text-text-soft` |
| 입력창·선택창 | `rounded-lg border border-line bg-panel focus:border-blue` |
| 상태 배지 | `rounded-full px-2 bg-{green|amber|red}/15 text-{green|amber|red} font-semibold` |
| 중립 칩 (전체 N) | `rounded-full bg-panel-2 text-text` |
| 표 | 컨테이너 `bg-panel border border-line rounded-lg`, 헤더 `bg-panel-2 text-text-soft font-medium`, 행 `divide-line`, 링크 셀 `text-blue underline` |
| 모달 | 오버레이 `bg-black/60 backdrop-blur-[3px]` + `rounded-3xl bg-panel border border-line shadow-card`, `role="dialog"` |

## 7. 원칙

1. 새 색·모서리·글자 크기를 만들지 않는다. 필요하면 src/DESIGN.md와 이 문서를 먼저 고친다.
2. 상태는 항상 배지(옅은 배경 + 글자색 + 라벨)로 표시한다. 색만으로 구분하지 않는다.
3. 코드와 문서가 어긋나면 코드가 우선이며, 바꿀 때 이 문서도 함께 고친다.
