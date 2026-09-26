import React from "react";
import {
  IdCard, HelpCircle, Hash, Ruler, Siren, AlertTriangle, Network,
} from "lucide-react";
import polePlateExample from "../assets/pole-plate-example.webp";

export default function AboutPlate() {
  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="bg-panel border border-line rounded-lg p-5">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-text bg-blue/15 border border-line px-2.5 py-1 rounded-full uppercase tracking-wider mb-3">
          전력설비 안내서 · 배전선로
        </span>
        <h2 className="font-bold text-text text-lg mb-2">
          전봇대에 붙은 이 은색 번호판, 정체가 뭘까?
        </h2>
        <p className="text-sm text-text-soft leading-relaxed">
          정식 이름은 <strong className="text-text">전주번호찰(電柱番號札)</strong>. 전주(電柱,
          흔히 "전봇대")마다 붙어 있는 8자리 코드로, 한국전력공사가 전국의 전주를 하나하나
          구별하기 위해 부여한 <strong className="text-text">"전주의 주민등록증"</strong>입니다.
          평소엔 눈에 잘 안 띄지만, 위치를 설명하기 어려운 순간에는 휴대폰 GPS보다 정확한
          길잡이가 됩니다.
        </p>
      </div>

      {/* 01. 실물 예시 */}
      <div className="bg-panel border border-line rounded-lg p-5">
        <h3 className="font-bold text-text text-sm mb-1 flex items-center gap-2">
          <IdCard className="w-4 h-4 text-blue" />
          실물부터 보고 시작하죠
        </h3>
        <p className="text-xs text-text-soft leading-relaxed mb-4">
          여러 자료에 등장하는 표기 항목을 종합해 재구성한 대표 예시입니다. 실제 전주마다
          제조 시기·지역에 따라 배치와 색상은 조금씩 다를 수 있지만, 담고 있는 정보의 종류는
          대체로 같습니다. 번호판은 보통 사람 눈높이에 가까운 지상 1.7~1.8m 높이에 부착되어
          있습니다.
        </p>

        <div className="md:flex md:items-start md:gap-5">
        <div className="bg-panel-2 border border-line rounded-lg p-3 mb-4 md:mb-0 md:shrink-0 overflow-x-auto">
          <img
            src={polePlateExample}
            alt="실제 전주번호찰 예시 이미지: 상단 걸이 구멍 아래 위험 표시, 전산화번호 4193W101이 5칸+3칸 격자로 표기되고, 매/월/간 3단 라벨 위에 큰 숫자 77이 겹쳐 표기되며, 그 아래 2009와 16M이 각각 칸으로 나뉘어 표기되고, 세종전력(주) 제작사명과 한국전력 로고, 문의전화 123이 표기되어 있다."
            className="w-full h-auto max-w-[320px] mx-auto rounded-lg"
          />
        </div>

        <div className="divide-y divide-line md:flex-1">
          {[
            {
              n: 1,
              title: "전산화번호 — 시스템 안의 고유 식별자",
              code: "4193W101",
              desc: "한전이 설계부터 시공, 노후관리·보수까지 전주를 자체 전산 시스템으로 관리하기 위해 부여한 8자리 코드입니다. 사람 이름은 같아도 주민등록번호는 모두 다르듯, 전주도 같은 이름(전주번호)이 겹칠 수 있어 전산화번호로 구별합니다. 다만 같은 관리 구역 안에서는 전주번호가 겹치는 일이 드물어, 실제 현장에서는 이 번호보다 아래 \"전주번호\"를 더 많이 씁니다.",
            },
            {
              n: 2,
              title: "전주번호 — 현장에서 실제로 부르는 이름",
              code: "매월간 · 77",
              desc: "\"OO지\", \"OO간\"처럼 구간·지역을 나타내는 이름 뒤에 숫자가 붙는, 사실상 전주의 진짜 이름입니다. 숫자는 왼쪽에서 오른쪽, 위에서 아래 순서로 읽습니다. 이 예시는 \"매월간 77\"로 부르면 됩니다. 실물마다 라벨이 \"호수간\", \"시내간\", \"목제인\"처럼 제각각인 이유도 여기 있습니다.",
            },
            {
              n: 3,
              title: "시공년월 — 전주가 세워진 시기",
              code: "2009",
              desc: "앞 2자리가 연도, 뒤 2자리가 월입니다. 이 예시의 \"2009\"는 2009년이 아니라 20년(2020년) 9월에 시공됐다는 뜻입니다.",
            },
            {
              n: 4,
              title: "전주 규격(장척) — 전주의 전체 길이",
              code: "16M",
              desc: "설치 위치와 용도에 따라 전주 높이가 달라, 규격도 함께 표기합니다. 이 예시는 16M짜리 전주입니다. 국내 콘크리트 전주는 KS F 4304 규격을 따르며 10~16m 표준 길이 중 하나로 제작됩니다.",
            },
            {
              n: 5,
              title: "시공회사 — 전주를 시공한 업체",
              code: "세종전력(주)",
              desc: "전주를 실제로 세운 시공회사명이 함께 표기됩니다. 회사 이름은 지역·시기에 따라 다양합니다.",
            },
            {
              n: 6,
              title: "고장 · 정전 신고",
              code: "지역번호 + 123",
              desc: "전선이 늘어져 있거나 정전, 전주 파손 등을 발견했을 때 신고하는 번호입니다. 다만 그냥 123만 누르면 안 되고, 지역번호를 먼저 누른 뒤 123을 눌러야 그 지역 한전 고객센터로 연결됩니다.",
            },
          ].map((item) => (
            <div key={item.n} className="py-3 flex gap-3">
              <div className="w-6 h-6 rounded-full bg-panel-2 text-text text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {item.n}
              </div>
              <div className="min-w-0">
                <p className="font-mono text-text text-base font-bold">{item.code}</p>
                <p className="text-sm font-bold text-text mt-0.5">{item.title}</p>
                <p className="text-xs text-text-soft leading-relaxed mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>

      {/* 02. 왜 번호를 붙였을까 */}
      <div className="bg-panel border border-line rounded-lg p-5">
        <h3 className="font-bold text-text text-sm mb-2 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-blue" />
          왜 전주마다 번호를 붙였을까
        </h3>
        <p className="text-xs text-text-soft leading-relaxed">
          전주는 발전소에서 만든 전기를 가정과 건물까지 실어 나르는 전선을 지지하는 시설로,
          일상에서는 "전봇대"라는 이름으로 더 익숙합니다. 전국에 흩어진 780만~850만 개(출처에
          따라 집계가 다릅니다)에 달하는 전주를 한전이 개별적으로 관리하려면 주소만으로는
          부족합니다. 논둑길이나 산길, 해안도로처럼 지번 주소 자체가 애매한 곳에도 전주는
          촘촘히 서 있기 때문입니다. 그래서 한전은 모든 전주에 지리정보시스템(GIS)과 연동되는
          8자리 코드를 부여해, 번호 하나만으로 지도 위 정확한 위치와 설비 정보를 곧바로 불러올
          수 있도록 설계했습니다.
        </p>
      </div>

      {/* 03. 8자리 어떻게 읽을까 */}
      <div className="bg-panel border border-line rounded-lg p-5">
        <h3 className="font-bold text-text text-sm mb-1 flex items-center gap-2">
          <Hash className="w-4 h-4 text-blue" />
          8자리, 어떻게 읽을까
        </h3>
        <p className="text-xs text-text-soft leading-relaxed mb-4">
          전산화번호 <span className="font-mono text-blue">4193W101</span>을 풀어보면
          아래와 같습니다. 이 번호를 설명하는 자료가 두 갈래로 나뉘어 있어, 둘 다 정리해
          두었습니다.
        </p>

        <div className="bg-panel-2 border border-line rounded-lg p-3 mb-4 overflow-x-auto">
          <svg viewBox="0 0 680 400" className="w-full h-auto min-w-[420px]" role="img"
            aria-label="전산화번호 4193W101을 두 가지 방식으로 나눈 그림. 한전 공식 인포그래픽 기준으로는 앞 4자리가 2킬로미터 격자 위치, 뒤 4자리가 세부 위치와 설치 순서를 뜻한다. 특허 자료 기준으로는 앞 2자리가 동서 위치, 다음 2자리가 남북 위치, 다섯번째 문자가 2킬로미터를 4등분한 구역, 마지막 3자리가 좌표와 설치 순번을 뜻한다.">
            {[
              { x: 30, ch: "4", hi: false },
              { x: 92, ch: "1", hi: false },
              { x: 154, ch: "9", hi: false },
              { x: 216, ch: "3", hi: false },
              { x: 278, ch: "W", hi: true },
              { x: 340, ch: "1", hi: false },
              { x: 402, ch: "0", hi: false },
              { x: 464, ch: "1", hi: false },
            ].map((b) => (
              <g key={b.x}>
                <rect x={b.x} y="40" width="54" height="58" rx="6"
                  fill={b.hi ? "#EFF6FF" : "#FFFFFF"} stroke={b.hi ? "#2563EB" : "#9CA3AF"} strokeWidth={b.hi ? 1.5 : 1} />
                <text x={b.x + 27} y="77" textAnchor="middle" fontFamily="monospace" fontWeight="700" fontSize="24"
                  fill={b.hi ? "#1D4ED8" : "#1F2937"}>{b.ch}</text>
              </g>
            ))}

            {/* Version A */}
            <text x="30" y="130" fontFamily="sans-serif" fontWeight="700" fontSize="12" fill="#1D4ED8">A. 한전 공식 인포그래픽 기준</text>
            <path d="M30,142 L30,150 L270,150 L270,142" fill="none" stroke="#2563EB" strokeWidth="2" />
            <text x="150" y="168" textAnchor="middle" fontFamily="sans-serif" fontSize="12.5" fill="#1F2937">2km 격자 위치</text>
            <path d="M278,142 L278,150 L518,150 L518,142" fill="none" stroke="#2563EB" strokeWidth="2" />
            <text x="398" y="168" textAnchor="middle" fontFamily="sans-serif" fontSize="12.5" fill="#1F2937">세부 위치 + 설치 순서</text>

            {/* Version B */}
            <text x="30" y="216" fontFamily="sans-serif" fontWeight="700" fontSize="12" fill="#4B5563">B. 특허 KR101515811B1 기준</text>
            <path d="M30,228 L30,236 L146,236 L146,228" fill="none" stroke="#6B7280" strokeWidth="2" />
            <text x="88" y="254" textAnchor="middle" fontFamily="sans-serif" fontSize="12.5" fill="#1F2937">동서 위치</text>
            <path d="M154,228 L154,236 L270,236 L270,228" fill="none" stroke="#6B7280" strokeWidth="2" />
            <text x="212" y="254" textAnchor="middle" fontFamily="sans-serif" fontSize="12.5" fill="#1F2937">남북 위치</text>
            <path d="M278,228 L278,236 L332,236 L332,228" fill="none" stroke="#6B7280" strokeWidth="2" />
            <text x="305" y="254" textAnchor="middle" fontFamily="sans-serif" fontSize="12.5" fill="#1F2937">4분할 구역</text>
            <path d="M340,228 L340,236 L518,236 L518,228" fill="none" stroke="#6B7280" strokeWidth="2" />
            <text x="429" y="254" textAnchor="middle" fontFamily="sans-serif" fontSize="12.5" fill="#1F2937">좌표 + 순번</text>

            <rect x="30" y="284" width="488" height="88" rx="10" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
            <text x="50" y="310" fontFamily="sans-serif" fontWeight="700" fontSize="13" fill="#1F2937">기준 원점 (특허 자료 기준)</text>
            <text x="50" y="332" fontFamily="sans-serif" fontSize="13" fill="#6B7280">전국 4곳 — 경기 오산 · 강원 태백 · 전남 담양 · 경남 양산</text>
            <text x="50" y="354" fontFamily="sans-serif" fontSize="13" fill="#6B7280">이 네 지점으로부터의 상대 거리를 계산해 앞 4자리를 정한다고 설명합니다.</text>
          </svg>
        </div>

        <div className="space-y-3">
          <div className="bg-panel-2 border border-line rounded-lg p-3">
            <p className="text-xs font-bold text-text-soft mb-2">A. 한전 공식 인포그래픽 기준</p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-panel border border-line rounded-lg p-2">
                <p className="font-mono font-bold text-text">4193</p>
                <p className="text-text-soft mt-1">2km 격자 위치</p>
              </div>
              <div className="bg-panel border border-line rounded-lg p-2">
                <p className="font-mono font-bold text-text">W101</p>
                <p className="text-text-soft mt-1">세부 위치 + 설치 순서</p>
              </div>
            </div>
          </div>

          <div className="bg-panel-2 border border-line rounded-lg p-3">
            <p className="text-xs font-bold text-text-soft mb-2">B. 특허 KR101515811B1 기준</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="bg-panel border border-line rounded-lg p-2">
                <p className="font-mono font-bold text-text">41</p>
                <p className="text-text-soft mt-1">동서 위치</p>
              </div>
              <div className="bg-panel border border-line rounded-lg p-2">
                <p className="font-mono font-bold text-text">93</p>
                <p className="text-text-soft mt-1">남북 위치</p>
              </div>
              <div className="bg-panel border border-line rounded-lg p-2">
                <p className="font-mono font-bold text-text">W</p>
                <p className="text-text-soft mt-1">4분할 구역</p>
              </div>
              <div className="bg-panel border border-line rounded-lg p-2">
                <p className="font-mono font-bold text-text">101</p>
                <p className="text-text-soft mt-1">좌표 + 순번</p>
              </div>
            </div>
            <p className="text-[11px] text-text-soft leading-relaxed mt-2">
              기준 원점(전국 4곳 — 경기 오산 · 강원 태백 · 전남 담양 · 경남 양산)으로부터의
              상대 거리를 계산해 앞 4자리를 정한다고 설명합니다.
            </p>
          </div>
        </div>

        <div className="mt-3 bg-blue/60 border border-line rounded-lg p-3">
          <p className="text-xs text-text-soft leading-relaxed">
            <strong className="text-blue">정리하면 —</strong> 전산화번호는 GPS 좌표값 그
            자체가 아니라, 한전이 자체적으로 만든 격자 기반 위치 식별 코드입니다. 정해진 변환
            규칙을 거쳐야 실제 위도·경도로 환산되는, 일종의 "암호화된 좌표"인 셈입니다. 같은
            8자리 문자열을 두 자료가 서로 다르게 쪼개지만, 굵은 원리는 같습니다 — 격자 기반으로
            위치를 좁혀 나가는 코드라는 점입니다.
          </p>
        </div>
      </div>

      {/* 04. GPS 정확도 */}
      <div className="bg-panel border border-line rounded-lg p-5">
        <h3 className="font-bold text-text text-sm mb-1 flex items-center gap-2">
          <Ruler className="w-4 h-4 text-blue" />
          정말 GPS보다 정확할까
        </h3>
        <p className="text-xs text-text-soft leading-relaxed mb-3">
          여러 언론 보도가 공통적으로 짚는 대목입니다. 휴대폰 GPS는 주변 건물이나 지형에 따라
          오차가 크게 벌어지는 반면, 전주번호찰은 애초에 고정된 설비의 좌표이기 때문에 오차가
          훨씬 작습니다.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
          <div className="bg-blue/15 border border-line rounded-lg p-3 text-center">
            <p className="font-mono font-bold text-text text-lg">25~50m</p>
            <p className="text-[11px] text-text-soft mt-1">전주번호찰(전산화번호) 오차 범위</p>
          </div>
          <div className="bg-panel-2 border border-line rounded-lg p-3 text-center">
            <p className="font-mono font-bold text-text-soft text-lg">≈500m</p>
            <p className="text-[11px] text-text-soft mt-1">휴대폰 GPS · 도심 지역</p>
          </div>
          <div className="bg-panel-2 border border-line rounded-lg p-3 text-center">
            <p className="font-mono font-bold text-text-soft text-lg">2~3km</p>
            <p className="text-[11px] text-text-soft mt-1">휴대폰 GPS · 산간·농촌 지역</p>
          </div>
        </div>
        <p className="text-xs text-text-soft leading-relaxed">
          도시 지역은 30m 이하, 농촌 지역은 50m 이하 간격으로 전주가 서 있어 어디서든 가까운
          전주를 금방 찾을 수 있습니다. 이 때문에 112 신고는 경찰 통합시스템, 119 신고는 소방
          지리정보시스템과 전산화번호가 연동되어, 번호만 불러줘도 신고 위치가 지도에 바로
          표시됩니다.
        </p>
      </div>

      {/* 05. 사용법 */}
      <div className="bg-panel border border-line rounded-lg p-5">
        <h3 className="font-bold text-text text-sm mb-1 flex items-center gap-2">
          <Siren className="w-4 h-4 text-blue" />
          실제로 언제, 어떻게 쓸까
        </h3>
        <p className="text-xs text-text-soft leading-relaxed mb-3">
          계곡이나 산길, 논밭 사이 농로처럼 "여기가 정확히 어디인지" 설명할 방법이 마땅치 않을
          때 가장 빛을 발합니다. 사용법은 간단합니다.
        </p>
        <div className="space-y-2">
          {[
            { title: "가장 가까운 전주를 찾는다", desc: "도시는 평균 30m, 농촌은 평균 50m 간격으로 전주가 서 있어 대부분 시야 안에 하나쯤은 있습니다." },
            { title: "지상 1.7~1.8m 높이의 은색 표찰을 확인한다", desc: "표찰 위쪽에 크게 인쇄된 8자리 전산화번호(숫자4+영문1+숫자3)를 찾습니다." },
            { title: "112·119, 또는 한전 123에 그대로 불러준다", desc: "\"전산화번호 4193W101입니다\"처럼 8자리를 그대로 전달하면, 상담원 쪽 시스템이 좌표로 변환해 위치를 특정합니다." },
          ].map((step, i) => (
            <div key={i} className="flex gap-3 bg-panel-2 border border-line rounded-lg p-3">
              <div className="w-6 h-6 rounded-lg bg-panel border border-text-soft/40 text-text-soft text-xs font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </div>
              <div>
                <p className="text-xs font-bold text-text">{step.title}</p>
                <p className="text-[11px] text-text-soft leading-relaxed mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-text-soft leading-relaxed mt-3">
          개인이 직접 위치를 알아보고 싶다면 한전이 운영하는{""}
          <a
            href="https://online.kepco.co.kr/EWM090D00"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-blue hover:text-blue"
          >
            전산화번호검색
          </a>
          이나, 번호 8자리를 넣으면 지도와 길찾기까지 바로 연결해 주는 민간 서비스{""}
          <a
            href="https://elecmap.kr/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-blue hover:text-blue"
          >
            ElecMap
          </a>{""}
          같은 도구를 활용할 수도 있습니다.
        </p>
      </div>

      {/* 06. 아쉬운 현실 */}
      <div className="bg-panel border border-line rounded-lg p-5">
        <h3 className="font-bold text-text text-sm mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-blue" />
          아쉬운 현실
        </h3>
        <p className="text-xs text-text-soft leading-relaxed">
          다만 보도에 따르면, 전국 수백만 개 전주 번호판이 실제로는 제 역할을 못 하는 경우가
          많습니다. 우선 대다수 시민이 이 번호판의 용도 자체를 모릅니다. 전선 보호장치나 지자체
          보안등, 전단지 등에 가려지거나 숫자가 떨어져 나간 경우도 흔합니다. 게다가 번호판을
          훼손하거나 가려도 이렇다 할 법적 제재가 없고, 한전의 주기적인 점검·관리에도 한계가
          있습니다. 소방 당국은 위급 상황에서 이만한 길잡이가 없다며, 평소 이 번호판의 용도를
          적극적으로 알리고 함부로 가리지 말아야 한다고 강조합니다.
        </p>
      </div>

      {/* 출처 */}
      <div className="bg-panel border border-line rounded-lg p-5">
        <h3 className="font-bold text-text text-sm mb-3 flex items-center gap-2">
          <Network className="w-4 h-4 text-blue" />
          출처
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] text-left">
            <tbody className="divide-y divide-line">
              {[
                ["공식 용어", "디지털집현전 — \"전주 번호판\"", "https://k-knowledge.kr/srch/read.jsp?id=268075024"],
                ["위치 정확도", "서울시 내 손안에 서울", "https://mediahub.seoul.go.kr/archives/894760"],
                ["현장 사례", "경남도민일보", "https://www.idomin.com/news/articleView.html?idxno=514314"],
                ["문제점 취재", "SBS", "https://news.sbs.co.kr/news/endPage.do?news_id=N1002555036"],
                ["번호 체계", "다음카페 58산우회", "https://m.cafe.daum.net/58madang/WFPv/2472"],
                ["번호 체계", "티스토리 azuredeepsea", "https://azuredeepsea.tistory.com/12"],
                ["위치 변환 알고리즘", "특허 KR101515811B1", "https://patents.google.com/patent/KR101515811B1/ko"],
                ["조회 도구", "한전 전산화번호검색 · ElecMap", "https://online.kepco.co.kr/EWM090D00"],
                ["배경 취재", "CIVICNEWS", "https://www.civicnews.com/news/articleView.html?idxno=37533"],
              ].map(([tag, label, href], i) => (
                <tr key={i}>
                  <td className="py-2 pr-3 text-text-soft whitespace-nowrap align-top">{tag}</td>
                  <td className="py-2">
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue hover:text-blue"
                    >
                      {label}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-text-soft leading-relaxed mt-3">
          다음카페 account2000의 원문 한 건은 접근 제한으로 본문을 확인하지 못해 목록에서
          제외했습니다. 오차 범위·전주 개수 등 일부 수치는 보도마다 표현이 달라, 이 페이지에서는
          확인된 범위를 그대로 병기했습니다. 더 자세한 원본 정리는 프로젝트 저장소의{""}
          <code className="bg-panel-2 px-1 py-0.5 rounded-lg">docs/kepco-pole-number-plate.md</code>
          에 있습니다.
        </p>
      </div>
    </div>
  );
}
