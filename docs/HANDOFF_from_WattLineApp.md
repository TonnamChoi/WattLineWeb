# WattLine Handoff

## 1. 목적

이 문서는 WattLine 앱 개발을 이어받는 개발자가 빠르게 이해할 수 있도록 프로젝트의 현재 상태, 구조, 구현 포인트, 다음 작업을 정리한 문서입니다.

## 2. 현재 상태

- 정적 모바일 앱 프로토타입 구현 완료
- 개발 서버는 4000 포트 사용
- 앱 내부 카메라 미리보기 + 확대축소(줌) 지원
- 작업장명 입력(로컬 저장, 파일명/업로드 데이터에 반영)
- 사진 촬영 → 셔터음 → 분류 팝업(6종, 분류별 개수 표시) → 목록 등록 흐름 완료
- 사진 업로드 버튼, 임시저장 버튼, 사진 미리보기 모달 포함
- PWA 설치 배너(beforeinstallprompt) 및 서비스 워커 업데이트 체크
- 화면 상단 refresh 버튼 옆에 앱 버전 표시(`v0.1`부터, 배포마다 증가)
- `docs-private.md`는 `.gitignore`에 등록되어 git 추적에서 제외됨 (과거 커밋 히스토리도 정리 완료)
- Vercel 활용을 고려한 구조로 설계

## 3. 파일 구성

- index.html: 앱 메인 화면
- styles.css: 모바일 앱 스타일 및 레이아웃
- app.js: 카메라·분류·저장·업로드 로직
- api/upload.js: Vercel 업로드 수신 함수 (검증 + Supabase Storage/DB 저장)
- sw.js: 서비스 워커(오프라인 폴백)
- manifest.webmanifest: PWA 설치 정보
- DESIGN.md: 디자인/기획 문서
- docs-private.md: 로컬 비공개 정보 보관용 (git 추적 제외, 로컬에만 존재)
- README.md: 프로젝트 소개

## 4. 실행 방법

로컬 실행:

```bash
cd d:\git-projects\WattLineApp
python -m http.server 4000
```

브라우저 접속:

```text
http://localhost:4000
```

## 5. 사진 업로드 연동 명세

다른 프로젝트에서 사진 업로드 기능을 재현할 때 아래 구조와 흐름을 기준으로 사용한다.

### 화면 위치 및 DOM 구조

- 파일: `index.html`
- 업로드 버튼은 메인 콘텐츠 아래의 `<footer class="bottom-bar">` 안에 위치한다.
- 임시저장 버튼과 나란히 배치되며, 업로드 버튼 클래스는 `.primary-btn`이다.
- 업로드 버튼의 표시 문구는 기본값 `사진 업로드`이다.
- 업로드 중에는 `업로드 중...`, 성공 시 `업로드 완료`, 실패 시 `업로드 실패`로 문구가 바뀐다.

```html
<footer class="bottom-bar">
  <button class="secondary-btn">임시저장</button>
  <button class="primary-btn">사진 업로드</button>
</footer>
```

관련 스타일은 `styles.css`의 `.bottom-bar`, `.secondary-btn`, `.primary-btn`를 참고한다.

### 업로드 전 사진 데이터 구조

사진을 촬영하고 분류를 선택하면 `app.js`의 `capturedPhotos` 배열에 다음 객체가 추가된다.

```json
{
  "workplaceName": "작업장",
  "date": "20260917",
  "category": "시작전주",
  "dataUrl": "data:image/jpeg;base64,...",
  "createdAt": "2026-09-17T12:34:56.000Z",
  "fileName": "20260917_123456_작업장_start-pole_a1b2c3.jpg"
}
```

- `category`: 사진 분류명. 현재 값은 `시작전주`, `종료전주`, `작업전`, `흉고직경`, `작업후`, `기타` 중 하나다.
- `workplaceName`: 작업장명이다. 입력값이 비어 있으면 기본값 `작업장`을 사용한다.
- `dataUrl`: 최대 긴 변 1600px, JPEG 품질 0.8로 압축한 Base64 Data URL이다. 압축 전 카메라 캡처는 `canvas.toDataURL("image/jpeg", 0.9)`로 생성한 뒤 다시 압축한다.
- `date`: 촬영 날짜다. 파일명 날짜와 같은 `YYYYMMDD` 형식이다.
- `createdAt`: ISO 8601 형식의 촬영 시각이다.
- `fileName`: 업로드 파일명이다. 형식은 `YYYYMMDD_HHMMSS_workplace-category-code_random-hex.jpg`이다.
- `category-code`: `시작전주=start-pole`, `종료전주=end-pole`, `작업전=before-work`, `흉고직경=diameter`, `작업후=after-work`, `기타=etc`로 변환한다.
- `random-hex`: 충돌 방지를 위한 6자리 소문자 16진수 문자열이다.
- 배열은 `localStorage`의 `wattline-captured-photos` 키에 JSON 문자열로 저장된다.

