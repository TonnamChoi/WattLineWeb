# WattLineWeb — 디자인 가이드

이 문서는 UI/비주얼 디자인 시스템(색상·타이포그래피·레이아웃·컴포넌트 패턴)을 다룹니다.
기능 명세·아키텍처는 `README.md`, 변경 이력·정책 결정 배경은 `HANDOFF.md`와 `docs/`를 참고하세요.

> **기준**: WattLine 두 프로그램(WattLineApp, WattLineWeb)은 같은 디자인을 쓴다. 이 문서는 **WattLineApp의 디자인(`docs/WattLineApp-DESIGN.md`)을 기준**으로, 그 색상·글꼴·모서리·아이콘을 웹에 맞게 옮긴 것이다. 앱 디자인이 바뀌면 이 문서도 따라 고친다.

## 1. 컨셉

- **WattLineApp과 같은 다크 테마**: 짙은 남청색 배경 위에 녹색(정상·완료·주요 동작), 파랑(정보·선택), 앰버(경고), 빨강(삭제·오류)을 포인트로 쓴다.
- 앱은 현장 작업자용 모바일 화면이고, 웹은 회사 담당자용 **데스크톱 관리 도구**다. 그래서 색·글꼴·모서리는 앱과 맞추고, 레이아웃은 표와 데이터 편집에 맞게 넓게 쓴다.
- 화려한 장식보다 표·데이터 가독성과 정확성을 우선한다.

## 2. 로고 / 아이콘 (`icons/`)

| 파일 | 크기 | 용도 |
|---|---|---|
| `icons/icon-192.png` | 192×192 | 파비콘, 헤더 로고, 로그인 화면 로고 |
| `icons/icon-512.png` | 512×512 | 큰 로고가 필요한 곳 (예비) |
| `icons/logo-app.png` | 512×512 | 원본 로고 이미지 |
| `icons/logo-app.psd` | — | 로고 원본 편집 파일 (코드에서 쓰지 않음) |

- 로고는 WattLineApp과 같은 이미지다(전주·버킷 작업자·수목, 파랑→녹색 그라디언트 배경의 둥근 사각형).
- 코드에서는 `import logoUrl from "../../icons/icon-192.png"`처럼 가져와 쓴다. `index.html`의 파비콘은 `/icons/icon-192.png`를 가리킨다. 두 경우 모두 Vite가 빌드 결과물에 포함한다.
- 로고는 모서리를 둥글게(`rounded-lg`) 표시하고, 로고 위에 다른 아이콘을 겹치지 않는다.

## 3. 색상

WattLineApp의 CSS 토큰(`styles.css :root`)과 **같은 값**을 쓴다. 웹에서는 `src/index.css`의 Tailwind v4 `@theme`에 같은 이름으로 등록한다(예: `bg-panel`, `text-text-soft`).

| 토큰 | 값 | 용도 |
|---|---|---|
| `bg` | `#07141c` | 페이지 전체 배경 |
| `bg-2` | `#0b1b28` | 헤더·사이드바 등 보조 배경 |
| `panel` | `#101f2c` | 카드·표·모달 등 기본 패널 |
| `panel-2` | `#132a3c` | 강조 패널, 표 헤더, 입력창, hover 배경 |
| `line` | `rgba(151, 189, 216, 0.18)` | 외곽선·구분선 |
| `text` | `#edf8ff` | 제목·본문 |
| `text-soft` | `#9ab2c2` | 보조 텍스트, 라벨, 설명 |
| `green` | `#47d9a3` | 정상·완료, **주요 동작 버튼**, 높은 정확도 |
| `green-strong` | `#1ecf8f` | 주요 버튼 hover, 강조 정상 상태 |
| `blue` | `#4ea8ff` | 정보·선택된 메뉴·링크, 중간 정확도 |
| `amber` | `#ffbf6a` | 경고·주의, 미완료, 안전거리 |
| `red` | `#ff7e7e` | 삭제·오류·실패, 낮은 정확도 |

- 옅은 배경이 필요하면 새 색을 만들지 않고 투명도를 쓴다(예: `bg-green/15`, `bg-red/15`, `border-blue/30`).
- 녹색·파랑처럼 밝은 배경 위의 글자는 어두운 `bg`색(`text-bg`)으로 쓴다(대비 확보).
- 정확도 표시: 90% 이상 `green`, 70% 이상 `blue`, 그 미만 `red`.
- 상태 배지: 완료 `green`, 미완료/주의 `amber`, 실패/삭제 `red`, 안내 `blue`.

## 4. 타이포그래피

- 글꼴: Google Fonts **`Inter`** (`index.html`에서 로드). 한글은 시스템 글꼴(맑은 고딕 등)로 대체된다.
- 기본 글자색 `text`(`#edf8ff`), 보조 글자색 `text-soft`(`#9ab2c2`).
- 제목과 버튼 글자는 굵게(`font-bold`~`font-extrabold`, 700~800).
- 작은 상태 라벨은 대문자 표기와 자간(`tracking-wide`)으로 구분한다(앱과 동일).
- **웹 전용 규칙**: `src/index.css`에서 `text-xs`~`text-lg`와 임의 크기를 모두 14px로 통일한다. 크기 대신 굵기와 색으로 위계를 만든다.

