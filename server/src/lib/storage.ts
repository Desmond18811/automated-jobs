import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env';

export const storageRoot = path.resolve(env.STORAGE_DIR);
const FOLDERS = ['cv', 'generated', 'screenshots'] as const;
export type Folder = (typeof FOLDERS)[number];

/** Returns an absolute path inside storage, creating the folder. File names start with the userId so deletion is easy. */
export async function storagePath(folder: Folder, fileName: string): Promise<string> {
  const dir = path.join(storageRoot, folder);
  await fs.mkdir(dir, { recursive: true });
  return path.join(dir, path.basename(fileName));
}

export async function removeUserFiles(userId: string): Promise<number> {
  let removed = 0;
  for (const folder of FOLDERS) {
    const dir = path.join(storageRoot, folder);
    const names = await fs.readdir(dir).catch(() => [] as string[]);
    for (const name of names) {
      if (name.startsWith(`${userId}-`)) {
        await fs.rm(path.join(dir, name), { force: true });
        removed++;
      }
    }
  }
  return removed;
}
