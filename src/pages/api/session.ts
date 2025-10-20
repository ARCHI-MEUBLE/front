import type { NextApiRequest, NextApiResponse } from "next";
import { clearSessionCookie, getSessionFromRequest } from "@/lib/auth";
import { getUserById } from "@/lib/db/users";
import { getMeublesForUser } from "@/lib/db/meubles";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const session = getSessionFromRequest(req);
    if (!session) {
      return res.status(401).json({ message: "Session invalide" });
    }

    const user = await getUserById(session.id);
    if (!user) {
      clearSessionCookie(res);
      return res.status(401).json({ message: "Utilisateur introuvable" });
    }

    const meubles = await getMeublesForUser(user.id);

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      meubles
    });
  }

  if (req.method === "DELETE") {
    clearSessionCookie(res);
    return res.status(204).end();
  }

  res.setHeader("Allow", ["GET", "DELETE"]);
  return res.status(405).json({ message: "Méthode non autorisée" });
}
