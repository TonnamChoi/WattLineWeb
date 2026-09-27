# WattLine Supabase DB 구조 (WattLineApp 연동용)

> 기준일: 2026-09-27 (실제 DB에서 직접 조회해 현행화)
> 대상: WattLineApp(현장 작업자용 모바일 앱) 개발자
> 이 문서는 WattLineWeb 저장소의 `docs/`에 있다. WattLineApp 쪽에서 쓰려면 이 파일을 복사해 가면 된다. DB 구조가 바뀌면 WattLineWeb에서 이 문서를 먼저 고친다.

## 1. 개요

| 항목 | 값 |
|---|---|
| Supabase 프로젝트명 | `WattLine` |
| 프로젝트 ref | `yipfgjuuzskwlqnllunc` (region `ap-northeast-1`) |
| Project URL | `https://yipfgjuuzskwlqnllunc.supabase.co` |
| 사용 프로그램 | WattLineApp(현장 사진 업로드), WattLineWeb(회사 담당자용 관리 웹) |
| DB 타임존 | `Asia/Seoul` (`timestamptz`는 KST로 조회됨) |

**접근 방식 (중요)**
- `public` 스키마의 모든 테이블과 두 Storage 버킷은 **RLS가 켜져 있고 정책이 하나도 없다.**
- 그래서 publishable/anon key로는 읽기와 쓰기가 모두 불가능하고, **서버 전용 Secret key(`SUPABASE_SECRET_KEY`)로만 접근할 수 있다.**
- 앱은 브라우저에서 Supabase에 직접 붙지 말고, 자기 서버(API 라우트)에서 Secret key로 접근해야 한다.
- 키 값은 각 저장소의 `docs-private.md`(git 제외)와 Vercel 환경변수에만 둔다. 공개 저장소이므로 절대 커밋하지 않는다.

## 2. 테이블 관계

```
companies (한전 협력사)
  ├─< app_users        (company_id, ON DELETE RESTRICT)
  └─< workplaces       (company_id, ON DELETE RESTRICT)
         ├─< workplace_workers >─ app_users   (작업장 ↔ 작업자 N:M, 양쪽 모두 ON DELETE CASCADE)
         ├─< photo_uploads                    (workplace_id, ON DELETE SET NULL)
         └── pruning_results                  (workplace_id 1:1, ON DELETE CASCADE)
                └── updated_by → app_users    (ON DELETE SET NULL)
```

- 회사에 사용자나 작업장이 남아 있으면 그 회사는 삭제할 수 없다(RESTRICT).
- 작업장을 삭제하면 그 작업장의 작업자 배정과 전지작업 결과(`pruning_results`)는 함께 지워진다. 사진(`photo_uploads`)은 남고 `workplace_id`만 비워진다.

## 3. 테이블 상세

### 3.1 `companies` — 회사(한전 협력사)

| 컬럼 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `id` | uuid (PK) | ✔ | `gen_random_uuid()` | |
| `name` | text, **unique** | ✔ | | 회사명 |
| `business_no` | text | | | 사업자번호 |
| `ceo_name` | text | | | 대표자 |
| `address` | text | | | 주소 |
| `phone` | text | | | 전화 |
| `memo` | text | | | 비고 |
| `created_at` / `updated_at` | timestamptz | ✔ | `now()` | |

### 3.2 `app_users` — 사용자(로그인 계정)

| 컬럼 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `id` | uuid (PK) | ✔ | `gen_random_uuid()` | |
| `login_id` | text, **unique** | ✔ | | 로그인 아이디 |
| `password_hash` | text | ✔ | | 비밀번호 해시 (4장 참고). **절대 클라이언트로 내려보내지 않는다** |
| `name` | text | ✔ | | 사용자명 |
| `company_id` | uuid → `companies.id` | | | 소속 회사 (없을 수 있음) |
| `phone` | text | | | 연락처 |
| `role` | text, check `admin`/`company_admin`/`worker` | ✔ | `'worker'` | 사용자 권한 (아래 표 참고) |
| `is_active` | boolean | ✔ | `true` | `false`면 로그인 불가 |
| `created_at` / `updated_at` | timestamptz | ✔ | `now()` | |

