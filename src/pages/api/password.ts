import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionFromRequest } from "@/lib/auth";
import { findUserByEmail, updateUserPassword, verifyUserPassword } from "@/lib/db/users";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).json({ message: "Méthode non autorisée" });
  }

  const session = getSessionFromRequest(req);
  if (!session) {
    return res.status(401).json({ message: "Session invalide" });
  }

  const { currentPassword, newPassword } = req.body ?? {};

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Les deux mots de passe sont requis" });
  }

  const user = await findUserByEmail(session.email);
   if (!user || !verifyUserPassword(currentPassword, user.passwordHash)) {
    return res.status(401).json({ message: "Mot de passe actuel incorrect" });
  }

  await updateUserPassword(user.id, newPassword);
  return res.status(200).json({ message: "Mot de passe mis à jour" });
}