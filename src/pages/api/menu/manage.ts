import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

function generateMenuId(label: string, prefix: string = ""): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return prefix ? `${prefix}-${slug}` : slug;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // POST: 추가
    if (req.method === "POST") {
      const { type, label, icon, menuId, subMenuId } = req.body;

      if (type === "menu") {
        const count = await prisma.menu.count();
        const newMenuId = generateMenuId(label);
        const menu = await prisma.menu.create({
          data: {
            menuId: newMenuId,
            label,
            icon,
            sortOrder: count,
          },
        });
        return res.status(201).json({ success: true, menu });
      }

      if (type === "submenu") {
        const menu = await prisma.menu.findUnique({ where: { menuId } });
        if (!menu) return res.status(404).json({ error: "메뉴를 찾을 수 없습니다." });

        const count = await prisma.subMenu.count({ where: { menuId: menu.id } });
        const newSubMenuId = generateMenuId(label, menuId);
        const subMenu = await prisma.subMenu.create({
          data: {
            subMenuId: newSubMenuId,
            label,
            sortOrder: count,
            menuId: menu.id,
          },
        });
        return res.status(201).json({ success: true, subMenu });
      }

      if (type === "item") {
        const subMenu = await prisma.subMenu.findUnique({ where: { subMenuId } });
        if (!subMenu) return res.status(404).json({ error: "서브메뉴를 찾을 수 없습니다." });

        const count = await prisma.menuItem.count({ where: { subMenuId: subMenu.id } });
        const newItemId = generateMenuId(label, subMenuId);
        const item = await prisma.menuItem.create({
          data: {
            itemId: newItemId,
            label,
            sortOrder: count,
            subMenuId: subMenu.id,
          },
        });
        return res.status(201).json({ success: true, item });
      }

      return res.status(400).json({ error: "잘못된 요청입니다." });
    }

    // PUT: 수정
    if (req.method === "PUT") {
      const { type, id, label, icon } = req.body;

      if (type === "menu") {
        const menu = await prisma.menu.update({
          where: { menuId: id },
          data: { label, icon },
        });
        return res.status(200).json({ success: true, menu });
      }

      if (type === "submenu") {
        const subMenu = await prisma.subMenu.update({
          where: { subMenuId: id },
          data: { label },
        });
        return res.status(200).json({ success: true, subMenu });
      }

      if (type === "item") {
        const item = await prisma.menuItem.update({
          where: { itemId: id },
          data: { label },
        });
        return res.status(200).json({ success: true, item });
      }

      return res.status(400).json({ error: "잘못된 요청입니다." });
    }

    // DELETE: 삭제
    if (req.method === "DELETE") {
      const { type, id } = req.body;

      if (type === "menu") {
        await prisma.menu.delete({ where: { menuId: id } });
        return res.status(200).json({ success: true });
      }

      if (type === "submenu") {
        await prisma.subMenu.delete({ where: { subMenuId: id } });
        return res.status(200).json({ success: true });
      }

      if (type === "item") {
        await prisma.menuItem.delete({ where: { itemId: id } });
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: "잘못된 요청입니다." });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Menu manage error:", error);
    return res.status(500).json({ error: "메뉴 관리 중 오류가 발생했습니다." });
  }
}