- Supabase 기본 인증 테이블(`auth.users`)은 쓰지 않는다. 이 테이블이 자체 계정 테이블이다.

**사용자 권한 (`role`)**

| 값 | 이름 | WattLineWeb | WattLineApp |
|---|---|---|---|
| `admin` | 관리자 (총괄 시스템 관리자) | 전체 메뉴. 설정(관리자) 메뉴에서 회사·사용자 관리, 모든 회사 작업장 관리 | 사용 가능 |
| `company_admin` | 회사관리자 | 설정(관리자) 메뉴를 뺀 모든 메뉴. **소속 회사 작업장만** 추가·수정·삭제 | 사진 업로드 가능 |
| `worker` | 일반사용자 | **로그인 불가** | 사진 업로드 |

- `company_admin`은 `company_id`가 있어야 관리 기능을 쓸 수 있다.

### 3.3 `workplaces` — 작업장 (회사별 작업 건)

| 컬럼 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `id` | uuid (PK) | ✔ | `gen_random_uuid()` | |
| `company_id` | uuid → `companies.id` | ✔ | | 작업장을 가진 회사 |
| `name` | text | ✔ | | 작업장명 (예: "충주대로 20경간"). 앞뒤 공백이 들어 있을 수 있으니 표시할 때 `trim` 권장 |
| `description` | text | | | 작업내용 |
| `start_date` / `end_date` | date | | | 작업시작일 / 작업종료일 |
| `is_completed` | boolean | ✔ | `false` | 작업완료 여부 |
| `memo` | text | | | 비고 |
| `created_at` / `updated_at` | timestamptz | ✔ | `now()` | |

### 3.4 `workplace_workers` — 작업장별 배정 작업자 (N:M)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `workplace_id` | uuid → `workplaces.id` | PK(복합) |
| `user_id` | uuid → `app_users.id` | PK(복합) |

### 3.5 `photo_uploads` — WattLineApp이 올린 현장 사진 메타데이터

> **2026-09-27 추가**: WattLineWeb도 이 테이블의 행을 **추가·삭제**한다.
> - 삭제: 전지작업 표의 분류 칸 사진을 지우면(`DELETE /api/wattline-db`) 행과 `photos` 파일이 함께 삭제된다. 관리자는 전체, 회사관리자는 소속 회사 작업장 사진만 삭제할 수 있다.
> - 추가:  전지작업 화면에서 웹으로 올린 사진(`pruning-photos`)을 표의 분류 칸으로 끌어다 놓으면, 서버(`PATCH /api/pruning`)가 파일을 `photos` 버킷 `{오늘 KST 날짜}/{uuid}.{ext}`로 복사하고 WattLineApp과 같은 형식의 행(`workplace_id`, `workplace_name`, `category`, `photo_date`, `file_name`, `storage_path`)을 추가한 뒤 원본을 지운다. 따라서 `photo_uploads`에는 앱 촬영 사진과 웹에서 옮긴 사진이 섞여 있을 수 있다(구분 열은 없다).

| 컬럼 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `id` | uuid (PK) | ✔ | `gen_random_uuid()` | |
| `workplace_name` | text | ✔ | | 작업장명(글자). 과거 호환용 |
| `category` | text | ✔ | | `시작전주`/`종료전주`/`작업전`/`흉고직경`/`작업후`/`기타` |
| `photo_date` | text | ✔ | | `YYYYMMDD` (촬영 기기 기준 날짜) |
| `file_name` | text | ✔ | | 표시·다운로드용 원본 파일명 (한글 가능) |
| `storage_path` | text | ✔ | | `photos` 버킷 내 실제 경로 `{photo_date}/{uuid}.{ext}` (ASCII만) |
| `created_at` / `received_at` | timestamptz | ✔ | `now()` | |
| **`workplace_id`** | uuid → `workplaces.id` | | | **2026-09-26 추가.** 사진이 속한 작업장 |

