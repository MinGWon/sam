import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import styles from "@/styles/Home.module.css";
import DeviceManagement from "@/components/DeviceManagement";
import StudentManagement from "@/components/StudentManagement";
import AttendanceViewer from "@/components/AttendanceViewer";
import RealtimeStudyStatus from "@/components/RealtimeStudyStatus";
import { useTabStore } from "@/store/tabStore";
import { TableSkeleton, CardSkeleton, SpinnerLoader } from "@/components/LoadingSkeleton";

// 토스 스타일 색상 팔레트
const colors = {
  primary: "#3182f6",
  primaryLight: "#e8f3ff",
  primaryDark: "#1b64da",
  background: "#f7f8fa",
  white: "#ffffff",
  gray50: "#fafbfc",
  gray100: "#f3f5f7",
  gray200: "#eaecef",
  gray300: "#d5d8dc",
  gray400: "#b5b9be",
  gray500: "#8b8f94",
  gray600: "#6b6e72",
  gray700: "#45474a",
  gray800: "#2d2f31",
  gray900: "#1a1b1d",
  red: "#f04452",
  green: "#30b06e",
};

interface UserInfo {
  sub?: string;
  name?: string;
  email?: string;
  visibleId?: string;
}

interface MenuItemData {
  id: string;
  label: string;
}

interface SubMenuData {
  id: string;
  label: string;
  items: MenuItemData[];
}

interface MenuData {
  id: string;
  label: string;
  icon: string;
  subMenus: SubMenuData[];
}

interface Tab {
  id: string;
  label: string;
  menuId: string;
  subMenuId: string;
  path: {
    menu: string;
    subMenu: string;
    item: string;
  };
}

function MenuEditForm({ initialIcon, initialLabel, onSave, onCancel }: { initialIcon: string; initialLabel: string; onSave: (data: { icon: string; label: string }) => void; onCancel: () => void }) {
  const [icon, setIcon] = useState(initialIcon);
  const [label, setLabel] = useState(initialLabel);
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center", flex: 1 }}>
      <input type="text" value={icon} onChange={(e) => setIcon(e.target.value)} style={{ width: "60px", padding: "10px 12px", border: `1px solid ${colors.gray200}`, borderRadius: "10px", fontSize: "14px", outline: "none", transition: "border-color 0.2s" }} onFocus={(e) => e.target.style.borderColor = colors.primary} onBlur={(e) => e.target.style.borderColor = colors.gray200} />
      <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} style={{ flex: 1, padding: "10px 12px", border: `1px solid ${colors.gray200}`, borderRadius: "10px", fontSize: "14px", outline: "none", transition: "border-color 0.2s" }} onFocus={(e) => e.target.style.borderColor = colors.primary} onBlur={(e) => e.target.style.borderColor = colors.gray200} />
      <button onClick={() => onSave({ icon, label })} style={{ padding: "10px 16px", background: colors.primary, color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}>저장</button>
      <button onClick={onCancel} style={{ padding: "10px 16px", background: colors.gray100, color: colors.gray700, border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}>취소</button>
    </div>
  );
}

function LabelEditForm({ initialLabel, onSave, onCancel }: { initialLabel: string; onSave: (label: string) => void; onCancel: () => void }) {
  const [label, setLabel] = useState(initialLabel);
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center", flex: 1 }}>
      <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} style={{ flex: 1, padding: "10px 12px", border: `1px solid ${colors.gray200}`, borderRadius: "10px", fontSize: "14px", outline: "none", transition: "border-color 0.2s" }} onFocus={(e) => e.target.style.borderColor = colors.primary} onBlur={(e) => e.target.style.borderColor = colors.gray200} />
      <button onClick={() => onSave(label)} style={{ padding: "10px 16px", background: colors.primary, color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}>저장</button>
      <button onClick={onCancel} style={{ padding: "10px 16px", background: colors.gray100, color: colors.gray700, border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}>취소</button>
    </div>
  );
}

