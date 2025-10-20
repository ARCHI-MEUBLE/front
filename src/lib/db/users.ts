import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

export interface StoredUser {
  id: string;
  email: string;
  password: string;
  name?: string;
}

const USERS_FILE_PATH = path.join(process.cwd(), "src", "lib", "db", "users.json");

async function readUsers(): Promise<StoredUser[]> {
  const file = await fs.readFile(USERS_FILE_PATH, "utf8");
  return JSON.parse(file) as StoredUser[];
}

async function writeUsers(users: StoredUser[]) {
  await fs.writeFile(USERS_FILE_PATH, JSON.stringify(users, null, 2), "utf8");
}

export async function findUserByEmail(email: string) {
  const users = await readUsers();
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function getUserById(id: string) {
  const users = await readUsers();
  return users.find((user) => user.id === id) ?? null;
}

export async function createUser(data: { email: string; password: string; name?: string }) {
  const users = await readUsers();
  const newUser: StoredUser = {
    id: randomUUID(),
    email: data.email,
    password: data.password,
    name: data.name?.trim() || undefined
  };
  users.push(newUser);
  await writeUsers(users);
  return newUser;
}

export async function updateUserPassword(id: string, password: string) {
  const users = await readUsers();
  const index = users.findIndex((user) => user.id === id);
  if (index === -1) return null;
  users[index] = { ...users[index], password };
  await writeUsers(users);
  return users[index];
}
