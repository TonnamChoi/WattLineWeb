# WattLineWeb — 디자인 가이드

이 문서는 UI/비주얼 디자인 시스템(색상·타이포그래피·레이아웃·컴포넌트 패턴)을 다룹니다.
기능 명세·아키텍처는 `README.md`, 변경 이력·정책 결정 배경은 `HANDOFF.md`와 `docs/`를 참고하세요.

## 1. 컨셉

**"신뢰감 있는 공공/전력 서비스"**: 짙은 네이비를 주조색으로 쓰고, 강조/포인트는 앰버(주황빛 금색)로 대비를 준다.
KEPCO(한국전력) 배전선로 전주번호찰 추출·수목전지 작업 관리 도구라는 성격에 맞게, 화려한 장식보다 표·데이터 가독성과 정확성을 우선한다. **데스크톱 전용**을 기본으로 한다(모바일은 사이드바 드로어로 최소 대응).

## 2. 색상 (`src/index.css`의 Tailwind v4 `@theme` 토큰)

| 토큰 | 값 | 용도 |
|---|---|---|
| `navy` | `#0D3B66` | 사이드바 브랜드 영역, 주요 버튼, 활성 메뉴, 강조 텍스트 |
| `navy-dark` | `#082a4d` | 버튼 hover |
| `navy-light` | `#1a5290` | 보조 강조, 포커스 테두리 |
| `amber` | `#F4A228` | 포인트 컬러(배지, 하이라이트) |
| `amber-dark` | `#D4861A` | 앰버 hover/강조 텍스트 |
| `amber-light` | `#FEF3DC` | 앰버 배경(배지/칩, 주의 안내) |
| `surface` | `#FFFFFF` | 카드/패널/모달 배경 |
| `surface2` | `#F7F9FC` | 표 헤더·비활성 탭·보조 배경 |
| `border` / `border-strong` | `#D1DCE8` / `#A8BECE` | 카드·표·입력창 테두리 |
| `text2` / `text3` | `#4A5568` / `#718096` | 보조/희미한 텍스트 |
| `green` / `green-bg` | `#276749` / `#EAF5EF` | 성공·완료 상태, 높은 정확도 |
| `red` | `#9B2335` | 실패·삭제·낮은 정확도 등 경고 (진홍색, 붉은 계열) |
| `info` / `info-bg` | `#1A5290` / `#EBF4FF` | 안내/정보 배지, 중간 정확도, 선택된 행 |
| `background` | `#F0F4F8` | 페이지 전체 배경 |
| `accent-from → accent-to` | `#2FB8C6 → #2E6FF2` | `.gradient-accent` 그라디언트(포인트 강조용) |

- 옅은 배경이 필요할 때는 새 색을 만들지 않고 투명도를 쓴다(예: `bg-red/10`, `border-green/20`).
- **규칙**: `red`는 실패, 삭제, 낮은 정확도(70% 미만)처럼 사용자가 확인해야 하는 값에만 쓴다. 의미가 정해진 색이므로 다른 용도로 재사용하지 않는다.
- 정확도 막대/배지: 90% 이상 `green`, 70% 이상 `info`, 그 미만 `red`.

## 3. 타이포그래피

- 폰트: **Geist Sans** / **Geist Mono** (Google Fonts, `index.html`에서 로드). 한글은 시스템 폰트로 대체된다.
- 글자 크기 통일: `src/index.css`에서 `text-xs`~`text-lg`와 임의 크기(`text-[10px]` 등)를 모두 **14px(`text-sm`)로 강제 통일**한다. 크기로 위계를 만들지 말고 굵기(`font-semibold`/`font-bold`)와 색(`text-text2`/`text-text3`)으로 구분한다.
  - 제목: `text-navy font-bold`
  - 본문 기본 글자색: `text-gray-800`/`text-gray-900` (팔레트에 본문색 토큰이 없어 예외적으로 Tailwind 기본색 유지)
  - 폼 라벨/보조설명: `text-text2`/`text-text3`
  - 표 본문: `text-sm`
  - 버튼: `text-sm font-semibold`

## 4. 레이아웃 / 셸 구조

