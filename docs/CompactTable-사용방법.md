# CompactTable 컴포넌트 사용 가이드

## 📋 개요

`CompactTable`은 컴팩트한 테이블 UI를 제공하는 재사용 가능한 컴포넌트입니다. 
출석 타임라인 표의 디자인을 기반으로 만들어졌습니다.

---

## 🎯 주요 특징

- ✅ 헤더 고정 (스크롤 시에도 보임)
- ✅ **헤더 구분선 고정 (스크롤 시에도 유지)** ⭐ NEW
- ✅ 컬럼 고정 기능 (Sticky)
- ✅ 행 선택 및 호버 효과
- ✅ 커스텀 렌더링 지원
- ✅ 반응형 레이아웃
- ✅ 빈 데이터 메시지

---

## 📦 설치 및 Import

```tsx
import CompactTable, { TableColumn, CompactTableProps } from "@/components/common/CompactTable";
```

---

## 🔧 Props 설명

### CompactTableProps

| Prop | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `columns` | `TableColumn[]` | ✅ | - | 테이블 컬럼 정의 |
| `data` | `any[]` | ✅ | - | 표시할 데이터 배열 |
| `keyExtractor` | `(row, index) => string` | ✅ | - | 각 행의 고유 키 생성 함수 |
| `emptyMessage` | `string` | ❌ | "데이터가 없습니다." | 빈 데이터 메시지 |
| `emptyIcon` | `string` | ❌ | "fa-solid fa-inbox" | 빈 데이터 아이콘 (Font Awesome) |
| `height` | `string` | ❌ | "auto" | 테이블 높이 |
| `rowHeight` | `string` | ❌ | "24px" | 행 높이 |
| `onRowClick` | `(row) => void` | ❌ | - | 행 클릭 이벤트 |
| `selectedRowKey` | `string` | ❌ | - | 선택된 행의 키 |
| `hoverable` | `boolean` | ❌ | `true` | 호버 효과 활성화 |

### TableColumn

| 속성 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `key` | `string` | ✅ | - | 데이터의 키 |
| `label` | `string` | ✅ | - | 컬럼 헤더 텍스트 |
| `width` | `string` | ❌ | - | 컬럼 너비 (예: "60px") |
| `align` | `"left" \| "center" \| "right"` | ❌ | `"center"` | 텍스트 정렬 |
| `sticky` | `boolean` | ❌ | `false` | 컬럼 고정 여부 |
| `stickyLeft` | `string` | ❌ | - | 고정 시 left 위치 (예: "60px") |
| `render` | `(value, row) => ReactNode` | ❌ | - | 커스텀 렌더링 함수 |
| `headerStyle` | `CSSProperties` | ❌ | - | 헤더 스타일 |
| `cellStyle` | `CSSProperties \| (row) => CSSProperties` | ❌ | - | 셀 스타일 |

---

## 💡 사용 예시

### 1. 기본 사용법

```tsx
import CompactTable, { TableColumn } from "@/components/common/CompactTable";

const columns: TableColumn[] = [
  { key: "id", label: "번호", width: "60px" },
  { key: "name", label: "이름", width: "120px", align: "left" },
  { key: "email", label: "이메일", align: "left" },
];

const data = [
  { id: 1, name: "홍길동", email: "hong@example.com" },
  { id: 2, name: "김철수", email: "kim@example.com" },
];

function MyComponent() {
  return (
    <CompactTable
      columns={columns}
      data={data}
      keyExtractor={(row) => row.id.toString()}
    />
  );
}
```

### 2. 컬럼 고정 (Sticky)

```tsx
const columns: TableColumn[] = [
  { 
    key: "name", 
    label: "이름", 
    width: "100px",
    sticky: true,
    stickyLeft: "0",
  },
  { 
    key: "grade", 
    label: "학년", 
    width: "50px",
    sticky: true,
    stickyLeft: "100px",
  },
  { key: "score", label: "점수", width: "60px" },
];
```

### 3. 커스텀 렌더링

```tsx
const columns: TableColumn[] = [
  { key: "name", label: "이름" },
  { 
    key: "status", 
    label: "상태",
    render: (value, row) => (
      <span style={{ 
        color: value === "active" ? "#30b06e" : "#f04452",
        fontWeight: "bold",
      }}>
        {value === "active" ? "활성" : "비활성"}
      </span>
    ),
  },
];
```

### 4. 행 클릭 이벤트

```tsx
const [selectedId, setSelectedId] = useState<string | null>(null);

<CompactTable
  columns={columns}
  data={data}
  keyExtractor={(row) => row.id.toString()}
  selectedRowKey={selectedId}
  onRowClick={(row) => {
    console.log("클릭된 행:", row);
    setSelectedId(row.id.toString());
  }}
/>
```

### 5. 조건부 스타일링

