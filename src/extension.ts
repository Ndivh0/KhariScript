import * as vscode from 'vscode';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

// Loads the HTML file from the media folder and injects secure URIs
function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
	const path = require('path');
	const filePath = path.join(__dirname, '..', 'media', 'brainstorm.html');
	let html = fs.readFileSync(filePath, 'utf8');

	const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'style.css'));
	const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'brainstorm.js'));

	return html
		.replace('{{STYLE_URI}}', styleUri.toString())
		.replace('{{SCRIPT_URI}}', scriptUri.toString());
}

// Real GPT-4 API call for code analysis or brainstorming
async function askGPT(prompt: string): Promise<string> {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		return '❌ OpenAI API key not found. Please set OPENAI_API_KEY in your environment.';
	}
	try {
		const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
		const data = await response.json();
		const content = data.choices?.[0]?.message?.content;
		return content || '❌ No response from OpenAI API.';
	} catch (err: any) {
		return `❌ Error calling OpenAI API: ${err.message}`;
	}
}

import { generateEmbedding } from './embedding';
import { generateTags } from './tags';
import { saveToVault } from './storage';
import { retrieveRelevantEntry } from './retrieve';

export function activate(context: vscode.ExtensionContext) {
    console.log('KhariScript extension is now active!');

    // Analyze Code Command
    const analyzeDisposable = vscode.commands.registerCommand('khariscript.analyzeCode', async () => {
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
    });

    // Brainstorm Command
    const brainstormDisposable = vscode.commands.registerCommand('khariscript.brainstorm', async () => {
        const panel = vscode.window.createWebviewPanel(
            'KhariScriptBrainstorm',
            'KhariScript Brainstorm',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);

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
    });

    // View Stored By Tag Command
    const viewStoredByTagCommand = vscode.commands.registerCommand('khariscript.viewStoredByTag', async () => {
        const { loadVault } = await import('./storage.js');
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
    });

    // Store Context Command
    const storeDisposable = vscode.commands.registerCommand('khariscript.storeContext', async () => {
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
    });

    context.subscriptions.push(
        analyzeDisposable,
        brainstormDisposable,
        viewStoredByTagCommand,
        storeDisposable
    );
}
export function deactivate() {}
