"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlawFinder = void 0;
const settings_1 = require("../settings");
const linter_1 = require("./linter");
const node_1 = require("vscode-languageserver/node");
class FlawFinder extends linter_1.Linter {
    constructor(settings, workspaceRoot) {
        super('FlawFinder', settings, workspaceRoot, false);
        this.cascadeCommonSettings('flawfinder');
        this.setExecutable(settings['c-cpp-flylint'].flawfinder.executable);
        this.active = this.enabled = settings['c-cpp-flylint'].flawfinder.enable;
    }
    buildCommandLine(fileName, _tmpFileName) {
        let args = [this.executable]
            .concat(['--columns'])
            .concat(['--dataonly'])
            .concat(['--singleline'])
            .concat([]);
        args.push(fileName);
        return args;
    }
    parseLine(line) {
        let regex = /^([a-zA-Z]?:?[^:]+):(\d+):(\d+)?:?  \[([0-5])\] ([^:]+):(.+)$/;
        let regexArray;
        let excludeRegex = /^((Examining ).*|)$/;
        if (excludeRegex.exec(line) !== null) {
            // skip this line
            return null;
        }
        if ((regexArray = regex.exec(line)) !== null) {
            return {
                fileName: regexArray[1],
                line: parseInt(regexArray[2]) - 1,
                column: parseInt(regexArray[3]) - 1 || 0,
                severity: this.getSeverityCode(regexArray[4]),
                code: regexArray[5],
                message: regexArray[6],
                source: 'FlawFinder',
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
                source: 'FlawFinder'
            };
        }
    }
    getSeverityCode(severity) {
        let output = this.settings['c-cpp-flylint'].flawfinder.severityLevels[severity];
        return settings_1.VS_DiagnosticSeverity.from(output);
    }
}
exports.FlawFinder = FlawFinder;
//# sourceMappingURL=flawfinder.js.map