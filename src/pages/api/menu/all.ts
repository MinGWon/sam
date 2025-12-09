import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const menus = await prisma.menu.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        subMenus: {
          orderBy: { sortOrder: "asc" },
          include: {
            items: {
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });

    const formattedMenus = menus.map((menu) => ({
      id: menu.menuId,
      dbId: menu.id,
      label: menu.label,
      icon: menu.icon,
      isActive: menu.isActive,
      subMenus: menu.subMenus.map((subMenu) => ({
        id: subMenu.subMenuId,
        dbId: subMenu.id,
        label: subMenu.label,
        isActive: subMenu.isActive,
        items: subMenu.items.map((item) => ({
          id: item.itemId,
          dbId: item.id,
          label: item.label,
          isActive: item.isActive,
        })),
      })),
    }));

    return res.status(200).json({ menus: formattedMenus });
  } catch (error) {
    console.error("Menu fetch error:", error);
    return res.status(500).json({ error: "메뉴를 불러오는데 실패했습니다." });
  }
}