- **상단 고정 헤더**(`h-14 bg-navy`, 전체 폭, `fixed top-0`) + 그 아래 **좌측 사이드바**(폭 168px) + 본문. 둘 다 `src/components/Sidebar.tsx`에 있고, `App.tsx` 루트에 `pt-14`로 헤더 높이만큼 여백을 둔다.
  - 헤더 왼쪽: 로고(앰버) + 앱 이름/부제. 오른쪽: 사용자명(`OOO 님`) + 소속 회사 배지(`bg-amber-light text-amber-dark`) + 아바타. 맨 끝에 로그아웃 버튼. 관리자 그룹은 `role = admin`인 사용자에게만 보인다.
  - 사이드바 배경은 헤더와 같은 `bg-navy`, 메뉴 글자는 `text-white/85`, hover는 `bg-white/10`, 선택된 메뉴는 `gradient-accent text-white`, 구분선은 `border-white/10`.
  - 메뉴 순서: 주 메뉴(전지작업, 번호찰추출) → 관리자 그룹(회사/사용자/작업장) → 하단 메뉴(수목전지 기초, 번호찰이란?, AI 설정) → 버전 표시
  - 모바일: 헤더 왼쪽 ☰ 버튼 → 네이비 슬라이드인 드로어
- 화면 전환은 `App.tsx`의 `view` 상태로 한다(라우터 없음).
- 본문 폭: 전지작업은 넓게(여백 최소), 그 외 화면은 `max-w-7xl`.
- 페이지 배경은 항상 `background`(`#F0F4F8`), 콘텐츠 카드는 `surface`(흰색)로 배경과 분리한다.
- 로그인 화면(`src/components/LoginPage.tsx`): 셸 없이 중앙 정렬 카드 하나(`max-w-sm`), 카드 상단은 헤더와 같은 `bg-navy` 브랜드 영역.

## 5. 컴포넌트 패턴

### 카드 / 패널
```
rounded-xl border border-border bg-surface shadow-sm
```
업로드 영역, 표, 폼, 상세 화면 등 거의 모든 콘텐츠 블록이 이 패턴을 공유한다.

### 기본(주요) 버튼
```
rounded-md bg-navy px-4 text-sm font-semibold text-white hover:bg-navy-dark disabled:opacity-60
```

### 보조 버튼
```
rounded-md border border-border bg-surface text-text2 hover:bg-surface2
```

### 탭/토글 버튼 (선택 상태 대비, 흰 배경 위)
```
활성: bg-navy text-white
비활성: text-text2 hover:bg-surface2 hover:text-navy
```
(네이비 배경인 사이드바 메뉴는 4장의 규칙을 따른다.)

### 배지/칩 (상태 구분)
- 카테고리/포인트: `bg-amber-light text-amber-dark`
- 완료/성공: `bg-green-bg text-green`
- 실패/경고: `bg-red/10 text-red`
- 안내/진행: `bg-info-bg text-info`

### 표(Table)
- 카드 상단에 검색 인풋과 내보내기(TSV/CSV) 버튼을 두는 공용 패턴(`PoleTable`, `PruningTable`, `AdminPanel`)
- 헤더는 `bg-surface2 text-text3`, 행 구분선은 `divide-border`, 행 hover는 `hover:bg-surface2`
- 가로 스크롤이 생기지 않도록 열이 많으면 행을 나눈다(`PruningTable`의 2단 행 참고)

### 모달
- 배경 `bg-black/40` + 중앙 카드(`rounded-xl bg-surface shadow-lg`), 헤더/본문/하단 버튼 영역을 `border-border`로 구분(`PoleDetail`, `PruningDetail`, `AdminPanel`)
- 삭제 확인은 브라우저 `confirm()` 대신 모달 안의 확인 버튼(`bg-red text-white`)으로 받는다.

### 모션
- 로딩 스피너(`animate-spin`) 외의 애니메이션은 의도적으로 최소화한다(데이터 입력 위주 업무 도구 성격).

## 6. 확장 시 원칙

1. 새 색상을 즉흥적으로 추가하지 말고 위 팔레트 안에서 조합할 것. 특히 `red`(경고)와 `amber`(포인트)의 의미를 다른 용도로 섞어 쓰지 않는다. Tailwind 기본 색(`blue-600`, `gray-200` 등)을 새로 쓰지 않는다.
2. 새 카드/패널은 항상 `rounded-xl border border-border bg-surface shadow-sm` 패턴을 재사용해 화면 간 이질감을 없앤다.
3. 이 문서와 실제 코드가 어긋나면 코드가 항상 우선한다. 변경 시 이 문서도 함께 현행화할 것.