## 5. 모서리 / 간격

앱의 값을 그대로 쓴다.

| 요소 | 값 | Tailwind |
|---|---|---|
| 작은 버튼·입력창 | 10px | `rounded-[10px]` |
| 주요 액션 버튼 | 16px | `rounded-2xl` |
| 모달·팝업 | 18px | `rounded-[18px]` |
| 일반 카드·패널 | 22px | `rounded-[22px]` |
| 카드 내부 패딩 | 16px | `p-4` |
| 섹션 간격 | 16px | `space-y-4` |

## 6. 레이아웃 / 셸 구조 (웹 전용)

- **상단 고정 헤더**(`h-14`, `bg-bg-2`, 아래 `border-line`) + 그 아래 **좌측 사이드바**(폭 168px, `bg-bg-2`, 오른쪽 `border-line`) + 본문(`bg-bg`). 헤더와 사이드바는 `src/components/Sidebar.tsx`에 있다.
  - 헤더 왼쪽: 로고(`icons/icon-192.png`) + 앱 이름/부제. 오른쪽: 사용자명(`OOO 님`) + 소속 회사 배지 + 아바타 + 로그아웃.
  - 사이드바 메뉴 글자는 `text-soft`, hover는 `bg-panel-2 text-text`, **선택된 메뉴는 `bg-blue/15 text-blue`**.
  - 메뉴 순서: 작업장 목록 → 전지작업 → 작업장(admin·company_admin) → 번호찰추출 → 설정(관리자) 그룹(회사/사용자, admin만) → 하단 메뉴(수목전지 기초, 번호찰이란?, AI 설정) → 버전 표시
  - 모바일: 헤더 왼쪽 ☰ 버튼 → 슬라이드인 드로어
- 로그인 화면(`LoginPage.tsx`): 셸 없이 `bg-bg` 위에 중앙 카드 하나(`max-w-sm`, `bg-panel`, `rounded-[22px]`), 카드 위쪽에 로고.
- 화면 전환은 `App.tsx`의 `view` 상태로 한다(라우터 없음).

## 7. 컴포넌트 패턴

### 카드 / 패널
```
rounded-[22px] border border-line bg-panel p-4
```

### 주요 버튼 (저장, 추가, 로그인, 분석 시작 등)
```
rounded-2xl bg-green px-4 font-bold text-bg hover:bg-green-strong disabled:opacity-60
```

### 보조 버튼
```
rounded-[10px] border border-line bg-panel-2 text-text hover:border-blue/50
```

### 삭제 버튼
```
rounded-[10px] bg-red/15 text-red hover:bg-red/25
```

### 입력창 / 선택창
```
rounded-[10px] border border-line bg-panel-2 text-text placeholder:text-text-soft focus:border-blue
```

### 표(Table)
- 카드 안에 표를 두고, 위쪽에 검색 입력과 내보내기(TSV/CSV) 버튼을 둔다(`PoleTable`, `PruningTable`, `AdminPanel`, `WorkplaceList`).
- 헤더 `bg-panel-2 text-text-soft`, 행 구분선 `divide-line`, 행 hover `hover:bg-panel-2`.
- 가로 스크롤이 생기지 않도록 열이 많으면 행을 나눈다(`PruningTable`의 2단 행 참고).

### 모달
- 배경: 반투명 어두운 오버레이 + 블러(`bg-black/60 backdrop-blur-[3px]`) — 앱의 분류 팝업과 동일
- 본문: `rounded-[18px] bg-panel border border-line`, 헤더/하단 영역은 `border-line`으로 구분
- 삭제 확인은 브라우저 `confirm()` 대신 모달 안의 삭제 버튼으로 받는다.
- `role="dialog"`, `aria-modal="true"`를 붙인다.

### 모션
- 로딩 스피너(`animate-spin`) 외의 애니메이션은 최소화한다(데이터 입력 위주 업무 도구 성격).

## 8. 확장 시 원칙

1. 새 색을 즉흥적으로 추가하지 말고 3장 팔레트 안에서 조합한다. 녹색(주요 동작·완료), 앰버(경고), 빨강(삭제·오류)의 의미를 섞어 쓰지 않는다.
2. 새 화면은 항상 `bg-bg` 배경 위에 7장의 카드 패턴을 쓴다.
3. 앱과 웹이 같은 색과 로고를 쓰므로, 한쪽을 바꾸면 다른 쪽 `DESIGN.md`에도 반영한다.
4. 이 문서와 실제 코드가 어긋나면 코드가 우선한다. 변경 시 이 문서도 함께 현행화할 것.