#### 파일 크기 정책

- 원본 이미지의 긴 변이 1600px를 초과하면 긴 변을 1600px로 축소한다.
- 저장 및 업로드용 이미지는 JPEG 품질 `0.8`로 재인코딩한다.
- 카메라 촬영과 파일 선택 모두 같은 압축 처리를 거친다.
- `dataUrl`은 Base64 문자열이므로 바이너리 JPEG보다 전송 본문이 약 33% 커질 수 있다.
- 현재 `api/upload.js`에는 개별 파일 또는 전체 요청의 바이트 크기 제한이 없다.
- 운영 전환 시에는 클라이언트 압축 외에도 서버 요청 크기 제한, 파일별 최대 크기, MIME 검사, 업로드 개수 제한을 추가한다.
- 대용량 업로드가 필요하면 Base64 JSON 대신 `multipart/form-data` 또는 Presigned URL 방식으로 전환한다.

#### 분류 코드

| 화면 분류명 | 업로드 파일명 코드 |
| ----------- | ------------------ |
| 시작전주    | `start-pole`       |
| 종료전주    | `end-pole`         |
| 작업전      | `before-work`      |
| 흉고직경    | `diameter`         |
| 작업후      | `after-work`       |
| 기타        | `etc`              |

### 요청 형식

- 파일: `app.js`
- 메서드: `POST`
- 경로: `/api/upload`
- 헤더: `Content-Type: application/json`
- 본문: `photos` 배열을 포함한 JSON 객체

```http
POST /api/upload
Content-Type: application/json
```

```json
{
  "photos": [
    {
      "workplaceName": "작업장",
      "date": "20260917",
      "category": "시작전주",
      "dataUrl": "data:image/jpeg;base64,...",
      "createdAt": "2026-09-17T12:34:56.000Z",
      "fileName": "20260917_123456_작업장_start-pole_a1b2c3.jpg"
    }
  ]
}
```

### 서버 처리 및 응답

- 파일: `api/upload.js`
- `POST` 외 메서드는 `405 Method Not Allowed`를 반환한다.
- `workplaceName`, `category`, `date`, `dataUrl`, `fileName`이 문자열인 항목만 유효한 사진으로 처리한다.
- 유효한 사진이 없으면 `400 No photos provided`를 반환한다.
- Supabase 연동: `SUPABASE_URL`, `SUPABASE_SECRET_KEY` 환경변수가 설정되어 있으면 각 사진을 Storage 버킷 `photos`(경로 `날짜/파일명`)에 업로드하고, `photo_uploads` 테이블(workplace_name, category, photo_date, file_name, storage_path)에 메타데이터를 저장한다.
- 두 환경변수가 없으면 저장을 건너뛰고 기존처럼 검증 결과만 반환하는 프로토타입 모드로 동작한다(`stored: false`). 배포 환경(Vercel)에서 이 값들을 설정해야 실제 저장이 동작한다.
- `photo_uploads` 테이블은 RLS가 켜져 있고 정책이 없어 `SUPABASE_SECRET_KEY`(서버 전용 secret key)로만 접근 가능하다. 클라이언트 publishable key로는 조회/쓰기가 불가능하다.

성공 응답 예시(Supabase 미설정 시):

```json
{
  "ok": true,
  "stored": false,
  "received": 1,
  "categories": ["시작전주"],
  "fileNames": ["20260917_123456_작업장_start-pole_a1b2c3.jpg"]
}
```

Supabase 설정 후에는 `stored: true`와 함께 `storedCount`, 사진별 저장 성공 여부가 담긴 `results` 배열이 추가된다.

### 사용자 흐름

1. 사용자가 카메라로 사진을 촬영한다.
2. 촬영 결과를 JPEG Data URL로 변환한다.
3. 사용자가 사진 분류를 선택한다.
4. 분류, Data URL, 촬영 시각을 `capturedPhotos`에 추가한다.
5. 사용자가 하단의 `사진 업로드` 버튼을 누른다.
6. 모든 대기 사진을 한 번에 `/api/upload`로 JSON 전송한다.
7. 성공/실패에 따라 버튼 문구와 알림을 갱신한다.

### 이식 시 확인할 항목