### 3.6 `pruning_results` — 전지작업 분석 결과 (WattLineWeb 전용, 작업장당 1행)

WattLineWeb 전지작업 화면의 **저장** 버튼으로 저장한 값이다. 화면을 열면 이 값을 불러와 표를 채운다. WattLineApp은 읽거나 쓸 필요가 없다.

| 컬럼 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `id` | uuid (PK) | ✔ | `gen_random_uuid()` | |
| `workplace_id` | uuid → `workplaces.id`, **unique** | ✔ | | 작업장 (작업장 삭제 시 함께 삭제) |
| `pole_start` / `pole_end` | text | | | 전주번호 시작 / 끝 (시작·종료전주 사진 AI 판독 또는 직접 입력) |
| `tree_species` | text | | | 수목종류 |
| `dia_under10` ~ `dia_over40` | integer | ✔ | `0` | 준공내역: 흉고직경 구간별 본수 (10cm 미만 / 10·20·30·40cm 이상) |
| `dia_total` | integer | ✔ | `0` | 준공내역 합계 |
| `note` | text | | | 비고 |
| `work_intensity` | text | | | 작업강도 (강전지/약전지) |
| `tree_classification` | text | | | 나무분류 (낙엽수/상록수) |
| `span_description` | text | | | 경간구분 |
| `work_content` | text | | | 작업내용 |
| `confidence` | integer | | | 정확도 (판독된 사진들의 평균, 0~100) |
| `reasoning` | text | | | 기타 세부 정보 (예: "사진 5장 중 4장 판독") |
| `photo_analysis` | jsonb | ✔ | `'{}'` | 사진별 분석 상태. 키는 `photo_uploads.id`, 값은 `{ status, message, value?, diameterCm?, confidence? }` (status: `completed`/`failed`/`unreadable`) |
| `photo_order` | jsonb | ✔ | `'{}'` | 분류 칸별 사진 순서. `{ "시작전주": [photo_uploads.id, ...], ... }` (사진 2장 이상인 칸만). 화면에서 끌어다 놓아 바꾼 순서 |
| `updated_by` | uuid → `app_users.id` | | | 마지막으로 저장한 사용자 |
| `created_at` / `updated_at` | timestamptz | ✔ | `now()` | |

- API: `GET /api/pruning-results?workplaceId=` (조회), `PUT /api/pruning-results` (저장, `workplace_id` 기준 upsert). 로그인 필요, 관리자는 전체·회사관리자는 소속 회사 작업장만.
- 분석은 시작전주·종료전주·흉고직경 칸마다 **맨 첫 번째 사진만** 한다 (`photo_order` 순서 기준).
- 재분석할 때 `photo_analysis`에서 `completed`인 사진은 다시 분석하지 않는다.

## 4. WattLineApp이 해야 할 일 (연동 규칙)

### 4.1 ⚠️ 사진 업로드 시 `workplace_id`를 반드시 저장
- WattLineWeb의 전지작업 화면은 이제 `workplace_name`(글자)이 아니라 **`workplace_id`로 사진을 걸러서 보여준다.**
- `workplace_id`가 비어 있는 사진은 **웹 어디에도 나오지 않는다.**
- 앱에서 작업장명을 직접 입력받는 대신 **작업장 목록에서 고르게** 하고, 고른 작업장의 `id`를 `workplace_id`에, `name`을 `workplace_name`에 함께 저장한다.

```ts
await supabase.from("photo_uploads").insert({
  workplace_id: selectedWorkplace.id,
  workplace_name: selectedWorkplace.name.trim(),
  category,          // 시작전주/종료전주/작업전/흉고직경/작업후/기타
  photo_date,        // YYYYMMDD
  file_name,
  storage_path,      // photos 버킷에 먼저 업로드한 경로
});
```

