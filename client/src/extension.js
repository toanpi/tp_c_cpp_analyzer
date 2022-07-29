"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = exports.maybeWorkspaceIsTrusted = void 0;
const vscode_1 = require("vscode");
const node_1 = require("vscode-languageclient/node");
const path = require("path");
const stateUtils_1 = require("./stateUtils");
const lodash_1 = require("lodash");
const WORKSPACE_IS_TRUSTED_KEY = 'WORKSPACE_IS_TRUSTED_KEY';
const SECURITY_SENSITIVE_CONFIG = [
    'clang.executable',
    'cppcheck.executable',
    'flexelint.executable',
    'flawfinder.executable',
    'lizard.executable',
    'pclintplus.executable',
];
var IS_TRUSTED = false;
async function maybeWorkspaceIsTrusted(ctx) {
    if (vscode_1.workspace.hasOwnProperty('isTrusted') && vscode_1.workspace.hasOwnProperty('isTrusted') !== null) {
        const workspaceIsTrusted = vscode_1.workspace['isTrusted'];
        console.log(`Workspace has property "isTrusted". It has the value of "${workspaceIsTrusted}".`);
        if ((0, lodash_1.isBoolean)(workspaceIsTrusted) && workspaceIsTrusted) {
            IS_TRUSTED = true;
            console.log(`Workspace was marked trusted, by user of VSCode.`);
        }
        else {
            IS_TRUSTED = false;
            console.log(`Workspace is not trusted!`);
        }
        return;
    }
    const isTrusted = (0, stateUtils_1.getFromWorkspaceState)(WORKSPACE_IS_TRUSTED_KEY, false);
    if (isTrusted !== IS_TRUSTED) {
        IS_TRUSTED = true;
    }
    ctx.subscriptions.push(vscode_1.commands.registerCommand('c-cpp-flylint.workspace.isTrusted.toggle', async () => {
        await toggleWorkspaceIsTrusted();
        vscode_1.commands.executeCommand('c-cpp-flylint.analyzeWorkspace');
    }));
    ctx.subscriptions.push(vscode_1.commands.registerCommand('c-cpp-flylint.workspace.resetState', stateUtils_1.resetWorkspaceState));
    if (isTrusted) {
        return;
    }
    const ignored = ignoredWorkspaceConfig(vscode_1.workspace.getConfiguration('c-cpp-flylint'), SECURITY_SENSITIVE_CONFIG);
    if (ignored.length === 0) {
        return;
    }
    const ignoredSettings = ignored.map((x) => `"c-cpp-flylint.${x}"`).join(',');
    const val = await vscode_1.window.showWarningMessage(`Some workspace/folder-level settings (${ignoredSettings}) from the untrusted workspace are disabled ` +
        'by default. If this workspace is trusted, explicitly enable the workspace/folder-level settings ' +
        'by running the "C/C++ Flylint: Toggle Workspace Trust Flag" command.', 'OK', 'Trust This Workspace', 'More Info');
    switch (val) {
        case 'Trust This Workspace':
            await toggleWorkspaceIsTrusted();
            break;
        case 'More Info':
            vscode_1.env.openExternal(vscode_1.Uri.parse('https://github.com/jbenden/vscode-c-cpp-flylint/blob/main/README.md#security'));
            break;
        default:
            break;
    }
}
exports.maybeWorkspaceIsTrusted = maybeWorkspaceIsTrusted;
function ignoredWorkspaceConfig(cfg, keys) {
    return keys.filter((key) => {
        const inspect = cfg.inspect(key);
        if (inspect === undefined) {
            return false;
        }
        return inspect.workspaceValue !== undefined || inspect.workspaceFolderValue !== undefined;
    });
}
async function toggleWorkspaceIsTrusted() {
    IS_TRUSTED = !IS_TRUSTED;
    await (0, stateUtils_1.updateWorkspaceState)(WORKSPACE_IS_TRUSTED_KEY, IS_TRUSTED);
}
async function activate(context) {
    (0, stateUtils_1.setWorkspaceState)(context.workspaceState);
    await maybeWorkspaceIsTrusted(context);
    // The server is implemented in Node.
    const serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));
    // The debug options for the server.
    const debugOptions = {
        execArgv: ['--nolazy', '--inspect=6011']
    };
    // If the extension is launched in debug mode the debug server options are used, otherwise the run options are used.
    const serverOptions = {
        run: {
            module: serverModule,
            transport: node_1.TransportKind.ipc
        },
        debug: {
            module: serverModule,
            transport: node_1.TransportKind.ipc,
            options: debugOptions
        }
    };
    // Create the language client and start it.
    startLSClient(serverOptions, context);
}
exports.activate = activate;
function startLSClient(serverOptions, context) {
    // Options to control the language client.
    const clientOptions = {
        // Register the server for C/C++ documents.
        documentSelector: [{ scheme: 'file', language: 'c' }, { scheme: 'file', language: 'cpp' }],
        synchronize: {
            // Synchronize the setting section "c-cpp-flylint" to the server.
            configurationSection: 'c-cpp-flylint',
            fileEvents: vscode_1.workspace.createFileSystemWatcher('**/.vscode/c_cpp_properties.json')
        }
    };
    const client = new node_1.LanguageClient('c-cpp-flylint', 'C/C++ Flylint', serverOptions, clientOptions);
    client.onReady()
        .then(() => {
        // ----------------------------------------------------------------
        context.subscriptions.push(vscode_1.commands.registerCommand('c-cpp-flylint.getLocalConfig', async (d) => {
            return client.sendRequest('getLocalConfig', d);
        }));
        // ----------------------------------------------------------------
        // Here we must watch for all extension dependencies to start and be ready.
        var untilReadyRetries = 40; // 40x250 = 10 seconds maximum
        const untilReady = async () => {
            client.outputChannel.appendLine(`untilReady: checking...`);
            try {
                await vscode_1.commands.executeCommand('cpptools.activeConfigName');
                client.sendNotification('begin', { document: vscode_1.window.activeTextEditor.document });
            }
            catch (err) {
                client.outputChannel.appendLine(`untilReady: re-arm timer.`);
                if (--untilReadyRetries > 0) {
                    setTimeout(untilReady, 250); // repeat
                }
                else {
                    client.outputChannel.appendLine(`Failed to access "ms-vstools.cpptools"` +
                        `extension's active workspace` +
                        `configuration.`);
                    client.sendNotification('begin');
                }
            }
        };
        setTimeout(untilReady, 250); // primer
        // ----------------------------------------------------------------
        client.onRequest('activeTextDocument', () => {
            return vscode_1.window.activeTextEditor.document;
        });
        // ----------------------------------------------------------------
        client.onRequest('c-cpp-flylint.cpptools.activeConfigName', async () => {
            client.outputChannel.appendLine(`Sending request to "ms-vstools.cpptools" extension.`);
            return vscode_1.commands.executeCommand('cpptools.activeConfigName');
        });
        // ----------------------------------------------------------------
        client.onRequest('isTrusted', () => {
            client.outputChannel.appendLine(`Incoming request for isTrusted property. Have ${IS_TRUSTED}.`);
            return IS_TRUSTED;
        });
        // ----------------------------------------------------------------
        vscode_1.tasks.onDidEndTask((e) => {
            if (e.execution.task.group && e.execution.task.group === vscode_1.TaskGroup.Build) {
                // send a build notification event
                let params = {
                    taskName: e.execution.task.name,
                    taskSource: e.execution.task.source,
                    isBackground: e.execution.task.isBackground,
                };
                client.sendNotification('onBuild', params);
            }
        });
    });
    context.subscriptions.push(new node_1.SettingMonitor(client, 'c-cpp-flylint.enable').start());
}
//# sourceMappingURL=extension.js.map