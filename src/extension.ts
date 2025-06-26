// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();


// This function runs when the extension is activated
export function activate(context: vscode.ExtensionContext) {
	console.log('KhariScript extension is now active!');

	// Register the 'analyzeCode' command
	const disposable = vscode.commands.registerCommand('khariscript.analyzeCode', async () => {
		// Get the currently active text editor
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active text editor found.');
			return;
		}
		// Get selected code
		const selection = editor.selection;
		const selectedCode = editor.document.getText(selection);
		if (!selectedCode.trim()) {
			vscode.window.showErrorMessage('No code selected for analysis.');
			return;
		}

		vscode.window.showInformationMessage('Analyzing code with KhariScript...');

		// Simulate AI analysis (replace with GPT-4 API call in the future)
		const aiResponse = await askGPT(selectedCode);

		// Show the result in a webview panel
		const panel = vscode.window.createWebviewPanel(
			'KhariScriptAnalysis',          // internal identifier
			'KhariScript Analysis Result',  // title of the panel
			vscode.ViewColumn.Beside,      // show in the column beside the current one
			{ enableScripts: true }
		);
		// Set the HTML content of the webview
		panel.webview.html = getWebviewContent(aiResponse);
	});

	context.subscriptions.push(disposable);
}

// Function to turn raw AI response into HTML content for the webview
export function getWebviewContent(response: string): string {
	const escaped = response.replace(/</g, '&lt;').replace(/>/g, '&gt;');
	return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <style>
        body {
          font-family: Consolas, monospace;
          padding: 1rem;
          line-height: 1.6;
          white-space: pre-wrap; 
          background-color: #1e1e1e;
          color: #d4d4d4;
        }
        h2 { color: #4ec9b0; }
    </style>
    </head>
    <body>
    <h2>KhariScript Analysis</h2>
    <div>${escaped}</div>
    </body>
    </html>
    `;
}


// Real GPT-4 API call for code analysis
async function askGPT(code: string): Promise<string> {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		return '❌ OpenAI API key not found. Please set OPENAI_API_KEY in your environment.';
	}

	const prompt = `Analyze the following code and provide:
1. A breakdown of each line, explaining every part (keywords, variables, operators, etc.).
2. Suggestions on where in the file the code should ideally be placed (top, bottom, inside function, new helper, etc.).
3. Optional feedback on bugs, bad practices, or edge cases.
4. Suggestions for improving readability, performance, or organization.

Code:
${code}

Format your response as:
- Section 1: 📖 Code Breakdown (line-by-line, part-by-part explanation)
- Section 2: 📍 Placement Advice (where this block belongs in the file)
- Section 3: ⚠️ Issues & Warnings (if any)
- Section 4: ✅ Suggestions for Improvement`;

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
					{ role: 'system', content: 'You are a Senior Software Engineer with expertise in code analysis and optimization. Your task is to analyze code snippets and provide detailed explanations, placement advice, and suggestions for improvement.' },
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

// This method is called when your extension is deactivated
export function deactivate() {}
