import React from "react";
import {
  Scale, Layers, Scissors, Ruler, ListChecks, HardHat, ShieldAlert,
  Users, ClipboardCheck, Recycle, GitBranch, Network, AlertTriangle,
} from "lucide-react";
import slide1 from "../assets/pruning-guide/slide1.webp";
import slide2 from "../assets/pruning-guide/slide2.webp";
import slide3 from "../assets/pruning-guide/slide3.webp";
import slide4 from "../assets/pruning-guide/slide4.webp";
import slide5 from "../assets/pruning-guide/slide5.webp";
import slide6 from "../assets/pruning-guide/slide6.webp";
import slide7 from "../assets/pruning-guide/slide7.webp";
import slide8 from "../assets/pruning-guide/slide8.webp";
import slide9 from "../assets/pruning-guide/slide9.webp";
import slide10 from "../assets/pruning-guide/slide10.webp";
import slide11 from "../assets/pruning-guide/slide11.webp";
import slide12 from "../assets/pruning-guide/slide12.webp";
import slide13 from "../assets/pruning-guide/slide13.webp";
import slide14 from "../assets/pruning-guide/slide14.webp";

// pptx에서 추출한 슬라이드 이미지를 캡션과 함께 보여주는 카드.
function SlideImage({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className="mb-4">
      <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
        <img src={src} alt={alt} className="w-full h-auto" />
      </div>
      {caption && <figcaption className="text-[11px] text-gray-400 mt-1.5">{caption}</figcaption>}
    </figure>
  );
}

