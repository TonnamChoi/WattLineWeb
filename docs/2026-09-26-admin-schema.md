# 관리자 메뉴 (회사 / 사용자 / 작업장) — 2026-09-26

좌측 사이드바 **관리자** 그룹 아래에 회사, 사용자, 작업장 CRUD 화면을 추가했다.

## DB (Supabase `WattLine` 프로젝트, `yipfgjuuzskwlqnllunc`)

마이그레이션명: `create_admin_tables`. WattLine 모바일 앱의 `photo_uploads`와 같은 DB이지만 서로 참조하지 않는다.

| 테이블 | 주요 컬럼 | 비고 |
|---|---|---|
| `companies` | name(unique), business_no, ceo_name, address, phone, memo | 한전 협력사 |
| `app_users` | login_id(unique), password_hash, name, company_id→companies, phone, role(`admin`/`worker`), is_active | `auth.users`와 이름 충돌을 피하려고 `app_users`로 지음 |
| `workplaces` | company_id→companies(필수), name, description, start_date, end_date, is_completed, memo | 협력사별 작업장 |
| `workplace_workers` | (workplace_id, user_id) PK | 작업장↔작업자 N:M. 작업장/사용자 삭제 시 cascade |

- 모든 테이블은 RLS를 켜고 정책을 두지 않았다. 따라서 `SUPABASE_SECRET_KEY`를 쓰는 서버만 접근할 수 있다.
- 회사 FK는 `on delete restrict`이다. 사용자나 작업장이 남아 있는 회사는 삭제할 수 없다.
- 비밀번호는 `scrypt$<salt>$<hash>` 형식(Node `crypto.scryptSync`, 64바이트)으로 저장한다. API 응답에는 절대 포함하지 않는다. 수정할 때 비밀번호가 비어 있으면 기존 값을 유지한다.

## API

`/api/admin?entity=companies|users|workplaces` 하나로 처리한다. Vercel 함수 수를 아끼기 위해서다.
- 로직: `providers/handleAdminRequest.ts`
- 배포용 진입점: `api/admin.ts`
- 로컬 개발용 진입점: `server.ts`

- `GET`: 목록 조회. users에는 `company{name}`, workplaces에는 `company{name}`, `workers[{user_id}]`가 포함된다.
- `POST`: 추가. `PUT`: 수정(body에 `id` 포함). `DELETE`: 삭제(body `{ id }`).
- workplaces의 POST/PUT에서 `worker_ids: string[]`를 보내면 작업자 연결을 통째로 교체한다.

## 로그인 (2026-09-26 추가)

- 첫 화면은 로그인 화면이다(`src/components/LoginPage.tsx`). 로그인해야 앱을 쓸 수 있다.
- `POST /api/auth` `{ loginId, password }` → `{ token, user }`. 비밀번호가 틀려도, 아이디가 없어도 같은 메시지(401)를 준다. 중지된 계정은 403.
- `GET /api/auth` (헤더 `Authorization: Bearer <token>`) → `{ user }`. 새로고침할 때 세션을 복원하는 용도이고, 매번 DB를 다시 읽어 중지된 계정은 바로 차단한다.
- 토큰 형식은 `base64url(JSON{uid, role, exp}).HMAC-SHA256`이고 유효시간은 12시간이다. 브라우저 `localStorage`의 `wattline.authToken`에 저장한다.
- 서명 키는 `sha256("wattline-auth:" + SUPABASE_SECRET_KEY)`로 만든다. 별도 환경변수는 없다. **Supabase 키를 교체하면 모든 사용자가 로그아웃된다.**
- 권한 3단계(2026-09-26 변경): `admin`(총괄), `company_admin`(회사관리자), `worker`(일반사용자, 웹 로그인 불가).
- `/api/admin` 권한은 DB 기준으로 매번 다시 확인한다.
  - `admin`: 전체 허용.
  - `company_admin`: 조회는 소속 회사 데이터만 된다. 추가·수정·삭제는 `workplaces`만 되고, `company_id`는 소속 회사로 강제된다. 다른 회사 작업장의 수정·삭제는 403. 작업자 배정은 같은 회사 사용자만 반영된다.
  - `worker`: 403.
- 최초 관리자 계정: `admin` (2026-09-26 생성, 임시 비밀번호는 대화로 전달함. 변경 필요).

## 작업장 ↔ 전지작업 사진 연결 (2026-09-26 추가)

- 작업장 목록(`GET /api/workplaces`, 로그인 필요)에서 작업자는 자기 회사 작업장만 받는다. 관리자는 `?companyId=`로 회사를 고를 수 있고, 비우면 전체를 받는다.
- 작업장명을 누르면 해당 작업장이 선택된 채로 전지작업 화면으로 이동한다. 전지작업 화면 위쪽의 선택창으로 작업장을 바꿀 수도 있다.
- **웹 업로드 사진** (`pruning-photos` 버킷): 경로는 `{workplace_id}/{timestamp}-{rand}-{파일명}`이다. `GET /api/pruning?workplaceId=`는 해당 폴더만 조회하고, `POST`에는 `workplaceId`가 필수다. 폴더명은 uuid 형식만 허용한다.
  - 연결 전에 루트에 있던 사진 1장은 사용자 요청으로 삭제했다.
- **모바일 앱 사진** (`photo_uploads`): 마이그레이션 `photo_uploads_add_workplace_id`로 `workplace_id uuid → workplaces(id) on delete set null` 열을 추가했다(nullable). `GET /api/wattline-db?workplaceId=`는 이 열로 거른다.
  - 기존 10장(workplace_name "충주" 8장, "서울" 2장)은 모두 "충주대로 20경간"(`b800b7cd-294a-414e-8e51-32de4e75222f`)에 연결했다.
  - ⚠️ **WattLine 모바일 앱이 업로드할 때 `workplace_id`를 넣지 않으면, 그 사진은 어느 작업장의 전지작업 화면에도 나오지 않는다.** 모바일 앱 쪽 수정이 필요하다.

## ⚠️ 남은 과제

- `/api/extract`, `/api/pruning`, `/api/pruning-extract`, `/api/wattline-db`는 아직 토큰 검사가 없다. 화면은 로그인해야 보이지만 API는 직접 호출할 수 있다.
- 관리자가 자기 계정을 중지·삭제하거나 역할을 작업자로 바꾸는 것을 막는 장치가 없다. 관리자가 한 명뿐이면 잠길 수 있다.
