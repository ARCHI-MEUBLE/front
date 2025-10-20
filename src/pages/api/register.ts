import type { NextApiRequest, NextApiResponse } from "next";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { createUser, findUserByEmail } from "@/lib/db/users";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Méthode non autorisée" });
  }

  const { email, password, name } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email et mot de passe requis" });
  }

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    return res.status(409).json({ message: "Un compte existe déjà avec cet email" });
  }

  const user = await createUser({ email, password, name });
  const token = createSessionToken({ id: user.id, email: user.email, name: user.name });
  setSessionCookie(res, token);

  return res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  });
}
