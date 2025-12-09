import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // iframe 방식에서는 주로 postMessage로 처리하지만,
  // 직접 리다이렉트 방식을 위한 fallback
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`/login?error=${error}`);
  }

  if (code && state) {
    // 클라이언트에서 토큰 교환하도록 리다이렉트
    return res.redirect(`/login?code=${code}&state=${state}`);
  }

  return res.redirect("/login");
}