export default function TreePruningGuide() {
  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full uppercase tracking-wider mb-3">
          현장 실무자용 가이드북 · 배전선로 근접수목 관리
        </span>
        <h2 className="font-bold text-gray-900 text-lg mb-2">
          수목전지, 왜 하고 어떻게 해야 할까?
        </h2>
        <SlideImage
          src={slide1}
          alt="배전선로 근접수목 관리 시각화 매뉴얼 표지 — 전주와 전선, 수목 이격거리를 도식화한 이미지"
          caption="한국전력공사 배전운영실 · 현장 실무자용 가이드북"
        />
        <p className="text-sm text-gray-500 leading-relaxed">
          <strong className="text-gray-800">수목전지(樹木剪枝, Tree Pruning)</strong>는 전기사업법 제68조(전기설비의
          유지) 및 제87조(다른 자의 토지 등의 사용)에 근거해, 배전선로 경과지 상의 수목이 전력선과
          근접·접촉하면서 발생할 수 있는 지락·단선·정전·화재를 예방하기 위해 가지치기 또는 벌목을
          시행하여 안전 이격거리를 확보하는 관리 행위입니다. <strong className="text-gray-800">전력 안전 공급</strong>과{" "}
          <strong className="text-gray-800">수목 훼손 최소화</strong>라는 두 원칙이 만나는 지점에서 현장 판단이
          이루어져야 하며, 이 화면은 그 판단 기준을 한전 배전수목관리 매뉴얼과 수목전지작업 기초
          안내서를 바탕으로 정리한 것입니다.
        </p>
      </div>

      {/* 01. 기본 원칙 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-1 flex items-center gap-2">
          <Scale className="w-4 h-4 text-green-600" />
          기본 원칙 및 법적 준수사항
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed mb-3">
          수목전지는 가공 배전선로의 안정적 운영과 수목의 생리적 특성·도시 미관 유지를 동시에
          충족해야 합니다. 모든 현장 판단은 아래 네 가지 원칙 위에서 이루어집니다.
        </p>
        <SlideImage
          src={slide2}
          alt="수목 관리의 핵심 가치: 전력 안전과 미관 보존의 균형을 저울로 표현한 그림. 왼쪽은 안정적 전력 공급, 오른쪽은 수목 훼손 최소화"
          caption="모든 현장 판단은 안정적 전력 공급(제1조)과 수목 훼손 최소화(제2조)가 교차하는 지점에서 이루어져야 합니다."
        />
        <div className="space-y-2">
          {[
            { title: "선로 안전거리 최우선 확보", desc: "배전선로와 수목 간 법정이격거리를 확보하되, 수목의 생장 속도를 감안해 차기 전지 주기까지 안전상태가 유지되도록 시행합니다." },
            { title: "수목 훼손 최소화 및 수형 보존", desc: "수목 고유의 수형을 최대한 보존하고 주간(원줄기)의 무단 절단을 금지하며, 수목의 자가 치유를 돕는 자르기 방법을 준수합니다." },
            { title: "사전 대관 협의 및 동의 수취", desc: "지자체 관리 가로수 및 사유지 수목은 작업 시행 1개월 전 관할 가로수 관리청의 대관허가·승인을 받거나 소유자 협의·확인서를 수취한 후 시행합니다." },
            { title: "환경 관리 및 부산물 당일 수거", desc: "전지 작업으로 발생한 폐가지·부산물은 폐기물관리법 제18조에 따라 당일 수거하여 폐기물 처리업 허가자 등에게 위탁 처리합니다." },
          ].map((item, i) => (
            <div key={i} className="flex gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800">{item.title}</p>
                <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 02. 전지 유형 4가지 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-1 flex items-center gap-2">
          <Layers className="w-4 h-4 text-green-600" />
          전지 유형 4가지 — 약전지 · 강전지 · 순치기 · 벌목
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed mb-4">
          제거하는 가지의 두께, 지엽 제거 비율, 목적과 현장 여건에 따라 4가지로 구분됩니다.
          산림청 고시(도시숲·가로수 조성 관리 기준), 국가표준품셈, 한전 기술지침을 종합한 기준은
          다음과 같습니다.
        </p>
        <SlideImage
          src={slide4}
          alt="수목전지 분류 매트릭스: 강전지(Heavy Pruning)와 약전지(Light Pruning)를 질량 제거 비율, 절단 직경, 적용 환경, 사후 조치, 목적 5개 항목으로 비교한 표"
        />
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-[11px] text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-green-50 text-gray-600 font-bold">
                {["전지 유형", "제거 비율 및 직경", "대상 가지 및 특성", "주요 적용 구간", "수행 주체"].map((h) => (
                  <th key={h} className="py-2 px-2.5 border border-green-100 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                {
                  type: "약전지\n(Light Pruning)",
                  color: "text-green-700",
                  ratio: "· 지엽 질량 10~20% 미만\n· 직경 3cm 미만(가급적 2cm 내외 잔가지)",
                  target: "· 도장지·맹아지·교차지·고사지 위주\n· 주간·주지 보존(수형 파괴 방지)",
                  section: "도심지 가로수, 주택가 및 수형 보존 필요 구간",
                  agent: "전기/조경 전문회사 또는 지자체 위탁",
                },
                {
                  type: "강전지\n(Heavy Pruning)",
                  color: "text-orange-700",
                  ratio: "· 지엽 질량 30% 이상\n· 직경 10cm 이상 굵은 가지 또는 주지/원줄기 절단",
                  target: "· 핵심 수관 대형 주지 제거 및 두절(頭切) 작업\n· 절단면 상처보호제(정균제) 도포 필수",
                  section: "산간지역, 격지·오지, 고압선 직접 저촉 긴급 구간",
                  agent: "전기/조경 전문회사 또는 지자체 위탁",
                },
                {
                  type: "순치기\n(Tip Pruning)",
                  color: "text-blue-700",
                  ratio: "· 수형·흉고직경 관계없이 상부/측부 잔가지만 절단",
                  target: "· 여름철 웃자란 가지가 전력선에 근접·접촉할 우려 시 긴급 제거",
                  section: "긴급 정전 예방 필요 개소, 흉고직경 측정 곤란 개소",
                  agent: "한전 직영 시행 원칙",
                },
                {
                  type: "벌목\n(Felling)",
                  color: "text-red-700",
                  ratio: "· 수목 밑둥 전체 절단",
                  target: "· 선하지 대형수목 접촉, 쓰러짐(도괴), 설해목 등 안전사고 우려목",
                  section: "전력선 직접 침범 대형 위험목 및 도괴 위험 구간",
                  agent: "지자체 위해목 제거 요청 또는 벌목전문업체 위탁 (직영 금지)",
                },
              ].map((row) => (
                <tr key={row.type}>
                  <td className={`py-2 px-2.5 border border-gray-100 font-bold whitespace-pre-line ${row.color}`}>{row.type}</td>
                  <td className="py-2 px-2.5 border border-gray-100 whitespace-pre-line text-gray-600">{row.ratio}</td>
                  <td className="py-2 px-2.5 border border-gray-100 whitespace-pre-line text-gray-600">{row.target}</td>
                  <td className="py-2 px-2.5 border border-gray-100 text-gray-600">{row.section}</td>
                  <td className="py-2 px-2.5 border border-gray-100 text-gray-600">{row.agent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SlideImage
          src={slide6}
          alt="제3의 전지 기법 순치기(Topping) 비교 그림. 강전지는 대폭 축소, 약전지는 수형 유지, 순치기는 이격거리 확보만을 목적으로 상층부만 평탄화"
        />
        <div className="mt-3 bg-blue-50/60 border border-blue-100 rounded-lg p-3">
          <p className="text-xs text-gray-700 leading-relaxed">
            <strong className="text-blue-800">순치기란—</strong> 강전지(대폭 축소)나 약전지(수형 유지)와 달리
            오직 "이격 거리 확보"만을 목적으로 상층부만 평탄화하는 제3의 기법입니다. 성장세가
            왕성한 여름철, 특고압 전력선 접촉 우려 등 긴급한 고장 예방이 필요할 때 적용합니다.
          </p>
        </div>
      </div>

      {/* 03. 절단 대상 가지 + 측정 용어 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-1 flex items-center gap-2">
          <Scissors className="w-4 h-4 text-green-600" />
          절단 대상 가지의 종류 및 측정 용어
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed mb-3">
          약전지 및 수형 유지 작업 시 정리해야 할 주요 가지의 종류입니다.
        </p>
        <SlideImage
          src={slide5}
          alt="수목 해부도: 절단 대상 가지의 생리적 종류를 나무 그림 위에 표시. 도장지, 맹아지, 교차지·역지, 고사지, 핵심 수관 대형 주지"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {[
            { title: "도장지(徒長枝)", desc: "영양 과다 또는 스트레스로 위로만 수직으로 급성장하여 전선 저촉 위험이 높은 약한 가지." },
            { title: "맹아지(萌芽枝)", desc: "줄기 밑동이나 이전 절단면 주변에서 부정아로부터 무성하게 뿜어져 나온 곁가지." },
            { title: "교차지 · 역지", desc: "다른 가지와 얽히거나 수목의 정상적인 성장 방향과 반대로 자라 미관·생육을 해치는 가지." },
            { title: "고사지 · 병해충지", desc: "이미 죽었거나 병해충에 감염되어 낙하 및 2차 피해 우려가 있는 가지." },
          ].map((item) => (
            <div key={item.title} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-bold text-gray-800">{item.title}</p>
              <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>

        <p className="text-xs font-bold text-gray-700 mb-2">현장 조사·설계에서 자주 쓰는 측정 용어</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { title: "수고(樹高)", desc: "지표면에서 수관 정상까지의 수직거리(웃자란 가지 제외)." },
            { title: "지하고(枝下高)", desc: "지표면에서 최하단 역지(力枝) 끝까지의 수직거리." },
            { title: "흉고직경(胸高直徑, DBH)", desc: "지표면에서 1.2m 지점의 줄기 직경. 현장 조사 및 도급(설계) 계수 산정의 핵심 지표." },
            { title: "근원직경(根元直徑)", desc: "관목이나 흉고 이하에서 줄기가 분기하는 수목의 지표면 줄기 굵기." },
          ].map((item) => (
            <div key={item.title} className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-bold text-gray-800">{item.title}</p>
              <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 04. 이격거리 기준 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-1 flex items-center gap-2">
          <Ruler className="w-4 h-4 text-green-600" />
          배전선로 이격거리 및 안전거리 기준
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed mb-4">
          배전선로와 수목 간 이격거리는 전선 종류 및 전압 수준에 따라 엄격히 규정되어 있으며,
          작업자·장비의 접근한계거리도 함께 지켜야 합니다.
        </p>
        <SlideImage
          src={slide3}
          alt="전력선 종류별 법정 이격거리 기준: 특고압 나전선 2.0m 이상, 특고압 절연전선 0.5~1.0m 이상, 저압 가공전선 0.3m 이상을 전주 그림 위에 표시"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
          <div className="bg-red-50 border border-red-100 rounded-lg p-3">
            <p className="text-xs font-bold text-red-700">특고압 나전선 (22.9kV)</p>
            <p className="font-mono font-bold text-red-700 text-base mt-1">2.0m 이상</p>
            <p className="text-[11px] text-gray-500 mt-1">생장 왕성 수종은 1.8~2.0m 이상, 최대 3.0m까지 확보. 활선접근거리(90cm) 유지 필수 — 부득이 90cm 이내 접근 시 충전부 방호관 취부.</p>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
            <p className="text-xs font-bold text-orange-700">특고압 절연전선 (22.9kV OC)</p>
            <p className="font-mono font-bold text-orange-700 text-base mt-1">0.5m ~ 1.0m 이상</p>
            <p className="text-[11px] text-gray-500 mt-1">직접 접촉 및 풍압 저촉 방지 목적. 직접 마찰·피복 손상 방지, 절연성능 톱 및 연장핫스틱 사용.</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
            <p className="text-xs font-bold text-yellow-700">저압 가공전선 및 인입선</p>
            <p className="font-mono font-bold text-yellow-700 text-base mt-1">0.3m 이상</p>
            <p className="text-[11px] text-gray-500 mt-1">직접 마찰 및 피복 손상 예방. 저압보수차 버킷 이용 작업 가능, 절연 장구 착용 후 잔가지 제거.</p>
          </div>
        </div>
        <div className="bg-gray-900 text-white rounded-lg p-3.5">
          <p className="text-xs font-bold mb-1">📌 충전전로 접근 한계거리 및 방호 원칙 — 90cm 절대 준수</p>
          <ul className="text-[11px] text-gray-200 leading-relaxed list-disc list-inside space-y-0.5">
            <li>22.9kV 충전전로에 대한 안전 접근한계거리는 90cm입니다.</li>
            <li>표준 시공: 작업자 신체·장비가 충전부로부터 90cm 이상 이격을 유지한 채 연장형 절연톱(1.5m 이상)으로 작업.</li>
            <li>부득이한 시공: 90cm 이내 접근이 불가피하면 무정전(활선)전공이 충전부 방호(방호관 설치)를 완료한 후 지상감시자 입회 하에 작업.</li>
          </ul>
        </div>
      </div>

      {/* 05. 표준 시행 절차 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-1 flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-green-600" />
          공사 표준 시행 절차 — 현장 작업 6단계
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed mb-3">
          작업계획 통보부터 뒷정리까지, 개별 현장에서 실제로 밟는 순서입니다.
        </p>
        <div className="space-y-2 mb-4">
          {[
            { title: "작업계획 통보 (D-3)", desc: "시공관리책임자는 작업 시행 3일 전까지 작업계획서를 작성하여 담당자(감독자)에게 통보." },
            { title: "배전센터 기기조작 시스템 입력 (D-1)", desc: "담당자가 배전센터 시스템에 작업 대상 선로 및 기기조작을 등록." },
            { title: "작업 대상선로 통보 (작업 직전)", desc: "작업책임자가 배전센터로 재폐로 정지(분리) 요청 및 통보." },
            { title: "작업 전 안전회의(TBM) & 체크리스트 작성", desc: "작업자 전원 참석하여 위험성 평가, PMIS 신체·정신 상태 점검 및 안전교육 시행." },
            { title: "원격 모니터링 사진 전송", desc: "작업인원 착용 상태, TBM 회의록, 위험성 체크리스트, 교통안전 표지판/신호수 사진 전송." },
            { title: "수목전지 작업 시행 및 뒷정리", desc: "지상감시자 입회 하에 전지 시행, 폐기물 당일 수거 및 배전센터에 작업 완료 통보." },
          ].map((step, i) => (
            <div key={i} className="flex gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="w-6 h-6 rounded-lg bg-white border border-gray-300 text-gray-700 text-xs font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800">{step.title}</p>
                <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5 text-gray-500" />
          전체 업무 흐름 (기획 → 정산 → DB화)
        </p>
        <SlideImage
          src={slide14}
          alt="The Master Workflow: 수목 관리 전체 업무 흐름도. 계획 수립, 방식 결정, 협의/통지, 실행, 검수/정산, DB 완료 6단계를 순환 구조로 표현"
        />
        <div className="overflow-x-auto">
          <div className="flex items-stretch gap-1.5 min-w-[680px] text-[10px]">
            {[
              ["①", "계획 수립", "배전선로 근접수목 조사 → 자체 계획 수립 → 시행 주체 협의"],
              ["②", "방식 결정", "시공 방법 확정 (공사발주 / 직영 / 위탁)"],
              ["③", "협의 · 통지", "위탁 협약서 체결 / 소유자 통보 / 공사구간 통보"],
              ["④", "실행", "전지 시행 (발주 / 직영 / 위탁)"],
              ["⑤", "검수 · 정산", "현장 확인 → 공사비/위탁비 지급"],
              ["⑥", "DB 완료", "수목관리시스템 입력 및 사후 모니터링 전환"],
            ].map(([n, title, desc]) => (
              <div key={title} className="flex-1 bg-green-50 border border-green-100 rounded-lg p-2.5">
                <p className="font-bold text-green-700">{n} {title}</p>
                <p className="text-gray-500 leading-snug mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 06. 필수 장비/인력 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-1 flex items-center gap-2">
          <HardHat className="w-4 h-4 text-green-600" />
          작업조별 필수 장비 · 공구 · 안전장구 · 참여 인력
        </h3>
        <SlideImage
          src={slide11}
          alt="필수 안전 장구 및 시공 장비: 절연버킷트럭, 연장형 절연톱, 안면보호구 및 절연안전모, 절연고무장갑 및 절연안전화, 방염복 및 추락방지용 안전대, 절연고무소매를 표시한 삽화"
        />
        <div className="overflow-x-auto -mx-1 mb-4">
          <table className="w-full text-[11px] text-left border-collapse min-w-[560px]">
            <thead>
              <tr className="bg-green-50 text-gray-600 font-bold">
                {["구분", "필수 사양 및 모델", "성능 검사 및 관리 기준"].map((h) => (
                  <th key={h} className="py-2 px-2.5 border border-green-100 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                {
                  cat: "필수 장비\n(작업차량)",
                  spec: "절연버킷트럭\n(저압보수차 또는 활선버킷차)",
                  check: "· 고소작업대 안전검사 합격증명서 제출\n· 절연내력시험(절연붐 100kV/3분, 버켓 50kV/1분)\n· 연 1회 정기시험 성적서 현장 비치(10년 이상 반기 1회)",
                },
                {
                  cat: "필수 공구\n(전지 공구)",
                  spec: "연장형 유압식 절연톱\n(체인톱 및 원형 회전톱)",
                  check: "· 절연내력시험 성적서 보유(30kV 이상)\n· 절연핫스틱 부분 길이 1.5m 이상 확보\n· 이동 시 엔진 정지, 끈 달아 낙하 방지",
                },
                {
                  cat: "필수 보호구\n(개인안전장구)",
                  spec: "고소작업자: 절연안전모·활선접근경보기·안면보호구·방염복·특고압/저압 절연장갑 및 보호용 가죽장갑·절연안전화·안전대·절연고무소매(90cm 이내)\n지상작업자: 절연안전모·절연안전화·형광조끼",
                  check: "· 절연장갑: 600V 이상(특고압 근접 시 23kV 이상)\n· 안전대 고리는 버킷 내 로프걸이에 고정\n· 착용 미준수 시 당일 공사 전면 중지 및 제재",
                },
              ].map((row) => (
                <tr key={row.cat}>
                  <td className="py-2 px-2.5 border border-gray-100 font-bold text-gray-800 whitespace-pre-line">{row.cat}</td>
                  <td className="py-2 px-2.5 border border-gray-100 whitespace-pre-line text-gray-600">{row.spec}</td>
                  <td className="py-2 px-2.5 border border-gray-100 whitespace-pre-line text-gray-600">{row.check}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-gray-500" />
          작업조 필수 참여 인력 및 역할
        </p>
        <div className="space-y-2">
          {[
            { title: "주작업자 (전기분야 유자격자)", desc: "배전전공 이상의 유자격자로 절연버킷트럭 조종 가능자('고소작업대 조종자 교육' 이수자). 버킷 탑승 후 직접 전지 수행." },
            { title: "가로수 수형 관리자 (조경사)", desc: "조경분야 유자격자로 가로수 허가조건에 명시된 경우 배치. 지상에서 수형 관리 및 작업 감시 임무 수행(직접 전지 작업 금지)." },
            { title: "충전부 방호 인력 (활선전공)", desc: "활선(무정전)전공 유자격자로 90cm 이내 접근이 필요할 때 충전부 방호관 취부 및 방호 작업 시행." },
          ].map((item) => (
            <div key={item.title} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-bold text-gray-800">{item.title}</p>
              <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 07. 수행 주체 결정 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-1 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-green-600" />
          작업 유형별 수행 주체 결정
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed mb-3">
          가지치기(약전지/강전지)는 전문회사 또는 지자체 위탁, 순치기는 한전 직영, 벌목은
          지자체·전문업체 위탁이 원칙입니다. 벌목은 한전이 직영으로 시행하지 않습니다.
        </p>
        <SlideImage
          src={slide7}
          alt="작업 유형별 수행 주체 결정 트리: 수목전지가 가지치기(강전지/약전지, 순치기)와 벌목으로 나뉘고, 각각 수행 주체와 안전관리 방식을 화살표로 연결한 흐름도"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
          <div className="bg-green-50 border border-green-100 rounded-lg p-3">
            <p className="text-xs font-bold text-green-700">가지치기 A — 강전지 / 약전지</p>
            <p className="text-[11px] text-gray-500 mt-1">전문회사 또는 지자체 위탁 → 안전관리: 안전감시원 현장 배치</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <p className="text-xs font-bold text-blue-700">가지치기 B — 순치기</p>
            <p className="text-[11px] text-gray-500 mt-1">한전 직영 → 안전관리: 작업 전 안전 확보 및 제한적 약전지 시행</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-lg p-3">
            <p className="text-xs font-bold text-red-700">벌목 (직영 절대 금지)</p>
            <p className="text-[11px] text-gray-500 mt-1">지자체 위해목 제거(우선) 또는 벌목전문업체 위탁 → 현장 입회·충전부 방호·전력선 차단 등 사전조치</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs font-bold text-gray-800 mb-1">시공 방법 A — 공사 발주 및 지자체 위탁</p>
            <SlideImage
              src={slide8}
              alt="시공 방법 A: 공사 발주 및 지자체 위탁 시행 기준. 필수 참여 인력(주 작업자, 조경 전문가, 활선 전공)과 위탁 절차 타임라인(대관 협의, 현장 확인, 협약 체결, 위탁 의뢰 및 시공)"
            />
            <p className="text-[11px] text-gray-500 leading-relaxed">
              위탁 절차: <strong>대관 협의</strong>(자체 계획 중복 조사, 비용 협의) →{" "}
              <strong>현장 확인</strong>(동행 현장 조사, 전지 범위 확정) →{" "}
              <strong>협약 체결</strong>(공사금액·내역 포함 2부 작성) →{" "}
              <strong>위탁 의뢰 및 시공</strong>(공사비 납부, 낙찰업체 확인, 안전협의).
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs font-bold text-gray-800 mb-1">시공 방법 B — 한전 직영 및 사유지 처리</p>
            <SlideImage
              src={slide9}
              alt="시공 방법 B: 한전 직영 시행 한계 및 사유지 처리. 직영 작업 원칙(제한적 허용, 강전지 조건)과 사유지 수목 처리 프로세스(탐문 조사, 사전 협의, 동의서 수취)"
            />
            <p className="text-[11px] text-gray-500 leading-relaxed mb-1.5">
              직영은 순치기 또는 간단한 약전지가 원칙이며, 강전지는 안전·선로 안정에 필수적이나
              발주가 곤란한 경우 시공부서장 판단과 철저한 현장 안전 확보 후 예외적으로 시행합니다.
            </p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              사유지 수목은 <strong>① 탐문 조사</strong>(소유자 미상 시 현수막 게시) →{" "}
              <strong>② 사전 협의</strong>(작업 시기·방법 합의) →{" "}
              <strong>③ 동의서 수취</strong>(수목전지 확인서, 전기사업법 제87조 기반 보상 협의 포함) 순으로 처리합니다.
            </p>
          </div>
        </div>

        <div className="mt-3 bg-red-50 border border-red-100 rounded-lg p-3">
          <p className="text-xs font-bold text-red-700 mb-1.5">위험목 벌목 2단계 절차 — 직영 벌목 절대 금지</p>
          <SlideImage
            src={slide10}
            alt="위험목 벌목 2단계 엄격 프로세스: Step 1 지자체 산림부서 신고 및 협의, Step 2 벌목전문업체 위탁. 하단에 전력선 차단, 충전부 방호, 시공관리 책임자 현장 입회 등 사전 안전조치 표시"
          />
          <p className="text-[11px] text-gray-600 leading-relaxed">
            <strong>Step 1. 지자체 산림부서 신고 및 협의(우선)</strong> — 유선 신고(위해목 우선 신고) 또는
            모바일앱('스마트 산림재난 App' 촬영 등록) 후 지자체 현장 확인.{" "}
            <strong>Step 2. 벌목전문업체 위탁(1단계 곤란 시)</strong> — 산림조합법에 따른 지역 산림조합
            또는 산림 사업법인(벌목업)에 위탁, 산림청 특수지역 위험목 제거 품셈 적용(굴삭기·우드그랩,
            3인 이상 전문인력). 사전 안전조치(필수): 전력선 차단(사선화), 충전부 방호, 시공관리
            책임자 현장 입회.
          </p>
        </div>
      </div>

      {/* 08. 현장 안전관리 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-1 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-green-600" />
          현장 안전 관리 및 재해 예방
        </h3>
        <p className="text-xs font-bold text-gray-700 mb-2">위험성 Check List 핵심 점검 항목</p>
        <ul className="text-[11px] text-gray-600 leading-relaxed list-disc list-inside space-y-1 mb-4">
          <li>작업 전 TBM 및 안전교육: 작업자 전원 참석, 음주/수면부족/약물 복용 여부(PMIS Check) 확인 및 분담 작업 숙지.</li>
          <li>교통 및 보행자 방호: 공사안내판·라바콘·구획로프 설치, 교통신호수 및 보행자 유도 감시자 배치. 출퇴근 시간대 작업 지양.</li>
          <li>낙하·비래 방지: 대형 가지 절단 시 로프 매달기 작업 사전 시행. 절단 작업 하부 근로자 출입 금지구역 설정.</li>
          <li>중장비 전도 방지: 버킷트럭 아웃트리거 적정 거치 및 밑받침 목(발판대) 설치 상태 확인.</li>
          <li>충전부 감전 방지: 활선접근경보기 동작 확인, 90cm 이내 접근 시 방호관 취부 확인 및 절연고무소매 착용.</li>
        </ul>

        <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
          <p className="text-xs font-bold text-yellow-800 mb-1.5">📌 벌독 알레르기 등급별 관리 지침</p>
          <ul className="text-[11px] text-gray-600 leading-relaxed list-disc list-inside space-y-0.5">
            <li>검사결과 Class 4~6단계(위험도 높음): 수목전지 및 벌목 작업 투입 원천 금지.</li>
            <li>Class 3단계(보통): 벌 쏘임 보호복 의무 착용, 에피네프린 자가주사제(젝스트) 개별 소지(보냉파우치) 및 인근 응급의료기관 사전 파악.</li>
            <li>작업 전 긴 막대 등으로 수목 주변 벌집 유무 확인, 냄새 유발 화장품/스프레이 사용 자제.</li>
          </ul>
        </div>
      </div>

      {/* 09. 위약벌 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-1 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          작업자 과실 정전 유발 시 제재 기준 (위약벌)
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed mb-3">
          수목전지 작업 중 작업자의 부주의 또는 과실로 선로 고장·정전이 발생하면 아래 위약벌이
          부과됩니다.
        </p>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-[11px] text-left border-collapse min-w-[560px]">
            <thead>
              <tr className="bg-red-50 text-gray-600 font-bold">
                {["정전 구분", "위약벌 금액", "세부 부과 기준"].map((h) => (
                  <th key={h} className="py-2 px-2.5 border border-red-100 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ["고압선로 일시정전", "A등급: 1,500만원 / B등급: 1,000만원\nC등급: 500만원 / D등급: 500만원", "· A등급: 8,000세대 이상, 5분 이상 정전\n· B등급: 4,000세대 이상, 5분 이상 정전\n· C등급: 1,000세대 이상, 1시간 이상 정전"],
                ["고압선로 순간정전", "200만원 (1회당)", "순간적인 전압 강하 및 재폐로 동작 발생 시"],
                ["고압선로 순시정전", "100만원 (1회당)", "선로 순시 차단 동작 시"],
                ["변대단위 저압정전 / 화재", "저압정전: 100만원\n화재 등 물의: 500만원", "변압기 단위 저압 정전 및 화재 사고 유발 시 (설비 복구비용 별도 부과)"],
              ].map(([type, penalty, detail]) => (
                <tr key={type}>
                  <td className="py-2 px-2.5 border border-gray-100 font-bold text-gray-800">{type}</td>
                  <td className="py-2 px-2.5 border border-gray-100 whitespace-pre-line text-red-700 font-bold">{penalty}</td>
                  <td className="py-2 px-2.5 border border-gray-100 whitespace-pre-line text-gray-600">{detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 10. 사후관리 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-1 flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-green-600" />
          현장 사후 관리 — 환경 · 민원 · 준공
        </h3>
        <SlideImage
          src={slide12}
          alt="현장 사후 관리: 환경, 민원, 그리고 준공. 부산물 당일 수거, 사전 민원 안내, 현장 통제, 조례 준수, 준공 DB화 5개 항목을 체크리스트로 표시"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { title: "부산물 당일 수거", desc: "전지목/폐가지는 도로 방치 금지. 폐기물관리법에 따라 면허업체 위탁 처리." },
            { title: "사전 민원 안내", desc: "인근 주민 및 상가에 작업 일정 사전 고지." },
            { title: "현장 통제", desc: "출퇴근 시간 회피, 교통정리원 배치, 보행자/차량 안전 확보." },
            { title: "조례 준수", desc: "지자체 '도시숲·가로수 조성 및 관리 조례' 엄수 (임의 수형 파괴로 인한 과태료 방지)." },
            { title: "준공 DB화", desc: "시공 전/후 사진 촬영(흉고직경 식별 가능), 준공검사 후 '수목관리시스템' DB 즉시 입력." },
          ].map((item) => (
            <div key={item.title} className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex gap-2">
              <ClipboardCheck className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-gray-800">{item.title}</p>
                <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 11. 근본적 해결책 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-1 flex items-center gap-2">
          <Recycle className="w-4 h-4 text-green-600" />
          근본적 해결책 — 저수고 수종갱신(Tree Replacement) 지원 사업
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed mb-3">
          같은 자리에서 전지를 반복하며 정전 위험과 유지보수 비용을 계속 발생시키기보다, 저수고
          수종으로 교체해 근본적으로 안전을 확보하는 방안입니다.
        </p>
        <SlideImage
          src={slide13}
          alt="근본적 해결책: 저수고 수종갱신(Tree Replacement) 지원 사업. Before(전선에 얽힌 큰 나무)와 After(저수고 나무로 교체 후 전선이 깨끗한 모습) 비교"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs font-bold text-gray-800 mb-1">지원 체계</p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              한전 요청으로 지자체/소유자가 수종 갱신 시 '수목 구입단가(조달청 가격정보 기준)'를
              지원합니다.<br />
              절차: 계획 수립 → 타당성 검토/협약 → 준공 내역 검토 → 비용 정산
            </p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-lg p-3">
            <p className="text-xs font-bold text-green-700 mb-1">권장 수종 (최대 12m 이하)</p>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              산딸나무, 쪽동백, 당단풍, 배롱나무, 굴거리, 먼나무 등
            </p>
          </div>
        </div>
      </div>

      {/* 12. 현장 이행 당부사항 + 출처 */}
      <div className="bg-gray-900 text-white rounded-xl p-5">
        <p className="text-sm font-bold mb-2">현장 이행 당부사항</p>
        <p className="text-xs text-gray-300 leading-relaxed">
          본 안내서에 명시된 수목전지 기준과 안전수칙을 철저히 준수하여 무사고·무재해 현장을
          달성하시기 바랍니다. 기타 문의사항이나 현장 특이사항 발생 시 한전 관할 사업소
          설비운영 부서 담당자(감독자)에게 즉시 보고 후 지시에 따르시기 바랍니다.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
          <Network className="w-4 h-4 text-green-600" />
          출처
        </h3>
        <table className="w-full text-[11px] text-left">
          <tbody className="divide-y divide-gray-100">
            {[
              ["기초 안내서", "수목전지작업 기초 안내서 — 배전선로 근접수목 관리기준·전지요령 및 현장 안전관리 가이드라인 (docs/cch_수목전지작업기초안내서.docx)"],
              ["시각화 매뉴얼", "배전선로 근접수목 관리 시각화 매뉴얼 — 한국전력공사 배전운영실·현장 실무자용 가이드북 (docs/cch_배전수목관리매뉴억요약.pptx)"],
              ["관련 법령", "전기사업법 제68조(전기설비의 유지), 제87조(다른 자의 토지 등의 사용), 폐기물관리법 제18조"],
            ].map(([tag, label], i) => (
              <tr key={i}>
                <td className="py-2 pr-3 text-gray-400 whitespace-nowrap align-top">{tag}</td>
                <td className="py-2 text-gray-600">{label}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[11px] text-gray-400 leading-relaxed mt-3">
          수치는 한전 배전선로 근접수목 관리절차서(개정 4차) 및 특기시방서·특수계약조건을
          요약한 것으로, 실제 계약·시방 문서와 차이가 있을 경우 원문 기준이 우선합니다.
        </p>
      </div>
    </div>
  );
}
