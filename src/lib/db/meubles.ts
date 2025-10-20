import { promises as fs } from "fs";
import path from "path";

export interface StoredMeuble {
  userId: string;
  name: string;
  image: string;
}

const MEUBLES_FILE_PATH = path.join(process.cwd(), "src", "lib", "db", "meubles.json");

export async function getMeublesForUser(userId: string) {
  const file = await fs.readFile(MEUBLES_FILE_PATH, "utf8");
  const meubles = JSON.parse(file) as StoredMeuble[];
  return meubles.filter((meuble) => meuble.userId === userId);
}
