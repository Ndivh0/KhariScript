import { window } from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { VaultEntry } from './types';

export function generateMetadata(content: string, tags: string[]) {
    const editor = window.activeTextEditor;
    const filePath = editor?.document.uri.fsPath || '';
    const filename = path.basename(filePath);
    const filetype = editor?.document.languageId || 'plaintext';

return {
    id: uuidv4(),
    filename,
    filetype,
    tags,
    timestamp: new Date().toISOString(),
    content,
    source: 'activeEditor',
};
}
