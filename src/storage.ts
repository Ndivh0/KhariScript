import * as fs from 'fs';
import * as path from 'path';

const VAULT_PATH = path.join(__dirname, '..', '.kharivault.json');

//Save a single entry into the vault
export function saveToVault(entry: object) {
    let vault = [];


//If a vault file already exists, read and parse it's contents
if (fs.existsSync(VAULT_PATH)) {
    const data = fs.readFileSync(VAULT_PATH, 'utf8');
    vault = JSON.parse(data);
}

//Add new entry to vault
vault.push(entry);

//Write the updated vault back to the file system
fs.writeFileSync(VAULT_PATH, JSON.stringify(vault, null,2));

}