- 업로드 버튼과 `bottom-bar`의 위치를 모바일 화면 하단 흐름에 맞게 유지한다.
- 클라이언트와 서버가 `photos`, `workplaceName`, `category`, `date`, `dataUrl`, `createdAt`, `fileName` 필드명을 동일하게 사용한다.
- 파일명은 `20260917_123456_작업장_start-pole_a1b2c3.jpg`처럼 날짜, 시각, 작업장명, 분류 코드, 6자리 난수 순서를 유지한다.
- Base64 Data URL을 그대로 전송할지, 파일 업로드 방식으로 바꿀지 결정한다.
- 큰 이미지는 긴 변 1600px, JPEG 품질 0.8로 축소해 요청 본문 크기를 줄인다.
- 실제 운영에서는 인증, 파일 크기 제한, MIME 검사, 개인정보 보호 정책을 추가한다.
- 업로드 성공 후 로컬 사진을 삭제할지 유지할지 제품 요구사항에 따라 결정한다. 현재 구현은 성공 후에도 로컬 배열을 유지한다.

## 6. 다음 작업

1. 인증 및 작업자 정보 연동
2. WattLineWeb 관제 화면 구현 (8절 명세 기반)
3. 업로드 성공 후 서버 저장 실패 항목에 대한 재시도/알림 처리

## 7. 주의사항

- docs-private.md는 보안 정보 포함 파일이며 `.gitignore`에 등록되어 git 추적에서 제외됨. 과거 커밋(`ff5664d`)에 노출됐던 토큰들은 히스토리에서 완전히 제거(`git filter-repo` + force-push)했으나, 원격에 한 번 올라갔던 값들이므로 Vercel/Blob/Gemini 토큰 재발급을 권장함
- Supabase `SUPABASE_SECRET_KEY`(secret key)는 절대 클라이언트 코드나 git에 포함하지 않는다. Vercel 환경변수로만 설정한다.
- 앱 전용으로 설계되었기 때문에 각 화면은 모바일 경험을 우선해야 함

## 8. WattLineWeb(데스크톱 웹) 연동을 위한 Supabase DB 명세

WattLine(모바일 촬영 앱)이 저장한 사진을 WattLineWeb(사무실 데스크톱 웹)에서 조회·수정·삭제할 수 있도록, 공유 Supabase 프로젝트의 실제 구조를 정리한다. WattLineWeb은 **같은 Supabase 프로젝트("WattLine")를 그대로 공유**하며, 별도 프로젝트를 새로 만들 필요는 없다.

### 8.1 프로젝트 접속 정보

- Project URL: `https://yipfgjuuzskwlqnllunc.supabase.co` (region: ap-northeast-1, Tokyo)
- 실제 키 값은 이 저장소의 `docs-private.md`(git 추적 제외, 로컬 전용)에 있다. WattLineWeb 쪽에서도 동일한 값을 그 프로젝트의 환경변수로 등록해서 사용한다:
  - `SUPABASE_URL` = Project URL
  - `SUPABASE_SECRET_KEY` = Supabase 대시보드 Settings → API Keys의 **Secret key**(`sb_secret_...`)
- **Publishable key(`sb_publishable_...`)로는 아래 테이블/버킷에 접근할 수 없다.** `photo_uploads` 테이블과 `photos` 버킷 모두 RLS가 켜져 있고 정책이 하나도 없어서, 서버 전용 Secret key로만 읽기/쓰기가 가능하다. 즉 WattLineWeb도 브라우저에서 Supabase에 직접 접속하지 말고, 자체 서버(API 라우트)에서 Secret key로 접속한 뒤 결과를 클라이언트에 내려주는 구조로 만들어야 한다.
- DB 기본 타임존은 `Asia/Seoul`로 설정되어 있어 `timestamptz` 컬럼을 그대로 조회하면 KST로 표시된다.

### 8.2 `photo_uploads` 테이블

