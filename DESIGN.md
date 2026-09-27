# WattLineWeb — 디자인 기준 (Deep Violet Admin v2)

> **이 문서가 WattLineWeb 디자인의 유일한 기준이다.** (2026-09-27 확정, v0.4 기준 코드와 일치)
> 색·글꼴·모서리·그림자는 여기 적힌 값만 쓴다. 새 값이 필요하면 이 문서를 먼저 고친 뒤 코드를 바꾼다.
> 구현 위치: 토큰 `src/index.css`, 셸(상단바·사이드바) `src/components/Sidebar.tsx`, 글꼴 `index.html`.
> 이전 기준(WattLineApp 다크 테마 `docs/WattLineApp-DESIGN.md`, Delivery App v1 밝은 테마)은 더 이상 쓰지 않는다.

## 1. 원칙

- **어두운 틀, 밝은 작업 영역**: 상단바·사이드바는 짙은 보라, 본문은 밝게. 시선이 곧바로 데이터로 간다.
- **동작 색은 하나**: 보라(`accent`, 코드의 `blue`)만 주요 버튼·링크·선택에 쓴다. 녹색·주황·빨강은 **상태 표시 전용**이다.
- **라임은 셸에서만**: 상단바의 작은 배지(소속 회사)에만 쓴다. 밝은 본문에는 쓰지 않는다.
- **읽기 쉬움 우선**: 모든 글자/배경 조합은 대비 4.5:1 이상. `text-muted`는 placeholder·비활성 글자에만 쓴다. **글자에 투명도를 주지 않는다**(비활성 버튼 `disabled:opacity-*`만 예외).
- **평평하게**: 그림자 대신 1px `line`으로 구분한다.
- 순수 검정(`#000`)·순수 회색은 쓰지 않는다. 모든 중립색에 보라 기운을 넣는다.

## 2. 색상 토큰 (`src/index.css` `@theme`)

코드 클래스명은 역할 이름이다(예: `bg-panel`, `text-text-soft`, `bg-blue`).

### 2.1 본문 (Body)

| 클래스 | 값 | 용도 | 대비 |
|---|---|---|---|
| `bg-bg` | `#F4F1F8` | 페이지 배경 | — |
| `bg-panel` | `#FFFFFF` | 카드·표·입력창·모달 | — |
| `bg-panel-2` | `#ECE6F4` | 표 헤더, 중립 칩, hover | — |
| `border-line` | `#E3DCEC` | 1px 테두리·구분선 | — |
| `text-text` | `#1E1433` | 제목, 표 값 | 15.6:1 |
| `text-text-soft` | `#5E5373` | 설명, 표 헤더, 라벨 | 6.3:1 |
| `text-text-muted` | `#8C80A0` | placeholder·비활성 **전용** | 3.7:1 |

### 2.2 브랜드 · 동작

| 클래스 | 값 | 용도 |
|---|---|---|
| `bg-blue` / `text-blue` | `#7203FF` | accent: 주요 버튼, 링크, 포커스, 선택 (흰 글자 대비 6.6:1) |
| `bg-blue-hover` | `#5E00D6` | 버튼 hover·눌림 |
| `bg-violet-soft` | `#EEE4FF` | 선택된 행, 활성 필터 칩 |
| `bg-input` | `#FAF4E6` | 표 안 입력칸(글자·숫자) 바탕 (베이지) |

### 2.3 상태 (배지 = 글자색 + 같은 색 15% 배경)

| 클래스 | 값 | 의미 |
|---|---|---|
| `green` | `#05704A` | 완료 · 성공 · 정확도 90%↑ |
| `amber` | `#9A5700` | 미완료 · 대기 · 주의 |
| `red` | `#BE2537` | 오류 · 삭제 · 실패 · 정확도 70% 미만 |
| (중립) | `text` on `panel-2` | 전체 N 같은 개수 칩 |

- 정확도 막대: 90%↑ `green`, 70%↑ `blue`, 미만 `red`.

### 2.4 셸 (상단바 · 사이드바)

| 값 | 용도 |
|---|---|
| `#2D0C57` | 상단바 배경 (`bg-bg-2`) |
| `#24104A` | 사이드바 배경 (상단바보다 한 단계 어둡게) |
| `#F4EEFF` | 앱 이름, 사용자명, hover·선택 메뉴 글자 (14.2:1) |
| `#B9ACD3` | 메뉴 기본 글자, 부제, 아이콘 (7.6:1) |
| 흰색 6~8% | 메뉴·아이콘 버튼 hover |
| `rgba(155,107,255,.24)` | 선택된 메뉴 배경 |
| `#CBF265` on 라임 16% | 소속 회사 배지 |
| 흰색 8% | 셸 안 구분선 |

**구현 방식 — 셸 범위 재정의**: `src/index.css`의 `header { ... }`, `aside { ... }` 규칙이 셸 안에서만 같은 토큰을 다크용 값으로 바꾼다. 그래서 `Sidebar.tsx`는 본문과 같은 클래스를 쓰면서 셸 색으로 그려진다.

| 셸 안 클래스 | 바뀌는 값 |
|---|---|
| `text-text` | `#F4EEFF` |
| `text-text-soft` | `#B9ACD3` |
| `bg-panel-2` | 흰색 8%(header) / 6%(aside) |
| `border-line` | 흰색 8% |
| `bg-violet-soft` | 라임 16%(header 배지) / 보라 24%(aside 선택 메뉴) |
| `text-blue` | `#CBF265`(header 배지) / `#FFFFFF`(aside) |
| `bg-bg-2` (aside) | `#24104A` |

⚠️ **본문 컴포넌트에서 `<header>`, `<aside>` 태그를 쓰지 않는다.** 쓰면 그 안이 셸 색이 된다(`<div>`를 쓸 것).