```tsx
const columns: TableColumn[] = [
  { 
    key: "score", 
    label: "점수",
    cellStyle: (row) => ({
      color: row.score >= 90 ? "#30b06e" : 
             row.score >= 60 ? "#3182f6" : "#f04452",
      fontWeight: "bold",
    }),
  },
];
```

### 6. 학생 목록 예시 (실제 사용)

```tsx
import CompactTable, { TableColumn } from "@/components/common/CompactTable";

interface Student {
  id: string;
  grade: number;
  class: number;
  fingerprintId: number;
  name: string;
}

const columns: TableColumn[] = [
  { 
    key: "grade", 
    label: "학년", 
    width: "50px",
    sticky: true,
    stickyLeft: "0",
  },
  { 
    key: "class", 
    label: "반", 
    width: "50px",
    sticky: true,
    stickyLeft: "50px",
  },
  { 
    key: "fingerprintId", 
    label: "번호", 
    width: "60px",
    sticky: true,
    stickyLeft: "100px",
  },
  { 
    key: "name", 
    label: "이름", 
    align: "left",
  },
];

function StudentList() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div style={{ height: "400px" }}>
      <CompactTable
        columns={columns}
        data={students}
        keyExtractor={(row) => row.id}
        selectedRowKey={selectedId}
        onRowClick={(student) => setSelectedId(student.id)}
        emptyMessage="등록된 학생이 없습니다."
        emptyIcon="fa-solid fa-user-slash"
        height="100%"
      />
    </div>
  );
}
```

### 7. 날짜 포맷팅 예시

```tsx
const columns: TableColumn[] = [
  { key: "name", label: "이름" },
  { 
    key: "createdAt", 
    label: "등록일",
    render: (value) => {
      const date = new Date(value);
      return date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    },
  },
];
```

---

## 🎨 스타일 커스터마이징

### 헤더 스타일 변경

```tsx
const columns: TableColumn[] = [
  { 
    key: "score", 
    label: "점수",
    headerStyle: {
      backgroundColor: "#e8f3ff",
      color: "#3182f6",
      fontWeight: "700",
    },
  },
];
```

### 셀 배경색 변경

```tsx
const columns: TableColumn[] = [
  { 
    key: "status", 
    label: "상태",
    cellStyle: (row) => ({
      backgroundColor: row.status === "active" 
        ? "#e6f7ed" 
        : "#fee2e2",
    }),
  },
];
```

---

## ⚠️ 주의사항

1. **keyExtractor는 반드시 고유한 값을 반환**해야 합니다.
2. **sticky 컬럼의 stickyLeft 값은 누적 계산**이 필요합니다.
   - 첫 번째 컬럼: `"0"`
   - 두 번째 컬럼: `"첫번째_width"`
   - 세 번째 컬럼: `"첫번째_width + 두번째_width"`
3. **height를 지정**하면 스크롤이 활성화됩니다.
4. **Font Awesome 아이콘**을 사용하려면 프로젝트에 Font Awesome이 설치되어 있어야 합니다.
5. **테이블은 `borderCollapse: "separate"`를 사용**하여 스크롤 시에도 구분선이 유지됩니다. ⭐ NEW

---

## 🔄 기존 코드 마이그레이션

### Before (기존 코드)

```tsx
<table style={{ width: "100%", borderCollapse: "collapse" }}>
  <thead>
    <tr>
      <th>이름</th>
      <th>학년</th>
    </tr>
  </thead>
  <tbody>
    {data.map(item => (
      <tr key={item.id}>
        <td>{item.name}</td>
        <td>{item.grade}</td>
      </tr>
    ))}
  </tbody>
</table>
```

### After (CompactTable 사용)

```tsx
<CompactTable
  columns={[
    { key: "name", label: "이름" },
    { key: "grade", label: "학년" },
  ]}
  data={data}
  keyExtractor={(row) => row.id.toString()}
/>
```

---

## 📚 추가 리소스

- TypeScript 타입 정의: `c:\gradprj\sam\src\components\common\CompactTable.tsx`
- 출석 타임라인 컴포넌트 참고: `c:\gradprj\sam\src\components\AttendanceViewer.tsx`

---

## 🐛 문제 해결

### Q1. 컬럼이 고정되지 않아요

A: `sticky: true`와 함께 `stickyLeft` 값을 정확히 설정했는지 확인하세요.

### Q2. 행 호버 효과가 작동하지 않아요

A: `hoverable={true}`가 설정되어 있는지 확인하세요.

### Q3. 스크롤이 생기지 않아요

A: 부모 컨테이너에 `height` 속성을 설정하세요.

```tsx
<div style={{ height: "400px" }}>
  <CompactTable ... />
</div>
```

### Q4. 헤더 아래 구분선이 스크롤 시 사라져요 ⭐ NEW

A: 컴포넌트는 이미 `borderCollapse: "separate"`와 `borderSpacing: 0`을 사용하여 
스크롤 시에도 구분선이 유지되도록 구현되어 있습니다. 추가 설정이 필요 없습니다.

---

Made with ❤️ by SAMSQUARE Team