```sql
create table public.photo_uploads (
  id uuid primary key default gen_random_uuid(),
  workplace_name text not null,
  category text not null,
  photo_date text not null,       -- YYYYMMDD
  file_name text not null,        -- 사람이 읽는 원본 파일명(한글 포함 가능)
  storage_path text not null,     -- Storage 버킷 내 실제 객체 키(ASCII, uuid 기반)
  created_at timestamptz not null default now(),
  received_at timestamptz not null default now()
);

alter table public.photo_uploads enable row level security;
-- 정책 없음 = anon/publishable key 접근 불가, secret key만 접근 가능
```

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| `id` | uuid (PK) | 행 고유 id |
| `workplace_name` | text | 작업장명 (한글 가능) |
| `category` | text | `시작전주`/`종료전주`/`작업전`/`흉고직경`/`작업후`/`기타` |
| `photo_date` | text | `YYYYMMDD`, 촬영 기기(한국) 로컬 날짜 |
| `file_name` | text | 표시/다운로드용 원본 파일명. **한글 포함될 수 있음** — 화면 표시·다운로드 시 파일명으로만 쓰고, Storage 키로는 쓰지 않는다 |
| `storage_path` | text | `photos` 버킷 내 실제 경로. 형식: `{photo_date}/{uuid}.{ext}` (예: `20260917/55fa7b89-4e58-4841-b755-8f8f9fabce05.jpg`). Storage 객체 키는 한글을 허용하지 않아 일부러 `file_name`과 분리했다 |
| `created_at` | timestamptz | 행 생성 시각(KST로 표시됨) |
| `received_at` | timestamptz | 서버 수신 시각(현재는 `created_at`과 동일하게 채워짐) |

인덱스: `(workplace_name, photo_date)` 복합 인덱스 존재 (작업장·날짜 기준 조회 최적화).

### 8.3 `photos` Storage 버킷

- 이름: `photos`, **private**(공개 아님), 파일 크기 제한 50MB, MIME 제한 없음
- 객체 키: `photo_uploads.storage_path` 값과 정확히 일치
- private 버킷이므로 이미지를 화면에 보여주려면 signed URL을 발급해야 한다(공개 URL 없음):

```js
const { data, error } = await supabase.storage
  .from("photos")
  .createSignedUrl(storagePath, 60 * 10); // 10분짜리 임시 URL
// data.signedUrl 을 <img src>로 사용
```

목록 화면처럼 여러 장을 한 번에 보여줄 때는 `createSignedUrls(paths, expiresIn)`로 일괄 발급한다.

### 8.4 조회 (Read)

```js
const { data, error } = await supabase
  .from("photo_uploads")
  .select("*")
  .eq("workplace_name", "충주")       // 선택: 작업장 필터
  .eq("photo_date", "20260917")       // 선택: 날짜 필터
  .order("created_at", { ascending: false })
  .range(0, 49);                      // 페이지네이션
```

REST(Data API)로 직접 호출할 경우:

```http
GET https://yipfgjuuzskwlqnllunc.supabase.co/rest/v1/photo_uploads?select=*&order=created_at.desc&limit=50
apikey: {SUPABASE_SECRET_KEY}
Authorization: Bearer {SUPABASE_SECRET_KEY}
```

### 8.5 수정 (Update)

수정 대상은 **메타데이터 필드**(`workplace_name`, `category`)로 한정한다. `storage_path`/`file_name`은 실제 파일과 묶여 있으므로 직접 고치지 않는다(사진 자체를 바꿔야 하면 8.6의 삭제 후 재업로드로 처리).

```js
const { error } = await supabase
  .from("photo_uploads")
  .update({ category: "작업후" })
  .eq("id", targetId);
```

### 8.6 삭제 (Delete)

**Storage 파일과 DB 행을 함께 지워야 한다.** DB 행만 지우면 Storage에 파일이 고아로 남는다. 순서: Storage 먼저 삭제 → 성공 시 DB 행 삭제.

```js
const { data: row } = await supabase
  .from("photo_uploads")
  .select("storage_path")
  .eq("id", targetId)
  .single();

const { error: removeError } = await supabase.storage
  .from("photos")
  .remove([row.storage_path]);

if (!removeError) {
  await supabase.from("photo_uploads").delete().eq("id", targetId);
}
```

### 8.7 WattLineWeb 구현 시 체크리스트

- Secret key는 WattLineWeb 서버(API 라우트/서버리스 함수)에만 두고, 브라우저로 절대 내려보내지 않는다.
- 이미지 표시는 반드시 signed URL 발급을 거친다(버킷이 private).
- 삭제는 Storage → DB 순서로, 실패 시 DB 행을 지우지 않도록 트랜잭션처럼 처리한다.
- 한글이 포함될 수 있는 필드는 `file_name`, `workplace_name`, `category` 뿐이며 `storage_path`는 항상 ASCII다.
- 대량 조회 시 `workplace_name` + `photo_date` 인덱스를 활용해 필터링한다.

## 9. 참고

관련 디자인/기획은 DESIGN.md를 기준으로 확장하며, 실제 프로젝트 진행 시 사용자 요구와 안전 규칙을 반영해 화면을 계속 개선한다.
