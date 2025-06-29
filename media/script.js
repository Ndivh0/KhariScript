const vscode = acquireVsCodeApi();

    function sendPrompt() {
        const userPrompt = document.getElementById('prompt').value;
        vscode.postMessage({ type: 'brainstorm', prompt: userPrompt });
        document.getElementById('output').innerHTML = '<em>Thinking...</em>';
    }

    window.addEventListener('message', event => {
        const msg = event.data;
        if (msg.type === 'response') {
    document.getElementById('output').innerText = msg.data;
        }
    });