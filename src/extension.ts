import * as vscode from 'vscode';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Use global fetch if available, otherwise import node-fetch
let fetchFn: typeof fetch;
if (typeof fetch === 'undefined') {
    // @ts-ignore
    fetchFn = require('node-fetch');
} else {
    fetchFn = fetch;
}

dotenv.config();

// Loads the HTML file from the media folder and injects secure URIs
function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri, htmlFile: string): string {
    const filePath = path.join(__dirname, '..', 'media', htmlFile);
    let html = fs.readFileSync(filePath, 'utf8');

    // Replace resource URIs for webview security
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'style.css'));
    html = html.replace('style.css', styleUri.toString());

    // Replace script reference based on HTML file name
    const scriptName = htmlFile.replace('.html', '.js');
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', scriptName));
    html = html.replace(scriptName, scriptUri.toString());

    return html;
}

// Real GPT-4 API call for code analysis or brainstorming
async function askGPT(prompt: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return '❌ OpenAI API key not found. Please set OPENAI_API_KEY in your environment.';
    }
    try {
        const response = await fetchFn('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [
                    { role: 'system', content: 'You are a Senior Software Engineer with expertise in code analysis, brainstorming, and optimization. Your task is to analyze code snippets or brainstorm ideas and provide detailed explanations, advice, and suggestions.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 800,
                temperature: 0.3
            })
        });
        if (!response.ok) {
            return `❌ OpenAI API error: ${response.status} ${response.statusText}`;
        }
        const data = await response.json() as {
            choices?: { message?: { content?: string } }[]
        };
        const content = data.choices?.[0]?.message?.content;
        return content || '❌ No response from OpenAI API.';
    } catch (err: any) {
        return `❌ Error calling OpenAI API: ${err.message}`;
    }
}

import { generateEmbedding } from './embedding';
import { generateTags } from './tags';
import { saveToVault, loadVault } from './storage';
import { retrieveRelevantEntry } from './retrieve';

