# 꿈고래 아카이브

정적 페이지(`index.html`, `app.js`, `style.css`)와 내용 파일(`data/projects.json`), 관리용 API 두 개(`api/`)로 된 사이트예요. 빌드 과정이 없어요.

## 처음 올리기

1. GitHub에 새 저장소를 만들고 이 폴더 전체를 올려요. (예: `ggumgorae-archive`)
2. Vercel에서 **Add New → Project**로 그 저장소를 가져와요. Framework Preset은 **Other**, 빌드 설정은 비워 둬요.
3. **Settings → Environment Variables**에 아래 네 개를 넣고 다시 배포해요.

| 이름 | 값 |
|---|---|
| `ADMIN_PASSWORD` | 관리 화면 비밀번호. 길고 추측하기 어렵게. |
| `GITHUB_TOKEN` | GitHub **Fine-grained token**. 이 저장소 하나만 고르고, 권한은 *Contents: Read and write* 하나만. |
| `GITHUB_REPO` | `내계정/ggumgorae-archive` 형식 |
| `GITHUB_BRANCH` | `main` (기본 브랜치 이름) |

## 내용 고치기

`주소/#/admin` 으로 들어가 비밀번호를 넣으면 관리 화면이 열려요. 고친 뒤 위쪽 파란 띠의 **사이트에 반영**을 누르면
`data/projects.json`이 GitHub에 커밋되고, Vercel이 자동으로 다시 배포해서 1~2분 뒤 사이트에 나타나요.
커밋 기록이 남으니 잘못 고쳐도 GitHub에서 예전 버전으로 되돌릴 수 있어요.

## 도메인 연결

Vercel 프로젝트의 **Settings → Domains**에서 산 도메인을 추가하고, 안내하는 DNS 값을 도메인 업체에 넣으면 돼요.
Vercel에서 도메인을 직접 사면 DNS 설정 없이 바로 연결돼요.

## 내 컴퓨터에서 보기

`npx vercel dev` 를 실행하면 관리 API까지 포함해서 `http://localhost:3000` 에서 돌아가요.
(그냥 파일을 더블클릭해서 열면 내용 파일을 못 읽어요.)
