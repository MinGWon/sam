# SamSquare PKI 인증 통합 가이드

## 개요

PKI 인증서 기반 로그인을 SamSquare에 완전히 통합합니다.

**목표:**
- 로컬 네트워크 접근 권한 문제 해결
- iframe 없이 Agent와 직접 통신
- 사용자 경험 개선

---

## 📚 관련 문서

1. **공통 컴포넌트 가이드**: `CommonComponents-사용방법.md`
   - Button, Input, Select, SemiTagButton 사용법
   - 자동 로딩, 에러 처리 등

2. **CompactTable 가이드**: `CompactTable-사용방법.md`
   - 테이블 컴포넌트 사용법
   - 헤더 고정, 컬럼 고정 등

3. **이 문서**: PKI 인증 통합 상세 가이드

---

## 🔧 구현 요구사항

### 필요한 환경 변수

```env
# .env.local
NEXT_PUBLIC_PKI_CLIENT_ID=your_client_id_here
NEXT_PUBLIC_PKI_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_PKI_SERVER_URL=https://pki.2check.io
NEXT_PUBLIC_AGENT_URL=https://localhost:52443
```

### 필요한 라이브러리

- Next.js (기존)
- React (기존)
- Font Awesome (아이콘)
- 추가 설치 불필요 (기본 fetch API 사용)

---

## 🏗️ 구현 구조

### 파일 구조

