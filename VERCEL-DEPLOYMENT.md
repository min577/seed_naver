# Vercel 배포 가이드 - 토마토 가격 비교 대시보드

## 1. GitHub 리포지토리 생성

1. [GitHub](https://github.com) 접속 및 로그인
2. 우측 상단 `+` → `New repository` 클릭
3. Repository name: `tomato-price-dashboard` (또는 원하는 이름)
4. Public 또는 Private 선택
5. **Create repository** 클릭

## 2. 로컬 Git을 GitHub에 푸시

```bash
cd "c:\Users\김민우\Desktop\naver"

# GitHub 리포지토리 URL 연결 (YOUR-USERNAME을 본인 GitHub 아이디로 변경)
git remote add origin https://github.com/YOUR-USERNAME/tomato-price-dashboard.git

# 메인 브랜치로 변경
git branch -M main

# GitHub에 푸시
git push -u origin main
```

## 3. Vercel 배포

### 3-1. Vercel 계정 생성 및 로그인

1. [Vercel](https://vercel.com) 접속
2. `Sign Up` → GitHub 계정으로 로그인

### 3-2. 프로젝트 Import

1. Vercel 대시보드에서 `Add New...` → `Project` 클릭
2. GitHub 리포지토리에서 `tomato-price-dashboard` 선택
3. `Import` 클릭

### 3-3. 환경 변수 설정

**Environment Variables** 섹션에서 다음 변수들을 추가:

| Name | Value |
|------|-------|
| `NAVER_CLIENT_ID` | `DVxnoAeRqeauwlQxr7Wb` |
| `NAVER_CLIENT_SECRET` | `hKeyoAy_QN` |
| `KAMIS_API_KEY` | `7c1e5d34-54b8-4427-a8a5-9cdf44166e7f` |
| `KAMIS_CERT_ID` | `4422` |

**중요:** 환경 변수는 다음과 같이 설정합니다:
- Environment: `Production`, `Preview`, `Development` 모두 체크
- 각 변수를 `Add` 버튼으로 추가

### 3-4. 배포 시작

1. `Deploy` 버튼 클릭
2. 배포 진행 상황 확인 (약 1-2분 소요)
3. 배포 완료 후 생성된 URL 확인 (예: `https://tomato-price-dashboard.vercel.app`)

## 4. 배포 후 확인

1. 생성된 URL 접속
2. 대시보드가 정상적으로 로드되는지 확인
3. 새로고침 버튼을 눌러 데이터가 로드되는지 확인

## 5. 도메인 설정 (선택사항)

Vercel 대시보드에서:
1. 프로젝트 선택
2. `Settings` → `Domains`
3. 커스텀 도메인 추가 가능

## 6. 업데이트 방법

로컬에서 코드 수정 후:

```bash
cd "c:\Users\김민우\Desktop\naver"

git add .
git commit -m "업데이트 내용"
git push origin main
```

→ Vercel이 자동으로 감지하여 재배포합니다!

## 7. 주의사항

- n8n은 Vercel에 배포할 수 없습니다 (상태 유지 서버 필요)
- 현재는 KAMIS API를 직접 호출하도록 설정되어 있습니다
- KAMIS API 타임아웃 시 더미 데이터로 대체됩니다
- 네이버 쇼핑 API는 정상 작동합니다

## 8. 트러블슈팅

### API가 작동하지 않는 경우

1. Vercel 대시보드 → 프로젝트 → `Settings` → `Environment Variables` 확인
2. 모든 환경 변수가 올바르게 설정되었는지 확인
3. `Deployments` → 최신 배포 → `View Function Logs` 에서 에러 확인

### 빌드 실패 시

- `package.json`에 `axios`가 dependencies에 있는지 확인
- Vercel 대시보드에서 빌드 로그 확인

## 9. 비용

- Vercel **Free Plan**: 월 100GB 대역폭, 무제한 배포
- 대부분의 소규모 프로젝트는 무료로 사용 가능

---

**배포 완료 후 URL을 공유하시면 어디서든 접속 가능합니다!** 🚀
