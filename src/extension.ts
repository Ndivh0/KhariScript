// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();


// This function runs when the extension is activated
export function activate(context: vscode.ExtensionContext) {
	console.log('KhariScript extension is now active!');

	// Register the 'analyzeCode' command
	const analyzeDisposable = vscode.commands.registerCommand('khariscript.analyzeCode', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active text editor found.');
			return;
		}
	});

	// Register the 'brainstorm' command
	const brainstormDisposable = vscode.commands.registerCommand('khariscript.brainstorm', async () => {
		const panel = vscode.window.createWebviewPanel(
			'KhariScriptBrainstorm',
			'KhariScript Brainstorm',
			vscode.ViewColumn.One,
			{ enableScripts: true }
		);
		panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);

		// GPT prompt handler for brainstorming
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

	context.subscriptions.push(analyzeDisposable, brainstormDisposable);
}

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

export function deactivate() {}
