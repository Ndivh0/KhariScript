import * as fs from 'fs';
import * as path from 'path';
import { generateMetadata } from './metadata';
import { VaultEntry } from './types';
import { getVaultPath } from './config'; 

export function saveToVault(content: string, tags: string[]) {
  const VAULT_PATH = getVaultPath(); 
  let vault: VaultEntry[] = [];
    
 if (fs.existsSync(VAULT_PATH)) {
    const data = fs.readFileSync(VAULT_PATH, 'utf8');
    vault = JSON.parse(data);
  }

  const entry = generateMetadata(content, tags);

  vault.push(entry);

  fs.writeFileSync(VAULT_PATH, JSON.stringify(vault, null, 2));
}

// New function to load all entries from the vault
export function loadVault(): VaultEntry[] {
  const VAULT_PATH = getVaultPath();

  if (!fs.existsSync(VAULT_PATH)) {
    return [];
  }

  try {
    const data = fs.readFileSync(VAULT_PATH, 'utf8');
    return JSON.parse(data) as VaultEntry[];
  } catch (error) {
    console.error('Error reading vault file:', error);
    return [];
  }
}