### 4.2 작업자가 고를 작업장 목록
로그인한 사용자(`worker`, `company_admin`)에게는 **자기 소속 회사의 미완료 작업장**만 보여주는 것을 권장한다. 배정된 작업장만 보여주려면 `workplace_workers`로 거른다.

```ts
// 소속 회사 기준
const { data } = await supabase
  .from("workplaces")
  .select("id, name, description, start_date, end_date")
  .eq("company_id", user.company_id)
  .eq("is_completed", false)
  .order("start_date", { ascending: false, nullsFirst: false });

// 배정된 작업장만
const { data: assigned } = await supabase
  .from("workplace_workers")
  .select("workplace:workplaces(id, name, is_completed)")
  .eq("user_id", user.id);
```

### 4.3 로그인 (계정 공유)
- WattLineWeb과 **같은 `app_users` 계정**을 쓸 수 있다. 관리자가 WattLineWeb의 [관리자 → 사용자]에서 계정을 만든다.
- `password_hash` 형식: `scrypt$<salt hex 32자>$<hash hex 128자>`
  - Node `crypto.scryptSync(password, salt, 64)`의 결과를 hex로 저장한 것이다(salt는 문자열 그대로 사용).
- 검증 방법(서버에서):

```ts
import { scryptSync, timingSafeEqual } from "crypto";

function verifyPassword(stored: string, password: string) {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
```

- `is_active = false`인 계정은 로그인을 거부한다.
- WattLineApp은 `worker`와 `company_admin` 모두 로그인을 허용해야 한다. WattLineWeb은 `worker` 로그인을 거부한다.
- WattLineWeb의 로그인 토큰은 WattLineWeb 서버 전용이다. 앱은 자기 세션 방식을 따로 두면 된다. WattLineWeb의 `/api/auth`를 앱에서 직접 호출하려면 WattLineWeb에 CORS 설정을 추가해야 한다(현재 없음).

## 5. Storage 버킷

| 버킷 | 공개 | 사용 프로그램 | 경로 규칙 |
|---|---|---|---|
| `photos` | private | **WattLineApp** 업로드, WattLineWeb 조회 | `{photo_date}/{uuid}.{ext}` = `photo_uploads.storage_path` |
| `pruning-photos` | private | WattLineWeb 전용 (웹에서 직접 올린 사진) | `{workplace_id}/{timestamp}-{rand}-{파일명}` |

- 두 버킷 모두 private이라 조회할 때마다 signed URL을 발급해야 한다(WattLineWeb 기준 10분~6시간).
- 크기와 MIME 제한은 버킷에 걸려 있지 않다. 업로드 전 클라이언트 압축(긴 변 1600px, JPEG 90%)을 권장한다.

## 6. 변경 이력

| 날짜 | 변경 | 마이그레이션 |
|---|---|---|
| 2026-09-17 | `photo_uploads` 테이블, `photos` 버킷 생성 (WattLineApp) | |
| 2026-09-18 | `pruning-photos` 버킷 생성 (WattLineWeb) | |
| 2026-09-26 | `companies`, `app_users`, `workplaces`, `workplace_workers` 생성 | `create_admin_tables` |
| 2026-09-26 | `photo_uploads.workplace_id` 추가, 기존 10행을 "충주대로 20경간"에 연결 | `photo_uploads_add_workplace_id` |
| 2026-09-26 | `app_users.role`에 `company_admin` 추가 (3단계 권한) | `app_users_add_company_admin_role` |
| 2026-09-26 | `pruning-photos`를 작업장별 폴더 구조로 변경 (기존 루트 사진 1장 삭제) | (Storage) |
| 2026-09-27 | WattLineWeb이 `photo_uploads`에 행 추가(웹 사진을 분류 칸으로 이동)·삭제(분류 칸 사진 삭제) 시작 | (코드) |
| 2026-09-27 | `pruning_results` 테이블 생성 (전지작업 분석 결과 저장) | `create_pruning_results` |
| 2026-09-27 | `pruning_results.photo_order` 추가 (칸별 사진 순서) | `pruning_results_add_photo_order` |
