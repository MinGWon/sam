import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { type, sourceId, targetId, parentId } = req.body;

  try {
    if (type === "menu") {
      // 메뉴 순서 변경
      const allMenus = await prisma.menu.findMany({
        orderBy: { sortOrder: "asc" },
      });

      const sourceIndex = allMenus.findIndex((m) => m.menuId === sourceId);
      const targetIndex = allMenus.findIndex((m) => m.menuId === targetId);

      if (sourceIndex === -1 || targetIndex === -1) {
        return res.status(404).json({ error: "메뉴를 찾을 수 없습니다." });
      }

      // 배열에서 순서 변경
      const [removed] = allMenus.splice(sourceIndex, 1);
      allMenus.splice(targetIndex, 0, removed);

      // DB 업데이트
      await Promise.all(
        allMenus.map((menu, index) =>
          prisma.menu.update({
            where: { id: menu.id },
            data: { sortOrder: index },
          })
        )
      );

      return res.status(200).json({ success: true });
    }

    if (type === "submenu") {
      // 서브메뉴 순서 변경
      const parentMenu = await prisma.menu.findUnique({
        where: { menuId: parentId },
      });

      if (!parentMenu) {
        return res.status(404).json({ error: "부모 메뉴를 찾을 수 없습니다." });
      }

      const allSubMenus = await prisma.subMenu.findMany({
        where: { menuId: parentMenu.id },
        orderBy: { sortOrder: "asc" },
      });

      const sourceIndex = allSubMenus.findIndex((s) => s.subMenuId === sourceId);
      const targetIndex = allSubMenus.findIndex((s) => s.subMenuId === targetId);

      if (sourceIndex === -1 || targetIndex === -1) {
        return res.status(404).json({ error: "서브메뉴를 찾을 수 없습니다." });
      }

      const [removed] = allSubMenus.splice(sourceIndex, 1);
      allSubMenus.splice(targetIndex, 0, removed);

      await Promise.all(
        allSubMenus.map((subMenu, index) =>
          prisma.subMenu.update({
            where: { id: subMenu.id },
            data: { sortOrder: index },
          })
        )
      );

      return res.status(200).json({ success: true });
    }

    if (type === "item") {
      // 아이템 순서 변경
      const parentSubMenu = await prisma.subMenu.findUnique({
        where: { subMenuId: parentId },
      });

      if (!parentSubMenu) {
        return res.status(404).json({ error: "부모 서브메뉴를 찾을 수 없습니다." });
      }

      const allItems = await prisma.menuItem.findMany({
        where: { subMenuId: parentSubMenu.id },
        orderBy: { sortOrder: "asc" },
      });

      const sourceIndex = allItems.findIndex((i) => i.itemId === sourceId);
      const targetIndex = allItems.findIndex((i) => i.itemId === targetId);

      if (sourceIndex === -1 || targetIndex === -1) {
        return res.status(404).json({ error: "아이템을 찾을 수 없습니다." });
      }

      const [removed] = allItems.splice(sourceIndex, 1);
      allItems.splice(targetIndex, 0, removed);

      await Promise.all(
        allItems.map((item, index) =>
          prisma.menuItem.update({
            where: { id: item.id },
            data: { sortOrder: index },
          })
        )
      );

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "잘못된 요청입니다." });
  } catch (error) {
    console.error("Reorder error:", error);
    return res.status(500).json({ error: "순서 변경 중 오류가 발생했습니다." });
  }
}
