import type { NextApiRequest, NextApiResponse } from "next";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { findUserByEmail } from "@/lib/db/users";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Méthode non autorisée" });
  }

  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email et mot de passe requis" });
  }

  const user = await findUserByEmail(email);

  if (!user || user.password !== password) {
    return res.status(401).json({ message: "Identifiants invalides" });
  }

  const token = createSessionToken({ id: user.id, email: user.email, name: user.name });
  setSessionCookie(res, token);

  return res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  });
}
