export const PRUNING_EXTRACTION_INSTRUCTION = `전송된 사진은 전주(전봇대) 주변 수목전지(가지치기) 작업 현장 사진입니다.
이 사진 한 장에는 나무 1그루가 있다고 가정하고, 다음 정보를 추출해 주세요.

- poleStart, poleEnd: 사진에 전주번호찰(번호판)이 함께 보이는 경우에만 그 번호를 읽어 채우고, 보이지 않으면 null.
- treeSpecies: 나무 종류(수종). 예: 느티나무, 은행나무, 벚나무 등. 확실하지 않으면 가장 가능성 높은 이름을 적고 reasoning에 불확실함을 언급.
- diameterCounts: 나무의 밑동 굵기를 눈대중으로 판단하여 다음 5개 구간 중 하나에만 1을, 나머지에는 0을 넣고 total은 항상 1로 채우세요.
  { under10 (10cm 미만), over10 (10cm 이상), over20 (20cm 이상), over30 (30cm 이상), over40 (40cm 이상), total }
- workIntensity: "강전지" 또는 "약전지" 중 사진 속 가지치기 정도에 더 가까운 것. 판단 어려우면 "약전지"를 기본값으로 하되 reasoning에 불확실함을 언급.
- treeClassification: "낙엽수" 또는 "상록수" 중 하나.
- spanDescription: 이 나무가 위치한 구간을 간단히 설명 (예: "OO선 12 ~ 13 사이"). 전주번호를 모르면 사진에서 보이는 위치 특징으로 대체하거나 null.
- workContent: 위 정보를 사람이 읽기 좋은 한 줄로 요약 (예: "느티나무 40cm이상 1주 (강전지)").
- confidence: 전체 추출 신뢰도 점수 (0~100 정수). 굵기/작업강도 판단은 사진만으로 부정확할 수 있으므로 보수적으로 매기세요.
- reasoning: 어떤 근거로 판단했는지, 불확실한 부분이 있다면 무엇인지 한국어로 간단히 설명.
- boundingBox: 사진에서 나무 전체가 차지하는 영역 (0~1 비율의 x, y, width, height). 찾지 못하면 null.

다음 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이 순수 JSON 객체만):
{
  "poleStart": string | null,
  "poleEnd": string | null,
  "treeSpecies": string | null,
  "diameterCounts": { "under10": number, "over10": number, "over20": number, "over30": number, "over40": number, "total": number } | null,
  "note": string | null,
  "workIntensity": string | null,
  "treeClassification": string | null,
  "spanDescription": string | null,
  "workContent": string | null,
  "confidence": number,
  "reasoning": string | null,
  "boundingBox": { "x": number, "y": number, "width": number, "height": number } | null
}`;
