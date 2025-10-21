import fs from "node:fs";
import path from "node:path";
import type { NextApiRequest, NextApiResponse } from "next";
import { DatabaseSync } from "node:sqlite";

type ModelRow = {
  id: number;
  name: string;
  description: string;
  image_path: string | null;
  created_at: string;
};

const dbDirectory = path.join(process.cwd(), "db");
const dbPath = path.join(dbDirectory, "archimeuble.db");

if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

const database = new DatabaseSync(dbPath);
const modelsStatement = database.prepare<ModelRow>(
  "SELECT id, name, description, image_path, created_at FROM models"
);

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Méthode non autorisée" });
  }

  try {
    const models = modelsStatement.all();
    return res.status(200).json(models);
  } catch (error) {
    console.error("Erreur lors de la récupération des modèles", error);
    return res.status(500).json({ message: "Erreur interne du serveur" });
  }
}