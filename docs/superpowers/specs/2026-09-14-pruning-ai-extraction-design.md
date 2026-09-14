# 전지작업 AI 분석 기능 설계

## 배경

전지작업(수목 가지치기) 화면은 현재 사진 첨부/목록/삭제만 가능한 화면이다(Vercel Blob에 저장). 사용자는 이 화면에 실제 수목전지 작업목록 서식(전주번호, 수목종류, 준공내역, 작업강도, 나무분류, 경간구분, 작업내용 등)과 동일한 구조의 표를 원하며, 이 표는 **번호찰추출 화면과 동일하게 AI가 사진을 분석해 자동으로 채우는 방식**으로 동작해야 한다.

참고 서식: `docs/수목전지 작업목록_충주 2026년_4차_준공.xlsx` (일반수목/가로수 시트의 컬럼 구조).

## 요구사항 확정 사항

1. **데이터 입력 방식**: AI 자동 추출 (번호찰추출과 동일한 파이프라인).
2. **사진-행 관계**: 사진 1장 = 행 1개. 여러 장을 한 번에 올리면 각각 별도로 분석되어 별도 행이 된다.
3. **사진3/사진4 컬럼**: AI 분석에는 쓰이지 않는 참고용 보조 사진. 상세보기 모달에서 행 하나에 추가로 첨부할 수 있다 (최대 2장 추가, 즉 대표 사진 포함 최대 3~4장까지 고려하되 우선순위는 낮음 — 2번째 구현 스텝으로 미뤄도 무방).
4. **결과 지속성**: 번호찰추출과 동일하게 **새로고침 시 표 데이터는 사라진다** (브라우저 메모리에만 보관). 사진 자체는 Blob에 남아 있으나, 추출된 필드는 재분석해야 복원된다. DB 없이 현재 범위로 구현한다.

## 데이터 모델

`src/types.ts`에 추가할 타입 (기존 `PoleImage`와 대응되는 형태):

```ts
export interface DiameterCounts {
  under10: number;
  over10: number;
  over20: number;
  over30: number;
  over40: number;
  total: number;
}

export interface PruningRecord {
  id: string;
  name: string;
  url: string;          // 대표 사진 (Blob public URL 또는 업로드 중 임시 dataURL)
  mimeType: string;
  status: "idle" | "processing" | "completed" | "failed";
  error: string | null;

  poleStart: string | null;      // 전주번호 시작
  poleEnd: string | null;        // 전주번호 끝
  treeSpecies: string | null;    // 수목종류
  diameterCounts: DiameterCounts | null; // 준공내역
  note: string | null;           // 비고
  workIntensity: string | null;  // 작업강도 (강전지/약전지)
  treeClassification: string | null; // 나무분류 (낙엽수/상록수 등)
  spanDescription: string | null;    // 경간구분
  workContent: string | null;        // 작업내용
  confidence: number | null;
  reasoning: string | null;
  boundingBox: BoundingBox | null;

  extraPhotoUrls: string[];  // 사진3/4용, 최대 2개
  uploadedAt: string;
}
```

## 백엔드 변경

### 1. Provider 계층 소폭 리팩터링 (기존 번호찰추출 동작 변경 없음)

- `providers/types.ts`: `ExtractParams`에 `prompt: string` 필드 추가.
- `providers/claude.ts`, `gemini.ts`, `openai.ts`: `EXTRACTION_INSTRUCTION`을 직접 import하는 대신 `params.prompt`를 사용하도록 한 줄만 변경.
- `providers/index.ts`의 `extract()` 시그니처는 그대로 두되, 호출부(`handleExtractRequest.ts`)에서 `prompt: EXTRACTION_INSTRUCTION`을 명시적으로 넘기도록 수정.
- 이렇게 하면 동일한 provider 함수들을 번호찰추출과 전지작업 양쪽에서 재사용 가능.

### 2. 전지작업 전용 프롬프트

