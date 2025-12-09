# 공통 컴포넌트 사용 가이드

## 📋 개요

SAMSQUARE 프로젝트의 공통 UI 컴포넌트 모음입니다.
일관된 디자인과 사용자 경험을 제공하기 위해 제작되었습니다.

---

## 🎨 컴포넌트 목록

1. [Button](#button---버튼) - 다양한 스타일의 버튼
2. [Input](#input---입력창) - 텍스트 입력 필드
3. [Select](#select---선택창) - 드롭다운 선택 박스
4. [SemiTagButton](#semitagbutton---세미태그-버튼) - 태그 스타일의 작은 버튼 ⭐ NEW

---

## Button - 버튼

### 📦 Import

```tsx
import Button from "@/components/common/Button";
```

### 🔧 Props

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `variant` | `"primary" \| "secondary" \| "danger" \| "success" \| "ghost"` | `"primary"` | 버튼 스타일 |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | 버튼 크기 |
| `fullWidth` | `boolean` | `false` | 전체 너비 사용 |
| `loading` | `boolean` | `false` | 로딩 상태 (수동 제어) |
| `autoLoading` | `boolean` | `false` | 클릭 시 자동 로딩 ⭐ NEW |
| `loadingDuration` | `number` | `1000` | 자동 로딩 지속 시간 (ms) ⭐ NEW |
| `icon` | `string` | - | Font Awesome 아이콘 |
| `required` | `boolean` | `false` | 필수 표시 (빨간 삼각형) |
| `disabled` | `boolean` | `false` | 비활성화 |
| `children` | `ReactNode` | - | 버튼 텍스트 |

### 💡 사용 예시

#### 1. 기본 사용

```tsx
<Button>저장</Button>
```

#### 2. 다양한 Variant

```tsx
<Button variant="primary">주요 버튼</Button>
<Button variant="secondary">보조 버튼</Button>
<Button variant="danger">삭제</Button>
<Button variant="success">완료</Button>
<Button variant="ghost">취소</Button>
```

#### 3. 크기 변경

```tsx
<Button size="sm">작은 버튼</Button>
<Button size="md">중간 버튼</Button>
<Button size="lg">큰 버튼</Button>
```

#### 4. 아이콘 추가

```tsx
<Button icon="fa-solid fa-save">저장</Button>
<Button icon="fa-solid fa-trash" variant="danger">삭제</Button>
<Button icon="fa-solid fa-plus" variant="success">추가</Button>
```

#### 5. 필수 표시 (빨간 삼각형)

```tsx
<Button required variant="primary">
  필수 작업
</Button>
```

#### 6. 로딩 상태

##### 수동 로딩 (기존 방식)

```tsx
const [loading, setLoading] = useState(false);

const handleSubmit = async () => {
  setLoading(true);
  try {
    await fetch("/api/submit", { method: "POST" });
  } finally {
    setLoading(false);
  }
};

<Button loading={loading} onClick={handleSubmit}>
  제출
</Button>
```

##### 자동 로딩 (새로운 방식) ⭐ NEW

```tsx
// 클릭 시 자동으로 1초간 로딩 표시
<Button autoLoading onClick={handleClick}>
  저장
</Button>

// 로딩 시간 커스터마이징 (2초)
<Button autoLoading loadingDuration={2000} onClick={handleClick}>
  제출
</Button>

// 실제 API 호출과 함께 사용
<Button 
  autoLoading 
  loadingDuration={1500}
  onClick={async () => {
    await fetch("/api/save", { method: "POST" });
    alert("저장 완료!");
  }}
>
  저장
</Button>
```

##### 자동 + 수동 로딩 조합

```tsx
const [loading, setLoading] = useState(false);

// loading이 true면 autoLoading은 무시됨
<Button 
  autoLoading
  loading={loading}
  onClick={async () => {
    setLoading(true);
    try {
      await longTask();
    } finally {
      setLoading(false);
    }
  }}
>
  긴 작업
</Button>
```

#### 7. 전체 너비

```tsx
<Button fullWidth variant="primary">
  전체 너비 버튼
</Button>
```

#### 8. 비활성화

```tsx
<Button disabled>비활성화</Button>
```

#### 9. 실제 사용 예시 (폼 제출)

```tsx
function SubmitForm() {
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async () => {
    setLoading(true);
    try {
      await fetch("/api/submit", { method: "POST" });
      alert("제출 완료!");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: "8px" }}>
      <Button
        variant="primary"
        icon="fa-solid fa-check"
        loading={loading}
        onClick={handleSubmit}
        required
      >
        제출
      </Button>
      <Button variant="secondary" disabled={loading}>
        취소
      </Button>
    </div>
  );
}
```

---

## Input - 입력창

### 📦 Import

```tsx
import Input from "@/components/common/Input";
```

### 🔧 Props

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | 입력창 크기 |
| `fullWidth` | `boolean` | `false` | 전체 너비 사용 |
| `error` | `string` | - | 에러 메시지 |
| `helperText` | `string` | - | 도움말 텍스트 |
| `label` | `string` | - | 라벨 텍스트 |
| `required` | `boolean` | `false` | 필수 표시 (빨간 삼각형) |
| `icon` | `string` | - | Font Awesome 아이콘 |
| `iconPosition` | `"left" \| "right"` | `"left"` | 아이콘 위치 |

### 💡 사용 예시

#### 1. 기본 사용

```tsx
<Input placeholder="이름을 입력하세요" />
```

#### 2. 라벨 추가

```tsx
<Input
  label="이메일"
  placeholder="example@email.com"
  type="email"
/>
```

#### 3. 필수 입력 (빨간 삼각형)

```tsx
<Input
  label="비밀번호"
  type="password"
  required
  placeholder="비밀번호를 입력하세요"
/>
```

#### 4. 아이콘 추가

```tsx
<Input
  icon="fa-solid fa-user"
  placeholder="사용자 이름"
/>

<Input
  icon="fa-solid fa-search"
  iconPosition="right"
  placeholder="검색..."
/>
```

#### 5. 에러 표시

```tsx
const [email, setEmail] = useState("");
const [error, setError] = useState("");

<Input
  label="이메일"
  value={email}
  onChange={(e) => {
    setEmail(e.target.value);
    if (!e.target.value.includes("@")) {
      setError("올바른 이메일 형식이 아닙니다.");
    } else {
      setError("");
    }
  }}
  error={error}
/>
```

#### 6. 도움말 텍스트

```tsx
<Input
  label="사용자 이름"
  helperText="영문, 숫자만 사용 가능합니다."
/>
```

#### 7. 크기 변경

```tsx
<Input size="sm" placeholder="작은 입력창" />
<Input size="md" placeholder="중간 입력창" />
<Input size="lg" placeholder="큰 입력창" />
```

#### 8. 실제 사용 예시 (로그인 폼)

```tsx
function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({ email: "", password: "" });

  const validate = () => {
    const newErrors = { email: "", password: "" };
    
    if (!email) {
      newErrors.email = "이메일을 입력하세요.";
    } else if (!email.includes("@")) {
      newErrors.email = "올바른 이메일 형식이 아닙니다.";
    }
    
    if (!password) {
      newErrors.password = "비밀번호를 입력하세요.";
    } else if (password.length < 6) {
      newErrors.password = "비밀번호는 6자 이상이어야 합니다.";
    }
    
    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      console.log("로그인 시도:", { email, password });
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "400px" }}>
      <Input
        label="이메일"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        icon="fa-solid fa-envelope"
        required
        error={errors.email}
        fullWidth
      />
      
      <Input
        label="비밀번호"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        icon="fa-solid fa-lock"
        required
        error={errors.password}
        fullWidth
      />
      
      <Button type="submit" variant="primary" fullWidth>
        로그인
      </Button>
    </form>
  );
}
```

---

## Select - 선택창

### 📦 Import

```tsx
import Select from "@/components/common/Select";
```

### 🔧 Props

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | 선택창 크기 |
| `fullWidth` | `boolean` | `false` | 전체 너비 사용 |
| `error` | `string` | - | 에러 메시지 |
| `helperText` | `string` | - | 도움말 텍스트 |
| `label` | `string` | - | 라벨 텍스트 |
| `required` | `boolean` | `false` | 필수 표시 (빨간 삼각형) |
| `options` | `SelectOption[]` | - | 선택 옵션 목록 |

### SelectOption 타입

```tsx
interface SelectOption {
  value: string;
  label: string;
}
```

### 💡 사용 예시

#### 1. 기본 사용

```tsx
<Select
  options={[
    { value: "1", label: "옵션 1" },
    { value: "2", label: "옵션 2" },
    { value: "3", label: "옵션 3" },
  ]}
/>
```

#### 2. 라벨 추가

```tsx
<Select
  label="학년 선택"
  options={[
    { value: "1", label: "1학년" },
    { value: "2", label: "2학년" },
    { value: "3", label: "3학년" },
  ]}
/>
```

#### 3. 필수 선택 (빨간 삼각형)

```tsx
<Select
  label="소속 부서"
  required
  options={[
    { value: "dev", label: "개발팀" },
    { value: "design", label: "디자인팀" },
    { value: "marketing", label: "마케팅팀" },
  ]}
/>
```

#### 4. 에러 표시

```tsx
const [grade, setGrade] = useState("");
const [error, setError] = useState("");

<Select
  label="학년"
  value={grade}
  onChange={(e) => {
    setGrade(e.target.value);
    if (!e.target.value) {
      setError("학년을 선택하세요.");
    } else {
      setError("");
    }
  }}
  options={[
    { value: "", label: "선택하세요" },
    { value: "1", label: "1학년" },
    { value: "2", label: "2학년" },
    { value: "3", label: "3학년" },
  ]}
  error={error}
/>
```

#### 5. 실제 사용 예시 (학생 등록 폼)

```tsx
function StudentForm() {
  const [formData, setFormData] = useState({
    name: "",
    grade: "",
    class: "",
  });
  const [errors, setErrors] = useState({
    name: "",
    grade: "",
    class: "",
  });

  const gradeOptions = [
    { value: "", label: "학년 선택" },
    { value: "1", label: "1학년" },
    { value: "2", label: "2학년" },
    { value: "3", label: "3학년" },
  ];

  const classOptions = [
    { value: "", label: "반 선택" },
    ...Array.from({ length: 10 }, (_, i) => ({
      value: (i + 1).toString(),
      label: `${i + 1}반`,
    })),
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors = {
      name: !formData.name ? "이름을 입력하세요." : "",
      grade: !formData.grade ? "학년을 선택하세요." : "",
      class: !formData.class ? "반을 선택하세요." : "",
    };
    
    setErrors(newErrors);
    
    if (!newErrors.name && !newErrors.grade && !newErrors.class) {
      console.log("제출:", formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "400px" }}>
      <Input
        label="이름"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
        error={errors.name}
        fullWidth
      />
      
      <Select
        label="학년"
        value={formData.grade}
        onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
        options={gradeOptions}
        required
        error={errors.grade}
        fullWidth
      />
      
      <Select
        label="반"
        value={formData.class}
        onChange={(e) => setFormData({ ...formData, class: e.target.value })}
        options={classOptions}
        required
        error={errors.class}
        fullWidth
      />
      
      <Button type="submit" variant="primary" fullWidth required>
        등록
      </Button>
    </form>
  );
}
```

---

## SemiTagButton - 세미태그 버튼

### 📋 개요

작은 크기의 태그 스타일 버튼으로, 관리 메뉴의 액션 버튼에 최적화되어 있습니다.

### 📦 Import

```tsx
import SemiTagButton from "@/components/common/SemiTagButton";
```

### 🔧 Props

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `variant` | `"primary" \| "success" \| "warning" \| "danger" \| "gray"` | `"primary"` | 버튼 스타일 |
| `size` | `"sm" \| "md"` | `"md"` | 버튼 크기 |
| `icon` | `string` | - | Font Awesome 아이콘 |
| `disabled` | `boolean` | `false` | 비활성화 |
| `children` | `ReactNode` | - | 버튼 텍스트 (선택사항) |

### 💡 사용 예시

#### 1. 기본 사용 (아이콘만)

```tsx
<SemiTagButton variant="primary" icon="fa-solid fa-key" />
```

#### 2. 다양한 Variant

```tsx
<SemiTagButton variant="primary" icon="fa-solid fa-key" />
<SemiTagButton variant="success" icon="fa-solid fa-play" />
<SemiTagButton variant="warning" icon="fa-solid fa-pause" />
<SemiTagButton variant="danger" icon="fa-solid fa-trash" />
<SemiTagButton variant="gray" icon="fa-solid fa-pen" />
```

#### 3. 텍스트 포함

```tsx
<SemiTagButton variant="primary" icon="fa-solid fa-save">
  저장
</SemiTagButton>
```

#### 4. 크기 변경

```tsx
<SemiTagButton size="sm" icon="fa-solid fa-check" />
<SemiTagButton size="md" icon="fa-solid fa-check" />
```

#### 5. 실제 사용 예시 (관리 버튼)

```tsx
<div style={{ display: "flex", gap: "6px" }}>
  <SemiTagButton
    variant="primary"
    size="sm"
    icon="fa-solid fa-key"
    onClick={() => handleAuth(device)}
    title="인가코드 발급"
  />
  <SemiTagButton
    variant="gray"
    size="sm"
    icon="fa-solid fa-pen"
    onClick={() => handleEdit(device)}
    title="수정"
  />
  <SemiTagButton
    variant="warning"
    size="sm"
    icon="fa-solid fa-pause"
    onClick={() => handleToggle(device)}
    title="비활성화"
  />
  <SemiTagButton
    variant="danger"
    size="sm"
    icon="fa-solid fa-trash"
    onClick={() => handleDelete(device)}
    title="삭제"
  />
</div>
```

### 🎨 인터랙션 효과

- **Hover/Focus**: Input과 동일한 효과
  - Border: Primary 색상
  - Box Shadow: 3px 파란 그림자
  - Transform: 1px 위로 이동

```tsx
<SemiTagButton icon="fa-solid fa-check">
  Hover 시 효과 발생
</SemiTagButton>
```

### 🎨 색상 가이드

| Variant | 배경색 | 텍스트/아이콘 색상 | 사용 예시 |
|---------|--------|-------------------|-----------|
| `primary` | 연한 파랑 | 파랑 | 주요 액션 |
| `success` | 연한 초록 | 초록 | 활성화, 완료 |
| `warning` | 연한 노랑 | 노랑 | 경고, 일시정지 |
| `danger` | 연한 빨강 | 빨강 | 삭제, 위험 |
| `gray` | 연한 회색 | 회색 | 보조 액션 |

---

## 🎨 스타일 가이드

### 색상 팔레트

- **Primary**: `#3182f6` - 주요 액션
- **Danger**: `#f04452` - 삭제, 경고
- **Success**: `#30b06e` - 완료, 성공
- **Gray**: `#45474a ~ #f3f5f7` - 보조, 비활성화

### 크기 가이드

| 크기 | 높이 | 패딩 | 사용 예시 |
|------|------|------|-----------|
| `sm` | 32px | 6px 12px | 좁은 공간, 인라인 버튼 |
| `md` | 40px | 10px 16px | 일반적인 사용 |
| `lg` | 48px | 12px 20px | 강조, 주요 액션 |

### 인터랙션 효과 ⭐ NEW

모든 공통 컴포넌트는 다음 인터랙션 효과를 제공합니다:

#### 1. Hover (마우스 올리기)
- **Border**: Primary 색상으로 변경
- **Box Shadow**: 부드러운 3px 그림자 효과
- **Transform**: 1px 위로 이동
- **Icon**: Primary 색상으로 변경 (Input/Select)

```tsx
// Hover 시 자동 적용
<Button>버튼</Button>  // 마우스 올리면 효과 발생
<Input />              // 마우스 올리면 효과 발생
<Select />             // 마우스 올리면 효과 발생
```

#### 2. Focus (클릭/포커스)
- **Border**: Primary 색상
- **Box Shadow**: 3px 파란 그림자
- **Transform**: 1px 위로 이동
- Input과 Select는 Hover와 동일한 효과

```tsx
<Input onFocus={() => console.log("포커스")} />
```

#### 3. Active (버튼 클릭 중) ⭐ NEW
- **Transform**: Scale 0.97 (살짝 축소)
- **Overlay**: 반투명 검은색 오버레이
- 클릭 중임을 명확하게 표시

```tsx
<Button onClick={handleClick}>
  클릭 시 축소 효과
</Button>
```

#### 4. Loading (로딩 중) ⭐ NEW
- **Spinner**: 회전하는 Font Awesome 아이콘
- **Text Opacity**: 0.7 (약간 흐려짐)
- **Disabled**: 버튼 비활성화
- **Duration**: 기본 1초 (커스터마이징 가능)

```tsx
// 자동 로딩
<Button autoLoading>
  클릭 시 1초간 로딩
</Button>

// 로딩 시간 변경
<Button autoLoading loadingDuration={2000}>
  클릭 시 2초간 로딩
</Button>

// 수동 로딩
const [loading, setLoading] = useState(false);
<Button loading={loading}>
  수동 제어
</Button>
```

#### 5. Error (에러 상태)
- **Border**: Red 색상
- **Box Shadow**: 빨간 그림자
- 시각적으로 오류 강조

```tsx
<Input error="필수 입력 항목입니다." />
```

### 애니메이션 타이밍

- **Transition**: `all 0.2s ease`
- **Transform Duration**: 200ms
- **Color Change**: 200ms

---

## ⚠️ 주의사항

1. **Font Awesome**: 아이콘을 사용하려면 Font Awesome이 설치되어 있어야 합니다.
2. **Required 표시**: `required` prop은 시각적 표시만 합니다. 실제 유효성 검사는 별도로 구현해야 합니다.
3. **Form 통합**: HTML form 요소와 함께 사용 시 `type="submit"` 속성을 추가하세요.
4. **접근성**: `label` prop을 사용하여 접근성을 향상시키세요.
5. **인터랙션 효과**: Hover와 Focus 효과가 자동으로 적용됩니다. 추가 설정이 필요 없습니다.
6. **자동 로딩**: `autoLoading`은 클릭 시 자동으로 로딩을 표시합니다. 수동 `loading` prop과 함께 사용하면 수동이 우선됩니다. ⭐ NEW

---

## 🔄 기존 코드 마이그레이션

### Before

```tsx
<button
  style={{
    padding: "10px 16px",
    background: "#3182f6",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  }}
  onClick={handleClick}
>
  저장
</button>
```

### After

```tsx
<Button variant="primary" onClick={handleClick}>
  저장
</Button>
```

---

Made with ❤️ by SAMSQUARE Team