export function activate(context: vscode.ExtensionContext) {
    // Save initial vault data if it doesn't exist
    const vaultPath = path.join(context.globalStorageUri.fsPath, 'kharivault.json');
    if (!fs.existsSync(vaultPath)) {
        const defaultData = [
            {
                title: "Voice Parser",
                subtitle: "Whisper, JavaScript",
                desc: "Converts voice notes into structured entries."
            },
            {
                title: "File Watcher",
                subtitle: "Node.js, Local Sync",
                desc: "Watches directories and saves changes automatically."
            }
        ];
        fs.mkdirSync(context.globalStorageUri.fsPath, { recursive: true });
        fs.writeFileSync(vaultPath, JSON.stringify(defaultData, null, 2), 'utf-8');
    }

    console.log('KhariScript extension is now active!');

    // Analyze Code Command
    const analyzeDisposable = vscode.commands.registerCommand('khariscript.analyzeCode', async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active text editor found.');
                return;
            }
            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);

            if (!selectedText.trim()) {
                vscode.window.showErrorMessage('Please select code to analyze.');
                return;
            }

            const prompt = `
Analyze the following code and provide:
1. 📖 Code Breakdown (line-by-line, part-by-part explanation)
2. 📍 Placement Advice (where this block belongs in the file)
3. ⚠️ Issues & Warnings (if any)
4. ✅ Suggestions for Improvement

Code:
${selectedText}
            `;

            const response = await askGPT(prompt);
            vscode.window.showInformationMessage(response, { modal: true });
        } catch (err: any) {
            vscode.window.showErrorMessage(`Error analyzing code: ${err.message}`);
        }
    });

    // Brainstorm Command
    const brainstormDisposable = vscode.commands.registerCommand('khariscript.brainstorm', async () => {
        try {
            const panel = vscode.window.createWebviewPanel(
                'KhariScriptBrainstorm',
                'KhariScript Brainstorm',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );
            panel.webview.html = getWebviewContent(panel.webview, context.extensionUri, 'brainstorm.html');

            panel.webview.onDidReceiveMessage(async (message) => {
                if (message.type === 'brainstorm') {
                    const brainstormPrompt = `
You are a senior software engineer with expertise in brainstorming and project planning.
Your task is to help the user brainstorm ideas based on this input:
"${message.prompt}"
Please suggest relevant components, helper functions, file structures, or any technical suggestions that might assist the user. Respond in clear sections.
`;
                    const response = await askGPT(brainstormPrompt);
                    panel.webview.postMessage({ type: 'response', data: response });
                }
            });
        } catch (err: any) {
            vscode.window.showErrorMessage(`Error opening brainstorm panel: ${err.message}`);
        }
    });

    // View Stored By Tag Command
    const viewStoredByTagCommand = vscode.commands.registerCommand('khariscript.viewStoredByTag', async () => {
        try {
            const vault = loadVault();

            if (vault.length === 0) {
                vscode.window.showInformationMessage('No entries found in your vault.');
                return;
            }

            const tagSet = new Set<string>();
            vault.forEach(entry => entry.tags.forEach(tag => tagSet.add(tag)));
            const tags = Array.from(tagSet);

            if (tags.length === 0) {
                vscode.window.showInformationMessage('No tags found in your vault.');
                return;
            }

            const selectedTag = await vscode.window.showQuickPick(tags, {
                placeHolder: 'Select a tag to view matching entries',
            });
            if (!selectedTag) return;

            const matchingEntries = vault.filter(entry => entry.tags.includes(selectedTag));
            const entryItems = matchingEntries.map(entry => ({
                label: `${entry.filename} (${entry.filetype})`,
                detail: entry.content.slice(0, 80).replace(/\s+/g, ' ') + '...',
                fullContent: entry.content
            }));

            const selectedEntry = await vscode.window.showQuickPick(entryItems, {
                placeHolder: `Entries tagged with "${selectedTag}"`,
            });

            if (selectedEntry) {
                const doc = await vscode.workspace.openTextDocument({
                    content: selectedEntry.fullContent,
                    language: 'plaintext'
                });
                vscode.window.showTextDocument(doc);
            }
        } catch (err: any) {
            vscode.window.showErrorMessage(`Error viewing stored entries: ${err.message}`);
        }
    });

    // Store Context Command
    const storeDisposable = vscode.commands.registerCommand('khariscript.storeContext', async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active text editor');
                return;
            }
            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);

            if (!selectedText.trim()) {
                vscode.window.showErrorMessage('Please select code to analyze');
                return;
            }

            const result = retrieveRelevantEntry(selectedText);

            if (!result) {
                vscode.window.showInformationMessage('No relevant context found.');
                return;
            }

            const preview = `
📁 Source: ${result.source}
🏷️ Tags: ${result.tags.join(', ')}
🕒 Saved: ${result.timestamp}

🧠 Content:
${result.content.substring(0, 500)}
`;

            const panel = vscode.window.createWebviewPanel(
                'KhariScriptContextResult',
                'KhariScript - Context Match',
                vscode.ViewColumn.Beside,
                {}
            );

            panel.webview.html = `<pre style="padding:1rem;">${preview}</pre>`;
        } catch (err: any) {
            vscode.window.showErrorMessage(`Error retrieving context: ${err.message}`);
        }
    });

    // Open Brainstorm Webview
    const brainstormWebview = vscode.commands.registerCommand('khariscript.openBrainstorm', () => {
        const panel = vscode.window.createWebviewPanel(
            'khariscriptBrainstorm',
            'KhariScript Brainstorm',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        panel.webview.html = getWebviewContent(panel.webview, context.extensionUri, 'brainstorm.html');
    });

    // Open Dashboard Webview
    const dashboardWebview = vscode.commands.registerCommand('khariscript.openDashboard', () => {
        const panel = vscode.window.createWebviewPanel(
            'khariscriptDashboard',
            'KhariScript Dashboard',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        panel.webview.html = getWebviewContent(panel.webview, context.extensionUri, 'dashboard.html');

        // Listen for messages from the webview (e.g. 'loadVault')
        panel.webview.onDidReceiveMessage(msg => {
            if (msg.command === 'loadVault') {
                const vaultPath = path.join(context.globalStorageUri.fsPath, 'kharivault.json');
                if (fs.existsSync(vaultPath)) {
                    const raw = fs.readFileSync(vaultPath, 'utf-8');
                    try {
                        const data = JSON.parse(raw);
                        panel.webview.postMessage({ command: 'vaultData', data });
                    } catch (err) {
                        console.error('Failed to parse kharivault.json:', err);
                        panel.webview.postMessage({ command: 'vaultData', data: [] });
                    }
                } else {
                    panel.webview.postMessage({ command: 'vaultData', data: [] });
                }
            }
            if (msg.command === 'saveEntry') {
                const vaultPath = path.join(context.globalStorageUri.fsPath, 'kharivault.json');
                let vault = [];
                if (fs.existsSync(vaultPath)) {
                    vault = JSON.parse(fs.readFileSync(vaultPath, 'utf-8'));
                }
                vault.push(msg.data);
                fs.writeFileSync(vaultPath, JSON.stringify(vault, null, 2), 'utf-8');
                // Optionally, send updated data back to webview
                panel.webview.postMessage({ command: 'vaultData', data: vault });
            }
            if (msg.command === 'updateEntry') {
                const vaultPath = path.join(context.globalStorageUri.fsPath, 'kharivault.json');
                let vault = [];
                if (fs.existsSync(vaultPath)) {
                    vault = JSON.parse(fs.readFileSync(vaultPath, 'utf-8'));
                }
                vault[msg.index] = msg.data;
                fs.writeFileSync(vaultPath, JSON.stringify(vault, null, 2), 'utf-8');
                panel.webview.postMessage({ command: 'vaultData', data: vault });
            }
            if (msg.command === 'deleteEntry') {
                const vaultPath = path.join(context.globalStorageUri.fsPath, 'kharivault.json');
                let vault = [];
                if (fs.existsSync(vaultPath)) {
                    vault = JSON.parse(fs.readFileSync(vaultPath, 'utf-8'));
                }
                vault.splice(msg.index, 1);
                fs.writeFileSync(vaultPath, JSON.stringify(vault, null, 2), 'utf-8');
                panel.webview.postMessage({ command: 'vaultData', data: vault });
            }
        });
    });

    // Open Tutor Webview
    const tutorWebview = vscode.commands.registerCommand('khariscript.openTutor', () => {
        const panel = vscode.window.createWebviewPanel(
            'khariscriptTutor',
            'KhariScript Tutor',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        panel.webview.html = getWebviewContent(panel.webview, context.extensionUri, 'tutor.html');
    });

    // Open Context Webview
    const contextWebview = vscode.commands.registerCommand('khariscript.openContext', () => {
        const panel = vscode.window.createWebviewPanel(
            'khariscriptContext',
            'KhariScript Context',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        panel.webview.html = getWebviewContent(panel.webview, context.extensionUri, 'context.html');
    });

    // Open All Webviews Command
    const openAllWebviews = vscode.commands.registerCommand('khariscript.openAll', () => {
        const files = [
            { id: 'khariscriptDashboard', title: 'KhariScript Dashboard', file: 'dashboard.html' },
            { id: 'khariscriptTutor', title: 'KhariScript Tutor', file: 'tutor.html' },
            { id: 'khariscriptContext', title: 'KhariScript Context', file: 'context.html' },
            { id: 'khariscriptBrainstorm', title: 'KhariScript Brainstorm', file: 'brainstorm.html' }
        ];
        files.forEach(({ id, title, file }) => {
            const panel = vscode.window.createWebviewPanel(
                id,
                title,
                vscode.ViewColumn.Active,
                { enableScripts: true }
            );
            panel.webview.html = getWebviewContent(panel.webview, context.extensionUri, file);
        });
    });

    context.subscriptions.push(
        analyzeDisposable,
        brainstormDisposable,
        viewStoredByTagCommand,
        storeDisposable,
        brainstormWebview,
        dashboardWebview,
        tutorWebview,
        contextWebview,
        openAllWebviews
    );
}

export function deactivate() {}
