# PKI 인증 트러블슈팅 가이드

## 🔍 현재 상태

### 성공한 단계 ✅
1. ✅ **챌린지 생성**: 44자 Base64 문자열 생성됨
2. ✅ **서명 생성**: Agent에서 344자 서명 생성됨
3. ✅ **시리얼 번호 획득**: A1A72FCFE54B761D644E528F3B47EE66

### 실패한 단계 ❌
4. ❌ **서명 검증**: PKI 서버에서 401 Unauthorized + "Invalid signature" 반환

---

## 📊 실제 요청 데이터 확인 방법

### **Method 1: Network 탭 확인 (가장 정확함)** ⭐ 추천

1. **F12** 개발자 도구 열기
2. **Network** 탭으로 이동
3. "인증서 로그인" 클릭하여 인증 시도
4. 네트워크 목록에서 `https://pki.2check.io/api/auth/verify-and-login` 요청 찾기
5. **Request** 탭 클릭 → **Payload** 또는 **Request Body** 확인

**확인할 내용:**
```json
{
  "challenge": "aLs93Z4/bD6ieV1Wk0J2Lroxoh7AHdqx+nD9LxrOEhs=",
  "signature": "fBBcA9ORwXPtefpDEuht...",
  "certificateSerialNumber": "A1A72FCFE54B761D644E528F3B47EE66",  // ← 대문자 확인
  "clientId": "d7e2c4733cc1a696846de841660730d2",
  "redirectUri": "https://localhost:3000",
  "scope": "openid profile email",
  "state": "random_state"
}
```

**Response 확인:**
```json
{
  "error": "Invalid signature"  // ← 이 에러 메시지 확인
}
```

### **Method 2: 콘솔 로그에서 확인**

브라우저 콘솔에서 다음 로그를 찾으세요:
```typescript
// 콘솔에서 확인
// ✅ [PKI] 챌린지 생성 성공: {challengeLength: 44}
// 매번 새로운 challenge가 생성되는지 확인
```

---

## 🔧 가능한 원인 분석

### 원인 1: Challenge 재사용 ⭐ **가장 가능성 높음**

**증상**: 같은 Challenge로 여러 번 시도 시 실패

**해결책**:
- 매번 로그인 시도할 때마다 새로운 Challenge 생성
- Challenge는 일회용입니다

**확인 방법**:
```typescript
// 콘솔에서 확인
// ✅ [PKI] 챌린지 생성 성공: {challengeLength: 44}
// 매번 새로운 challenge가 생성되는지 확인
```

### 원인 2: Client ID/Secret 불일치

**증상**: 401 Unauthorized 에러

**해결책**:
```env
# .env.local에서 확인
NEXT_PUBLIC_PKI_CLIENT_ID=d7e2c4733cc1a696846de841660730d2  ✅ 확인됨
NEXT_PUBLIC_PKI_CLIENT_SECRET=93eb79e644b408832c070cc988e172c4417d8a03993b81136ba21de71ef12218
```

**확인 방법**:
- PKI 관리자에게 CLIENT_ID/SECRET이 유효한지 확인
- 환경 변수 재로드 후 개발 서버 재시작

### 원인 3: 시리얼 번호 형식 오류

**증상**: "Certificate not found" 또는 "Invalid signature"

**해결책**:
```typescript
// 시리얼 번호 형식 확인
// ✅ 올바른 형식: A1A72FCFE54B761D644E528F3B47EE66 (대문자 16진수)
// ❌ 잘못된 형식: a1a72fcfe54b761d644e528f3b47ee66 (소문자)

// Agent에서 반환한 serialNumber 확인
console.log("Serial Number:", serialNumber);  // 대문자인지 확인
```

### 원인 4: PKI 서버에 인증서 미등록

**증상**: 시리얼 번호로 인증서를 찾을 수 없음

**해결책**:
- PKI 서버에 해당 인증서가 등록되어 있는지 확인
- `/api/auth/verify-and-login` 엔드포인트가 올바르게 구현되었는지 확인

---

## 🛠️ 디버깅 단계

### Step 1: 콘솔 로그 확인