function MenuManagement({ onMenuUpdate }: { onMenuUpdate: () => void }) {
  const [menus, setMenus] = useState<MenuData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMenu, setEditingMenu] = useState<string | null>(null);
  const [editingSubMenu, setEditingSubMenu] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newMenuForm, setNewMenuForm] = useState({ label: "", icon: "" });
  const [newSubMenuForm, setNewSubMenuForm] = useState({ label: "", menuId: "" });
  const [newItemForm, setNewItemForm] = useState({ label: "", subMenuId: "" });
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showAddSubMenu, setShowAddSubMenu] = useState<string | null>(null);
  const [showAddItem, setShowAddItem] = useState<string | null>(null);
  
  // 드래그 상태
  const [draggedItem, setDraggedItem] = useState<{ type: string; id: string; parentId?: string } | null>(null);
  const [dragOverItem, setDragOverItem] = useState<{ type: string; id: string; parentId?: string } | null>(null);
  
  // 자동 스크롤을 위한 ref
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMenus = async () => {
    try {
      const res = await fetch("/api/menu/all");
      if (res.ok) {
        const data = await res.json();
        setMenus(data.menus);
      }
    } catch (e) {
      console.error("Failed to fetch menus:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  const handleAddMenu = async () => {
    if (!newMenuForm.label || !newMenuForm.icon) return;
    try {
      const res = await fetch("/api/menu/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "menu", ...newMenuForm }),
      });
      if (res.ok) {
        setNewMenuForm({ label: "", icon: "" });
        setShowAddMenu(false);
        fetchMenus();
        onMenuUpdate();
      }
    } catch (e) {
      console.error("Failed to add menu:", e);
    }
  };

  const handleAddSubMenu = async (menuId: string) => {
    if (!newSubMenuForm.label) return;
    try {
      const res = await fetch("/api/menu/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "submenu", label: newSubMenuForm.label, menuId }),
      });
      if (res.ok) {
        setNewSubMenuForm({ label: "", menuId: "" });
        setShowAddSubMenu(null);
        fetchMenus();
        onMenuUpdate();
      }
    } catch (e) {
      console.error("Failed to add submenu:", e);
    }
  };

  const handleAddItem = async (subMenuId: string) => {
    if (!newItemForm.label) return;
    try {
      const res = await fetch("/api/menu/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "item", label: newItemForm.label, subMenuId }),
      });
      if (res.ok) {
        setNewItemForm({ label: "", subMenuId: "" });
        setShowAddItem(null);
        fetchMenus();
        onMenuUpdate();
      }
    } catch (e) {
      console.error("Failed to add item:", e);
    }
  };

  const handleDelete = async (type: string, id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const res = await fetch("/api/menu/manage", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      });
      if (res.ok) {
        fetchMenus();
        onMenuUpdate();
      }
    } catch (e) {
      console.error("Failed to delete:", e);
    }
  };

  const handleUpdate = async (type: string, id: string, data: any) => {
    try {
      const res = await fetch("/api/menu/manage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, ...data }),
      });
      if (res.ok) {
        setEditingMenu(null);
        setEditingSubMenu(null);
        setEditingItem(null);
        fetchMenus();
        onMenuUpdate();
      }
    } catch (e) {
      console.error("Failed to update:", e);
    }
  };

  const handleDragStart = (e: React.DragEvent, type: string, id: string, parentId?: string) => {
    setDraggedItem({ type, id, parentId });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, type: string, id: string, parentId?: string) => {
    e.preventDefault();
    
    // 자동 스크롤 처리
    const scrollThreshold = 80; // 상단/하단 80px 영역
    const scrollSpeed = 10; // 스크롤 속도
    const clientY = e.clientY;
    const windowHeight = window.innerHeight;
    
    // 스크롤 가능한 컨테이너 찾기
    const scrollContainer = (e.currentTarget as HTMLElement).closest('[style*="overflowY"]') as HTMLElement;
    
    if (scrollContainer) {
      const rect = scrollContainer.getBoundingClientRect();
      const relativeY = clientY - rect.top;
      
      // 기존 인터벌 제거
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
      
      // 상단 근처에서 위로 스크롤
      if (relativeY < scrollThreshold && scrollContainer.scrollTop > 0) {
        scrollIntervalRef.current = setInterval(() => {
          if (scrollContainer.scrollTop > 0) {
            scrollContainer.scrollTop -= scrollSpeed;
          } else {
            if (scrollIntervalRef.current) {
              clearInterval(scrollIntervalRef.current);
              scrollIntervalRef.current = null;
            }
          }
        }, 16); // ~60fps
      }
      // 하단 근처에서 아래로 스크롤
      else if (relativeY > rect.height - scrollThreshold && 
               scrollContainer.scrollTop < scrollContainer.scrollHeight - scrollContainer.clientHeight) {
        scrollIntervalRef.current = setInterval(() => {
          if (scrollContainer.scrollTop < scrollContainer.scrollHeight - scrollContainer.clientHeight) {
            scrollContainer.scrollTop += scrollSpeed;
          } else {
            if (scrollIntervalRef.current) {
              clearInterval(scrollIntervalRef.current);
              scrollIntervalRef.current = null;
            }
          }
        }, 16); // ~60fps
      }
    }
    
    if (draggedItem && draggedItem.type === type && draggedItem.id !== id) {
      // 같은 부모 내에서만 이동 가능
      if (type === "submenu" && draggedItem.parentId !== parentId) return;
      if (type === "item" && draggedItem.parentId !== parentId) return;
      setDragOverItem({ type, id, parentId });
    }
  };

  const handleDragLeave = () => {
    // 스크롤 인터벌 정리
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
    setDragOverItem(null);
  };

  const handleDrop = async (e: React.DragEvent, type: string, targetId: string, parentId?: string) => {
    e.preventDefault();
    
    // 스크롤 인터벌 정리
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
    
    if (!draggedItem || draggedItem.type !== type || draggedItem.id === targetId) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    // 같은 부모 내에서만 이동
    if ((type === "submenu" || type === "item") && draggedItem.parentId !== parentId) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    try {
      const res = await fetch("/api/menu/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          sourceId: draggedItem.id,
          targetId,
          parentId,
        }),
      });
      if (res.ok) {
        fetchMenus();
        onMenuUpdate();
      }
    } catch (e) {
      console.error("Failed to reorder:", e);
    }

    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragEnd = () => {
    // 스크롤 인터벌 정리
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
    setDraggedItem(null);
    setDragOverItem(null);
  };
  
  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, []);

  const buttonStyle = {
    padding: "8px 14px",
    background: "transparent",
    border: `1px solid ${colors.gray200}`,
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500" as const,
    color: colors.gray600,
    transition: "all 0.2s",
  };

  if (loading) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px" }}>
      <div style={{ color: colors.gray500 }}>로딩 중...</div>
    </div>;
  }

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <button
          onClick={() => setShowAddMenu(true)}
          style={{
            padding: "12px 20px",
            background: colors.primary,
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            boxShadow: "0 2px 8px rgba(49, 130, 246, 0.3)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
        >
          + 대메뉴 추가
        </button>
      </div>

      {showAddMenu && (
        <div style={{ marginBottom: "24px", padding: "20px", background: colors.white, borderRadius: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
          <h4 style={{ margin: "0 0 16px 0", fontSize: "15px", fontWeight: "600", color: colors.gray800 }}>새 대메뉴 추가</h4>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <input
              type="text"
              placeholder="아이콘 (이모지)"
              value={newMenuForm.icon}
              onChange={(e) => setNewMenuForm({ ...newMenuForm, icon: e.target.value })}
              style={{ width: "100px", padding: "12px 14px", border: `1px solid ${colors.gray200}`, borderRadius: "10px", fontSize: "14px", outline: "none" }}
            />
            <input
              type="text"
              placeholder="메뉴명"
              value={newMenuForm.label}
              onChange={(e) => setNewMenuForm({ ...newMenuForm, label: e.target.value })}
              style={{ flex: 1, padding: "12px 14px", border: `1px solid ${colors.gray200}`, borderRadius: "10px", fontSize: "14px", outline: "none" }}
            />
            <button onClick={handleAddMenu} style={{ padding: "12px 20px", background: colors.primary, color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600" }}>추가</button>
            <button onClick={() => setShowAddMenu(false)} style={{ padding: "12px 20px", background: colors.gray100, color: colors.gray700, border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600" }}>취소</button>
          </div>
        </div>
      )}

      {menus.map((menu) => (
        <div
          key={menu.id}
          style={{
            marginBottom: "16px",
            background: colors.white,
            borderRadius: "16px",
            boxShadow: dragOverItem?.type === "menu" && dragOverItem.id === menu.id
              ? `0 0 0 2px ${colors.primary}`
              : "0 2px 12px rgba(0,0,0,0.06)",
            overflow: "hidden",
            opacity: draggedItem?.type === "menu" && draggedItem.id === menu.id ? 0.5 : 1,
            transition: "all 0.2s",
          }}
        >
          <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${colors.gray100}` }}>
            {/* 드래그 핸들 - 이 부분만 드래그 가능 */}
            <span
              draggable={!editingMenu}
              onDragStart={(e) => handleDragStart(e, "menu", menu.id)}
              onDragOver={(e) => handleDragOver(e, "menu", menu.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, "menu", menu.id)}
              onDragEnd={handleDragEnd}
              style={{ marginRight: "12px", cursor: "grab", color: colors.gray400, padding: "4px", fontSize: "16px" }}
            >
              ⋮⋮
            </span>
            {editingMenu === menu.id ? (
              <MenuEditForm
                initialIcon={menu.icon}
                initialLabel={menu.label}
                onSave={(data) => handleUpdate("menu", menu.id, data)}
                onCancel={() => setEditingMenu(null)}
              />
            ) : (
              <>
                <span style={{ fontWeight: "700", flex: 1, fontSize: "15px", color: colors.gray900 }}>{menu.icon} {menu.label}</span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => setEditingMenu(menu.id)} style={buttonStyle}>수정</button>
                  <button onClick={() => handleDelete("menu", menu.id)} style={{ ...buttonStyle, color: colors.red }}>삭제</button>
                  <button onClick={() => setShowAddSubMenu(menu.id)} style={{ ...buttonStyle, color: colors.primary, borderColor: colors.primary }}>+ 중메뉴</button>
                </div>
              </>
            )}
          </div>

          {showAddSubMenu === menu.id && (
            <div style={{ padding: "16px 20px", background: colors.gray50, borderBottom: `1px solid ${colors.gray100}` }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="중메뉴명"
                  value={newSubMenuForm.label}
                  onChange={(e) => setNewSubMenuForm({ ...newSubMenuForm, label: e.target.value })}
                  style={{ flex: 1, padding: "12px 14px", border: `1px solid ${colors.gray200}`, borderRadius: "10px", fontSize: "14px", outline: "none", background: colors.white }}
                />
                <button onClick={() => handleAddSubMenu(menu.id)} style={{ padding: "12px 20px", background: colors.primary, color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600" }}>추가</button>
                <button onClick={() => setShowAddSubMenu(null)} style={{ padding: "12px 20px", background: colors.gray200, color: colors.gray700, border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600" }}>취소</button>
              </div>
            </div>
          )}

          {menu.subMenus.map((subMenu) => (
            <div
              key={subMenu.id}
              style={{
                borderTop: `1px solid ${colors.gray100}`,
                background: dragOverItem?.type === "submenu" && dragOverItem.id === subMenu.id ? colors.primaryLight : "transparent",
                opacity: draggedItem?.type === "submenu" && draggedItem.id === subMenu.id ? 0.5 : 1,
              }}
            >
              <div style={{ padding: "14px 20px 14px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                {/* 드래그 핸들 - 이 부분만 드래그 가능 */}
                <span
                  draggable={!editingSubMenu}
                  onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, "submenu", subMenu.id, menu.id); }}
                  onDragOver={(e) => { e.stopPropagation(); handleDragOver(e, "submenu", subMenu.id, menu.id); }}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => { e.stopPropagation(); handleDrop(e, "submenu", subMenu.id, menu.id); }}
                  onDragEnd={handleDragEnd}
                  style={{ marginRight: "12px", cursor: "grab", color: colors.gray300, padding: "4px" }}
                >
                  ⋮⋮
                </span>
                {editingSubMenu === subMenu.id ? (
                  <LabelEditForm
                    initialLabel={subMenu.label}
                    onSave={(label) => handleUpdate("submenu", subMenu.id, { label })}
                    onCancel={() => setEditingSubMenu(null)}
                  />
                ) : (
                  <>
                    <span style={{ fontWeight: "600", color: colors.gray700, flex: 1, fontSize: "14px" }}>📁 {subMenu.label}</span>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => setEditingSubMenu(subMenu.id)} style={{ ...buttonStyle, padding: "6px 12px", fontSize: "12px" }}>수정</button>
                      <button onClick={() => handleDelete("submenu", subMenu.id)} style={{ ...buttonStyle, padding: "6px 12px", fontSize: "12px", color: colors.red }}>삭제</button>
                      <button onClick={() => setShowAddItem(subMenu.id)} style={{ ...buttonStyle, padding: "6px 12px", fontSize: "12px", color: colors.primary }}>+ 소메뉴</button>
                    </div>
                  </>
                )}
              </div>

              {showAddItem === subMenu.id && (
                <div style={{ padding: "12px 20px 12px 56px", background: colors.gray50 }}>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <input
                      type="text"
                      placeholder="소메뉴명"
                      value={newItemForm.label}
                      onChange={(e) => setNewItemForm({ ...newItemForm, label: e.target.value })}
                      style={{ flex: 1, padding: "10px 14px", border: `1px solid ${colors.gray200}`, borderRadius: "10px", fontSize: "14px", outline: "none", background: colors.white }}
                    />
                    <button onClick={() => handleAddItem(subMenu.id)} style={{ padding: "10px 16px", background: colors.primary, color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>추가</button>
                    <button onClick={() => setShowAddItem(null)} style={{ padding: "10px 16px", background: colors.gray200, color: colors.gray700, border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>취소</button>
                  </div>
                </div>
              )}

              {subMenu.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "12px 20px 12px 56px",
                    background: dragOverItem?.type === "item" && dragOverItem.id === item.id ? colors.primaryLight : colors.gray50,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderTop: `1px solid ${colors.gray100}`,
                    opacity: draggedItem?.type === "item" && draggedItem.id === item.id ? 0.5 : 1,
                  }}
                >
                  {/* 드래그 핸들 - 이 부분만 드래그 가능 */}
                  <span
                    draggable={!editingItem}
                    onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, "item", item.id, subMenu.id); }}
                    onDragOver={(e) => { e.stopPropagation(); handleDragOver(e, "item", item.id, subMenu.id); }}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => { e.stopPropagation(); handleDrop(e, "item", item.id, subMenu.id); }}
                    onDragEnd={handleDragEnd}
                    style={{ marginRight: "12px", cursor: "grab", color: colors.gray300, padding: "4px" }}
                  >
                    ⋮⋮
                  </span>
                  {editingItem === item.id ? (
                    <LabelEditForm
                      initialLabel={item.label}
                      onSave={(label) => handleUpdate("item", item.id, { label })}
                      onCancel={() => setEditingItem(null)}
                    />
                  ) : (
                    <>
                      <span style={{ color: colors.gray600, fontSize: "13px", flex: 1 }}>📄 {item.label}</span>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={() => setEditingItem(item.id)} style={{ ...buttonStyle, padding: "6px 12px", fontSize: "12px" }}>수정</button>
                        <button onClick={() => handleDelete("item", item.id)} style={{ ...buttonStyle, padding: "6px 12px", fontSize: "12px", color: colors.red }}>삭제</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [menus, setMenus] = useState<MenuData[]>([]);
  const [activeMenu, setActiveMenu] = useState<string>("");
  const [expandedSubMenus, setExpandedSubMenus] = useState<string[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { removeTabState } = useTabStore();
  const [isTabLoading, setIsTabLoading] = useState(false);
  
  // 대메뉴 스크롤 관련 state
  const [menuScrollIndex, setMenuScrollIndex] = useState(0);
  const MAX_VISIBLE_MENUS = 7; // 화살표 2개 포함하면 총 9개

  // 스크롤 상태 체크
  const checkScrollButtons = () => {
    const container = tabContainerRef.current;
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.scrollWidth - 1
      );
    }
  };

  useEffect(() => {
    checkScrollButtons();
  }, [tabs]);

  const scrollTabs = (direction: "left" | "right") => {
    const container = tabContainerRef.current;
    if (container) {
      const scrollAmount = 200;
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkScrollButtons, 300);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        // 인증 체크
        const authRes = await fetch("/api/auth/me");
        if (!authRes.ok) {
          router.push("/");
          return;
        }
        const authData = await authRes.json();
        setUser(authData.user);

        // 메뉴 불러오기
        const menuRes = await fetch("/api/menu");
        if (menuRes.ok) {
          const menuData = await menuRes.json();
          setMenus(menuData.menus);
          
          // 초기 메뉴 설정
          if (menuData.menus.length > 0) {
            const firstMenu = menuData.menus[0];
            setActiveMenu(firstMenu.id);
            
            if (firstMenu.subMenus.length > 0) {
              const firstSubMenu = firstMenu.subMenus[0];
              setExpandedSubMenus([firstSubMenu.id]);
              
              if (firstSubMenu.items.length > 0) {
                const firstItem = firstSubMenu.items[0];
                const initialTab: Tab = {
                  id: firstItem.id,
                  label: firstItem.label,
                  menuId: firstMenu.id,
                  subMenuId: firstSubMenu.id,
                  path: {
                    menu: firstMenu.label,
                    subMenu: firstSubMenu.label,
                    item: firstItem.label,
                  },
                };
                setTabs([initialTab]);
                setActiveTab(firstItem.id);
              }
            }
          }
        }
      } catch (e) {
        console.error("Init failed:", e);
        router.push("/");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  const openLogoutModal = () => {
    setShowLogoutModal(true);
  };

  const closeLogoutModal = () => {
    setShowLogoutModal(false);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    handleLogout();
  };

  const handleMenuClick = (menuId: string) => {
    setActiveMenu(menuId);
  };

  const toggleSubMenu = (subMenuId: string) => {
    setExpandedSubMenus((prev) =>
      prev.includes(subMenuId)
        ? prev.filter((id) => id !== subMenuId)
        : [...prev, subMenuId]
    );
  };

  const handleItemClick = (item: MenuItemData, subMenu: SubMenuData) => {
    const currentMenu = menus.find((m) => m.id === activeMenu);
    if (!currentMenu) return;

    const existingTab = tabs.find((tab) => tab.id === item.id);
    
    // 기존 탭이든 새 탭이든 로딩 표시
    setIsTabLoading(true);
    
    if (existingTab) {
      setTabs((prev) => [
        existingTab,
        ...prev.filter((tab) => tab.id !== item.id),
      ]);
      setActiveTab(item.id);
    } else {
      const newTab: Tab = {
        id: item.id,
        label: item.label,
        menuId: activeMenu,
        subMenuId: subMenu.id,
        path: {
          menu: currentMenu.label,
          subMenu: subMenu.label,
          item: item.label,
        },
      };
      setTabs((prev) => [newTab, ...prev]);
      setActiveTab(item.id);
    }
    
    // 상태 복원 시간 확보 (100ms로 단축)
    setTimeout(() => setIsTabLoading(false), 200);
  };

  // 탭 클릭으로 전환 시에도 로딩 표시
  const handleTabClick = (tabId: string) => {
    if (activeTab !== tabId) {
      setIsTabLoading(true);
      setActiveTab(tabId);
      setTimeout(() => setIsTabLoading(false), 200);
    }
  };

  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = tabs.filter((tab) => tab.id !== tabId);
    setTabs(newTabs);
    
    // Zustand에서 해당 탭의 상태 제거
    removeTabState(tabId);
    
    if (activeTab === tabId && newTabs.length > 0) {
      // 닫힌 탭이 활성 탭이면 첫 번째 탭을 활성화
      setActiveTab(newTabs[0].id);
    }
  };

  const currentMenu = menus.find((m) => m.id === activeMenu);
  const currentTab = tabs.find((t) => t.id === activeTab);

  const refreshMenus = async () => {
    const menuRes = await fetch("/api/menu");
    if (menuRes.ok) {
      const menuData = await menuRes.json();
      setMenus(menuData.menus);
    }
  };

  const scrollMenuUp = () => {
    setMenuScrollIndex(prev => Math.max(0, prev - MAX_VISIBLE_MENUS));
  };

  const scrollMenuDown = () => {
    const maxIndex = Math.max(0, menus.length - MAX_VISIBLE_MENUS);
    setMenuScrollIndex(prev => Math.min(maxIndex, prev + MAX_VISIBLE_MENUS));
  };

  const getVisibleMenus = () => {
    if (menus.length <= MAX_VISIBLE_MENUS) {
      return menus;
    }
    return menus.slice(menuScrollIndex, menuScrollIndex + MAX_VISIBLE_MENUS);
  };

  const canScrollUp = menuScrollIndex > 0;
  const canScrollDown = menus.length > MAX_VISIBLE_MENUS && menuScrollIndex + MAX_VISIBLE_MENUS < menus.length;

  if (loading) {
    return (
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        height: "100vh",
        background: colors.background,
        color: colors.gray600,
        fontSize: "15px",
      }}>
        로딩 중...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>대시보드 - SAMSQUARE</title>
        <meta name="description" content="SAMSQUARE 대시보드" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link href="https://cdn.jsdelivr.net/gh/toss/tossface/dist/tossface.css" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </Head>
      <style jsx global>{`
        * {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: ${colors.gray300};
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${colors.gray400};
        }
      `}</style>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: colors.background }}>
        {/* 사이드바 - 대메뉴 */}
        <aside
          style={{
            width: "72px",
            background: colors.white,
            borderRight: `1px solid ${colors.gray200}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: "8px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
              overflow: "hidden",
            }}
          >
            <img 
              src="/logo.png" 
              alt="SAMSQUARE Logo" 
              style={{ 
                width: "100%", 
                height: "100%", 
                objectFit: "contain" 
              }} 
            />
          </div>
          
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "4px", width: "100%", padding: "0 8px" }}>
            {/* 위로 스크롤 버튼 */}
            {canScrollUp && (
              <button
                onClick={scrollMenuUp}
                style={{
                  width: "100%",
                  height: "56px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: "none",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = colors.gray100}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <i 
                  className="fa-solid fa-chevron-up" 
                  style={{ 
                    fontSize: "18px", 
                    color: colors.gray500,
                  }}
                />
              </button>
            )}
            
            {/* 대메뉴 목록 */}
            {getVisibleMenus().map((menu) => (
              <button
                key={menu.id}
                onClick={() => handleMenuClick(menu.id)}
                style={{
                  width: "100%",
                  height: "56px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: activeMenu === menu.id ? colors.primaryLight : "transparent",
                  border: "none",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  if (activeMenu !== menu.id) {
                    e.currentTarget.style.background = colors.gray100;
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeMenu !== menu.id) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <i 
                  className={menu.icon} 
                  style={{ 
                    fontSize: "18px", 
                    color: activeMenu === menu.id ? colors.primary : colors.gray500,
                  }}
                />
                <span
                  style={{
                    fontSize: "10px",
                    color: activeMenu === menu.id ? colors.primary : colors.gray500,
                    marginTop: "4px",
                    fontWeight: activeMenu === menu.id ? "600" : "500",
                  }}
                >
                  {menu.label}
                </span>
              </button>
            ))}
            
            {/* 아래로 스크롤 버튼 */}
            {canScrollDown && (
              <button
                onClick={scrollMenuDown}
                style={{
                  width: "100%",
                  height: "56px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: "none",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = colors.gray100}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <i 
                  className="fa-solid fa-chevron-down" 
                  style={{ 
                    fontSize: "18px", 
                    color: colors.gray500,
                  }}
                />
              </button>
            )}
          </div>
          
          <div style={{ padding: "16px 8px" }}>
            <button
              onClick={openLogoutModal}
              style={{
                width: "56px",
                height: "56px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = colors.gray100}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <i className="fa-solid fa-right-from-bracket" style={{ fontSize: "16px", color: colors.gray500 }} />
              <span style={{ fontSize: "10px", color: colors.gray500, marginTop: "4px" }}>
                로그아웃
              </span>
            </button>
          </div>
        </aside>

        {/* 중메뉴/소메뉴 패널 */}
        <aside
          style={{
            width: "220px",
            background: colors.white,
            borderRight: `1px solid ${colors.gray200}`,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* 고정된 헤더 */}
          <div
            style={{
              height: "56px",
              padding: "0 16px",
              borderBottom: `1px solid ${colors.gray100}`,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
            }}
          >
            <h2 style={{ 
              margin: 0, 
              fontSize: "16px", 
              fontWeight: "700", 
              color: colors.gray900,
            }}>
              {currentMenu?.label || "메뉴"}
            </h2>
          </div>
          
          {/* 스크롤 가능한 중메뉴 영역 */}
          <nav style={{ 
            padding: "8px", 
            flex: 1,
            overflowY: "auto",
            minHeight: 0,
          }}>
            {currentMenu?.subMenus.map((subMenu) => (
              <div key={subMenu.id} style={{ marginBottom: "2px" }}>
                <button
                  onClick={() => toggleSubMenu(subMenu.id)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: expandedSubMenus.includes(subMenu.id) ? colors.gray50 : "transparent",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "600",
                    color: colors.gray800,
                    textAlign: "left",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!expandedSubMenus.includes(subMenu.id)) {
                      e.currentTarget.style.background = colors.gray50;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!expandedSubMenus.includes(subMenu.id)) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <span>{subMenu.label}</span>
                  <i 
                    className="fa-solid fa-chevron-down"
                    style={{
                      fontSize: "10px",
                      color: colors.gray400,
                      transform: expandedSubMenus.includes(subMenu.id) ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                    }}
                  />
                </button>
                {expandedSubMenus.includes(subMenu.id) && (
                  <div style={{ marginTop: "2px", paddingLeft: "8px" }}>
                    {subMenu.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item, subMenu)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          background: activeTab === item.id ? colors.primaryLight : "transparent",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "13px",
                          color: activeTab === item.id ? colors.primary : colors.gray600,
                          fontWeight: activeTab === item.id ? "600" : "400",
                          textAlign: "left",
                          marginBottom: "1px",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          if (activeTab !== item.id) {
                            e.currentTarget.style.background = colors.gray50;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (activeTab !== item.id) {
                            e.currentTarget.style.background = "transparent";
                          }
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* 메인 컨텐츠 영역 */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: colors.background }}>
          {/* 헤더 */}
          <header
            style={{
              height: "56px",
              background: colors.white,
              borderBottom: `1px solid ${colors.gray200}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 20px",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "15px", fontWeight: "700", color: colors.gray900 }}>SAMSQUARE</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px",
                background: colors.gray50,
                borderRadius: "20px",
              }}>
                <div style={{
                  width: "28px",
                  height: "28px",
                  background: colors.primary,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: "600",
                }}>
                  {(user.name || "U")[0]}
                </div>
                <span style={{ fontSize: "13px", fontWeight: "500", color: colors.gray700 }}>
                  {user.name || user.sub}
                </span>
              </div>
            </div>
          </header>

          {/* 탭 바 */}
          <div
            style={{
              height: "44px",
              background: colors.white,
              borderBottom: `1px solid ${colors.gray200}`,
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
              position: "relative",
            }}
          >
            {canScrollLeft && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: "40px",
                  background: `linear-gradient(to right, ${colors.white} 70%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  zIndex: 10,
                  paddingLeft: "8px",
                }}
              >
                <button
                  onClick={() => scrollTabs("left")}
                  style={{
                    width: "24px",
                    height: "24px",
                    background: colors.white,
                    border: `1px solid ${colors.gray300}`,
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    color: colors.gray600,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.gray100;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = colors.white;
                  }}
                >
                  <i className="fa-solid fa-chevron-left" />
                </button>
              </div>
            )}

            <div
              ref={tabContainerRef}
              onScroll={checkScrollButtons}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                paddingLeft: canScrollLeft ? "44px" : "12px",
                paddingRight: canScrollRight ? "44px" : "12px",
                overflowX: "auto",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                gap: "4px",
              }}
            >
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 14px",
                    background: activeTab === tab.id ? colors.primaryLight : colors.gray100,
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    color: activeTab === tab.id ? colors.primary : colors.gray600,
                    fontWeight: activeTab === tab.id ? "600" : "500",
                    minWidth: "fit-content",
                    flexShrink: 0,
                    transition: "all 0.15s",
                    border: activeTab === tab.id ? `1px solid ${colors.primary}30` : "1px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== tab.id) {
                      e.currentTarget.style.background = colors.gray200;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab.id) {
                      e.currentTarget.style.background = colors.gray100;
                    }
                  }}
                >
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "100px",
                    }}
                  >
                    {tab.label}
                  </span>
                  {tabs.length > 1 && (
                    <button
                      onClick={(e) => closeTab(tab.id, e)}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "10px",
                        color: activeTab === tab.id ? colors.primary : colors.gray400,
                        padding: "2px",
                        lineHeight: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "16px",
                        height: "16px",
                        borderRadius: "4px",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = colors.gray300;
                        e.currentTarget.style.color = colors.gray700;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = activeTab === tab.id ? colors.primary : colors.gray400;
                      }}
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {canScrollRight && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: "40px",
                  background: `linear-gradient(to left, ${colors.white} 70%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  zIndex: 10,
                  paddingRight: "8px",
                }}
              >
                <button
                  onClick={() => scrollTabs("right")}
                  style={{
                    width: "24px",
                    height: "24px",
                    background: colors.white,
                    border: `1px solid ${colors.gray300}`,
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    color: colors.gray600,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.gray100;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = colors.white;
                  }}
                >
                  <i className="fa-solid fa-chevron-right" />
                </button>
              </div>
            )}
          </div>

          {/* 컨텐츠 영역 */}
          <div
            style={{
              flex: 1,
              background: colors.background,
              padding: "20px",
              overflowY: "auto",
              minHeight: 0,
            }}
          >
            {/* 상단 영역: 제목 + 경로 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <h2 style={{ 
                fontSize: "20px", 
                margin: 0, 
                fontWeight: "700", 
                color: colors.gray900,
              }}>
                {tabs.find((t) => t.id === activeTab)?.label || ""}
              </h2>
              
              {currentTab && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                    color: colors.gray500,
                    padding: "8px 14px",
                    background: colors.white,
                    borderRadius: "10px",
                    border: `1px solid ${colors.gray200}`,
                  }}
                >
                  <i className="fa-solid fa-house" style={{ fontSize: "11px" }} />
                  <span style={{ color: colors.gray400 }}>&gt;</span>
                  <span>{currentTab.path.menu}</span>
                  <span style={{ color: colors.gray400 }}>&gt;</span>
                  <span>{currentTab.path.subMenu}</span>
                  <span style={{ color: colors.gray400 }}>&gt;</span>
                  <span style={{ color: colors.gray700, fontWeight: "500" }}>{currentTab.path.item}</span>
                </div>
              )}
            </div>

            {/* 활성 탭만 렌더링 (조건부 렌더링) */}
            <div style={{ height: "calc(100vh - 220px)" }}>
              {isTabLoading ? (
                <>
                  {currentTab?.label === "대시보드" && (
                    <CardSkeleton />
                  )}
                  
                  {(currentTab?.label === "메뉴 관리" || currentTab?.label === "메뉴관리" ||
                    currentTab?.label === "출결기기관리" || currentTab?.label === "기기관리" ||
                    currentTab?.label === "학생관리" || currentTab?.label === "학생 관리" ||
                    currentTab?.label === "개인별 출결조회" || currentTab?.label === "출결조회") && (
                    <TableSkeleton />
                  )}
                  
                  {currentTab && 
                   currentTab.label !== "대시보드" && 
                   currentTab.label !== "메뉴 관리" && 
                   currentTab.label !== "메뉴관리" && 
                   currentTab.label !== "출결기기관리" && 
                   currentTab.label !== "기기관리" && 
                   currentTab.label !== "학생관리" && 
                   currentTab.label !== "학생 관리" && 
                   currentTab.label !== "개인별 출결조회" && 
                   currentTab.label !== "출결조회" && (
                    <SpinnerLoader />
                  )}
                </>
              ) : (
                <>
                  {currentTab?.label === "대시보드" && (
                    <div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                          gap: "16px",
                        }}
                      >
                        <div
                          style={{
                            padding: "24px",
                            background: colors.white,
                            borderRadius: "16px",
                            border: `1px solid ${colors.gray200}`,
                          }}
                        >
                          <h3 style={{ fontSize: "13px", color: colors.gray500, marginBottom: "8px", fontWeight: "500" }}>
                            환영합니다
                          </h3>
                          <p style={{ fontSize: "24px", fontWeight: "700", margin: 0, color: colors.gray900 }}>
                            {user.name || "사용자"}님
                          </p>
                        </div>
                        <div
                          style={{
                            padding: "24px",
                            background: colors.primary,
                            borderRadius: "16px",
                          }}
                        >
                          <h3 style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", marginBottom: "8px", fontWeight: "500" }}>
                            회원 ID
                          </h3>
                          <p style={{ fontSize: "18px", fontWeight: "700", margin: 0, color: "#fff" }}>
                            {user.visibleId || user.sub || "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {(currentTab?.label === "메뉴 관리" || currentTab?.label === "메뉴관리") && (
                    <MenuManagement onMenuUpdate={refreshMenus} />
                  )}
                  
                  {(currentTab?.label === "출결기기관리" || currentTab?.label === "기기관리") && (
                    <DeviceManagement tabId={currentTab.id} />
                  )}
                  
                  {(currentTab?.label === "학생관리" || currentTab?.label === "학생 관리") && (
                    <StudentManagement tabId={currentTab.id} />
                  )}
                  
                  {(currentTab?.label === "개인별 출결조회" || currentTab?.label === "출결조회") && (
                    <AttendanceViewer tabId={currentTab.id} />
                  )}
                  
                  {(currentTab?.label === "실시간 자습현황" || currentTab?.label === "실시간자습현황") && (
                    <RealtimeStudyStatus tabId={currentTab.id} />
                  )}
                  
                  {currentTab && 
                   currentTab.label !== "대시보드" && 
                   currentTab.label !== "메뉴 관리" && 
                   currentTab.label !== "메뉴관리" && 
                   currentTab.label !== "출결기기관리" && 
                   currentTab.label !== "기기관리" && 
                   currentTab.label !== "학생관리" && 
                   currentTab.label !== "학생 관리" && 
                   currentTab.label !== "개인별 출결조회" && 
                   currentTab.label !== "출결조회" &&
                   currentTab.label !== "실시간 자습현황" &&
                   currentTab.label !== "실시간자습현황" && (
                    <div style={{
                      background: colors.white,
                      borderRadius: "16px",
                      padding: "40px",
                      border: `1px solid ${colors.gray200}`,
                      textAlign: "center",
                    }}>
                      <i className="fa-solid fa-hammer" style={{ fontSize: "40px", color: colors.gray300, marginBottom: "16px" }} />
                      <p style={{ color: colors.gray500, fontSize: "14px", margin: 0 }}>이 페이지는 준비 중입니다.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* 로그아웃 확인 모달 */}
      {showLogoutModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={closeLogoutModal}
        >
          <div
            style={{
              background: colors.white,
              borderRadius: "16px",
              padding: "24px",
              width: "320px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  background: colors.gray100,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <i className="fa-solid fa-right-from-bracket" style={{ fontSize: "20px", color: colors.gray500 }} />
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: "700", color: colors.gray900 }}>
                로그아웃
              </h3>
              <p style={{ margin: 0, fontSize: "14px", color: colors.gray500, lineHeight: "1.5" }}>
                정말 로그아웃 하시겠습니까?
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={closeLogoutModal}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: colors.gray100,
                  color: colors.gray700,
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = colors.gray200}
                onMouseLeave={(e) => e.currentTarget.style.background = colors.gray100}
              >
                취소
              </button>
              <button
                onClick={confirmLogout}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: colors.red,
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