`providers/pruningPrompt.ts` (신규) — 사진 한 장을 보고 다음을 JSON으로 추출하도록 지시:
`poleStart, poleEnd, treeSpecies, diameterCounts({under10, over10, over20, over30, over40, total}), note, workIntensity, treeClassification, spanDescription, workContent, confidence, reasoning, boundingBox`.
- 사진 1장 = 나무 1그루로 간주하고, 눈대중으로 판단되는 굵기 구간 하나에 1을 넣고 나머지는 0으로 채우도록 지시 (합계는 항상 1).
- 전주번호는 사진에 번호찰이 함께 보이는 경우에만 채우고, 안 보이면 null.
- 굵기 판정/작업강도(강전지·약전지)는 사진만으로 정확도가 떨어질 수 있음을 감안해 confidence를 보수적으로 매기도록 지시.

### 3. 새 엔드포인트

- `providers/handlePruningExtractRequest.ts` (신규) — `handleExtractRequest.ts`와 동일 구조, `pruningPrompt`를 사용하고 응답 타입만 다름. 인증/재시도 관련 에러 처리 로직은 동일하게 복사(중복 소량 허용 — 도메인이 다른 응답 스키마라 억지로 합치지 않음).
- `api/pruning-extract.ts` (신규) — Vercel 핸들러, `api/extract.ts`와 동일 패턴.
- `server.ts`에 `/api/pruning-extract` POST 라우트 추가 (로컬 dev용, 기존 `/api/extract` 미러링과 동일 패턴).

## 프론트엔드 변경

### 1. `PruningWork.tsx` 재작성

현재의 "업로드 + 목록 + 삭제"만 있는 화면을, 번호찰추출 화면과 같은 구조로 확장:
- 사진 업로드 시: (a) 기존처럼 `/api/pruning`(POST)로 Blob에 저장 → (b) 동시에 `/api/pruning-extract`(POST)로 AI 분석 요청. 두 요청은 병렬로 진행하되, 표에는 즉시 "분석 중" 상태로 행이 추가된다.
- `runWithConcurrency`(기존 `lib/asyncQueue.ts`) 재사용해 동시 분석 개수 제한.
- 재시도 로직(429/5xx 재시도)도 `App.tsx`의 `requestExtractionWithRetry` 패턴을 그대로 재사용/복제.

### 2. `PruningTable.tsx` (신규)

`PoleTable.tsx`와 같은 UX(검색, TSV 복사, CSV 다운로드, 정확도 바, 판독상태 배지, 상세보기/재분석/삭제 버튼)를 유지하되 컬럼을 전지작업 서식에 맞춘다:
`번호 | 미리보기 | 전주번호(시작/끝) | 수목종류 | 준공내역(6칸) | 비고 | 작업강도 | 나무분류 | 경간구분 | 작업내용 | 사진3 | 사진4 | 기타 세부정보 | 정확도 | 판독상태 | 작업 | 삭제`.
(기타 세부정보는 `reasoning`을 보여주는 용도로, 번호찰추출의 `extraInfo` 컬럼과 유사한 역할.)

### 3. `PruningDetail.tsx` (신규)

`PoleDetail.tsx`와 동일한 모달 패턴 — 각 필드 수동 수정 가능, 재분석 버튼, 그리고 사진3/사진4를 추가로 첨부할 수 있는 업로드 슬롯 2개(선택적 기능, 1차 구현에서는 단순 업로드 버튼으로 충분).

## 테스트 계획

- `npm run lint` (tsc --noEmit) 통과 확인.
- 로컬 개발 서버에서 사진 업로드 → 분석 중 상태 → 완료 후 표에 필드가 채워지는지 확인 (AI 응답은 실제 API 키가 있어야 확인 가능; 키가 없는 경우 기존 로직대로 "설정에서 API 키를 먼저 입력하세요" 오류가 뜨는지 확인).
- 이 환경에 브라우저 자동화 도구가 없어 실제 화면 클릭 테스트는 어려움 — 코드/타입 체크 후 사용자가 직접 화면에서 확인.

## 범위 밖 (이번에 하지 않는 것)

- 표 데이터의 DB 영속화 (새로고침 시 유지) — 필요해지면 Supabase 등으로 별도 작업.
- 사진3/4의 AI 분석 활용 — 참고용 보관만 한다.
- 여러 장의 사진을 하나의 작업(경간)으로 묶어서 분석하는 기능.
