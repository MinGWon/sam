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
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        subMenus: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          include: {
            items: {
              where: { isActive: true },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });

    const formattedMenus = menus.map((menu) => ({
      id: menu.menuId,
      label: menu.label,
      icon: menu.icon,
      subMenus: menu.subMenus.map((subMenu) => ({
        id: subMenu.subMenuId,
        label: subMenu.label,
        items: subMenu.items.map((item) => ({
          id: item.itemId,
          label: item.label,
        })),
      })),
    }));

    return res.status(200).json({ menus: formattedMenus });
  } catch (error) {
    console.error("Menu fetch error:", error);
    return res.status(500).json({ error: "메뉴를 불러오는데 실패했습니다." });
  }
}
