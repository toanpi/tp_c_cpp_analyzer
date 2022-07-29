"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lizard = void 0;
const linter_1 = require("./linter");
const node_1 = require("vscode-languageserver/node");
class Lizard extends linter_1.Linter {
    constructor(settings, workspaceRoot) {
        super('Lizard', settings, workspaceRoot, false);
        this.cascadeCommonSettings('lizard');
        this.setExecutable(settings['c-cpp-flylint'].lizard.executable);
        this.active = this.enabled = settings['c-cpp-flylint'].lizard.enable;
    }
    buildCommandLine(fileName, _tmpFileName) {
        let args = [this.executable]
            .concat(['--warnings_only'])
            .concat([]);
        args.push(fileName);
        return args;
    }
    parseLine(line) {
        let regex = /^([a-zA-Z]?:?[^:]+):(\d+)?:? warning: (.+)$/;
        let regexArray;
        let excludeRegex = /^$/;
        if (excludeRegex.exec(line) !== null) {
            // skip this line
            return null;
        }
        if ((regexArray = regex.exec(line)) !== null) {
            return {
                fileName: regexArray[1],
                line: parseInt(regexArray[2]) - 1,
                column: 0,
                severity: node_1.DiagnosticSeverity.Warning,
                code: 'Cyclomatic complexity',
                message: regexArray[3],
                source: this.name,
            };
        }
        else {
            return {
                parseError: 'Line could not be parsed: ' + line,
                fileName: '',
                line: 0,
                column: 0,
                severity: node_1.DiagnosticSeverity.Error,
                code: 0,
                message: '',
                source: this.name
            };
        }
    }
}
exports.Lizard = Lizard;
//# sourceMappingURL=lizard.js.map