## 3. 글꼴

- `"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, "Segoe UI", Roboto, "Malgun Gothic", sans-serif`
- Pretendard는 `index.html`에서 jsDelivr CDN(`pretendardvariable-dynamic-subset`)으로 불러온다.
- **글자 크기는 14px로 통일**: `src/index.css`가 `text-xs`~`text-lg`와 임의 크기(`text-[10px]` 등)를 모두 14px로 맞춘다. 위계는 크기가 아니라 굵기와 색으로 만든다.

| 용도 | 굵기 | 색 |
|---|---|---|
| 화면 제목 ("작업장 목록") | `font-bold` | `text` |
| 카드·섹션 제목 | `font-semibold` | `text` |
| 설명 문구 | 보통 | `text-soft` |
| 표 값 | 보통 | `text` |
| 표 헤더 | `font-medium` | `text-soft` |
| 라벨·메뉴 | `font-medium`~`font-semibold` | `text` (셸 안은 2.4 규칙) |
| 버튼 | `font-semibold` | 흰색 on `blue` |
| 상태 배지 | `font-semibold` | 상태색 |

## 4. 모서리 · 간격 · 그림자

| 요소 | 값 | Tailwind |
|---|---|---|
| 버튼·입력창·카드·메뉴·썸네일 (기본) | 8px | `rounded-lg` |
| 칩·배지·아바타 | 원형 | `rounded-full` |
| 모달 | 24px | `rounded-3xl` |

- 다른 모서리 값(`rounded`, `rounded-xl`, `rounded-[22px]` 등)을 쓰지 않는다.
- 간격: 4 · 8 · 12 · 16 · 20 · 24 · 32 px.
- 그림자: 기본 없음. 모달·사진 미리보기·모바일 드로어만 `shadow-card`(`0 8px 24px rgba(30,20,51,.12)`).

## 5. 레이아웃

- **상단바**: `h-14`, 화면 위 고정, `#2D0C57`.
  - 왼쪽: 로고 32px(`icons/icon-192.png`) + "수목전지 작업관리"(굵게) / 부제(`text-soft`).
  - 오른쪽: 사용자명 + 소속 회사 배지(라임) + 아바타 + 로그아웃 아이콘 버튼.
  - 모바일: 왼쪽 ☰ 버튼으로 드로어를 연다.
- **사이드바**: 폭 168px, 상단바 아래 고정, `#24104A`.
  - 메뉴: 기본 `text-soft`, hover `bg-panel-2` + `text`, 선택 `bg-violet-soft` + `text` + 굵게, 모서리 8px, 아이콘 16px.
  - 순서: 작업장 목록 → 전지작업 → 작업장(admin·company_admin) → 번호찰추출 → **설정(관리자)** 그룹(회사, 사용자 — admin만) → 하단(수목전지 기초, 번호찰이란?, AI 설정) → 버전 표시
- **본문**: `bg-bg`, 콘텐츠 블록은 `bg-panel` + 1px `line` + `rounded-lg`. 전지작업 화면은 좌우 여백을 줄여 넓게, 나머지는 `max-w-7xl`.
- **로그인 화면**: 셸 없이 `bg-bg` 위 중앙 카드(`max-w-sm`, `bg-panel`, 1px `line`, `rounded-lg`), 카드 위쪽에 로고와 앱 이름.
- 화면 전환은 `App.tsx`의 `view` 상태로 한다(라우터 없음).

## 6. 컴포넌트 패턴

| 패턴 | 클래스 |
|---|---|
| 카드/패널 | `rounded-lg border border-line bg-panel p-4` |
| 주요 버튼 (화면당 1개 권장) | `rounded-lg bg-blue text-white font-semibold hover:bg-blue-hover disabled:opacity-60` |
| 성공 상태 버튼 ("저장됨") | `rounded-lg bg-green text-white` |
| 보조 버튼 | `rounded-lg border border-line bg-panel text-text hover:bg-panel-2` |
| 아이콘 버튼 | `rounded-lg border border-line bg-panel text-text-soft` |
| 텍스트 링크 | `text-blue font-semibold underline` |
| 삭제 버튼 | `rounded-lg bg-red/10 text-red hover:bg-red/15` |
| 입력창·선택창 | `rounded-lg border border-line bg-panel text-text focus:border-blue` |
| 상태 배지 | `rounded-full px-2 bg-{green|amber|red}/15 text-{green|amber|red} font-semibold` |
| 중립 칩 (전체 N) | `rounded-full bg-panel-2 text-text` |
| 표 | 컨테이너 `bg-panel border border-line rounded-lg`, 헤더 `bg-panel-2 text-text-soft font-medium`, 행 구분 `divide-line`, 행 hover `hover:bg-panel-2`, 링크 셀 `text-blue underline` |
| 모달 | 오버레이 `bg-black/60 backdrop-blur-[3px]` + 본문 `rounded-3xl bg-panel border border-line shadow-card`, `role="dialog"`, 삭제 확인은 `confirm()` 대신 모달 안 버튼 |
| 아이콘 | Lucide(`lucide-react`), 선 굵기 2 |

## 7. 규칙

1. 새 색·모서리·글자 크기를 만들지 않는다. 필요하면 **이 문서를 먼저 고친다**.
2. 상태는 항상 배지(옅은 배경 + 글자색 + 라벨)로 표시한다. 색만으로 구분하지 않는다.
3. 녹색 채움 버튼은 "저장됨" 같은 성공 상태에만 쓴다. 동작 버튼은 보라.
4. 코드와 이 문서가 어긋나면 **이 문서가 기준**이다. 코드를 바꿀 일이 생기면 이 문서도 함께 고친다.
