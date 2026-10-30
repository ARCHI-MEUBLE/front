#!/usr/bin/env node
// Crée un admin ou change son mot de passe dans la base du backend (Docker local).
// Usage : node scripts/set-admin-password.mjs            (l'e-mail et le mot de passe sont demandés)
//         node scripts/set-admin-password.mjs <email> <mot de passe>
// La connexion admin est vérifiée par le backend PHP (colonne admins.password_hash, bcrypt) :
// le chiffrement est donc fait par le PHP du conteneur backend.

import { execFileSync } from 'node:child_process';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const BACKEND_CONTAINER = 'archimeuble-backend';
const POSTGRES_CONTAINER = 'archimeuble-postgres';
const POSTGRES_USER = 'archimeuble';
const POSTGRES_DB = 'archimeuble';

async function askCredentials() {
  const [argEmail, argPassword] = process.argv.slice(2);
  if (argEmail && argPassword) return { email: argEmail, password: argPassword };

  const rl = readline.createInterface({ input: stdin, output: stdout });
  const email = (await rl.question('E-mail (ou identifiant) admin : ')).trim();
  const password = await rl.question('Nouveau mot de passe : ');
  rl.close();
  return { email, password };
}

function docker(args, input) {
  return execFileSync('docker', args, { input, encoding: 'utf8' }).trim();
}

function psql(sql, variables = {}) {
  const vars = Object.entries(variables).flatMap(([key, value]) => ['-v', `${key}=${value}`]);
  return docker(
    ['exec', '-i', POSTGRES_CONTAINER, 'psql', '-U', POSTGRES_USER, '-d', POSTGRES_DB, '-tA', '-v', 'ON_ERROR_STOP=1', ...vars],
    sql
  );
}

const { email, password } = await askCredentials();
if (!email || !password) {
  console.error('E-mail et mot de passe obligatoires.');
  process.exit(1);
}

const hash = docker(['exec', BACKEND_CONTAINER, 'php', '-r', 'echo password_hash($argv[1], PASSWORD_DEFAULT);', '--', password]);
if (!hash.startsWith('$2')) {
  console.error('Le chiffrement du mot de passe a échoué :', hash);
  process.exit(1);
}

// Met à jour le compte s'il existe (par e-mail ou identifiant), sinon le crée
psql(
  `UPDATE admins SET password = :'hash', password_hash = :'hash' WHERE email = :'email' OR username = :'email';
   INSERT INTO admins (username, email, password, password_hash)
   SELECT split_part(:'email', '@', 1), :'email', :'hash', :'hash'
   WHERE NOT EXISTS (SELECT 1 FROM admins WHERE email = :'email' OR username = :'email');`,
  { email, hash }
);

// Vérification avec la même fonction que le backend
const stored = psql(`SELECT password_hash FROM admins WHERE email = :'email' OR username = :'email' LIMIT 1;`, { email });
const ok = docker(['exec', BACKEND_CONTAINER, 'php', '-r', 'echo password_verify($argv[1], $argv[2]) ? "ok" : "ko";', '--', password, stored]);

if (ok !== 'ok') {
  console.error('Le mot de passe a été enregistré mais la vérification a échoué.');
  process.exit(1);
}
console.log(`Mot de passe enregistré et vérifié pour ${email}. Vous pouvez vous connecter.`);
