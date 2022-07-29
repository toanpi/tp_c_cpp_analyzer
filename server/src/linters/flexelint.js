"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Flexelint = void 0;
const path = require("path");
const _ = require("lodash");
const settings_1 = require("../settings");
const linter_1 = require("./linter");
const node_1 = require("vscode-languageserver/node");
class Flexelint extends linter_1.Linter {
    constructor(settings, workspaceRoot) {
        super('Flexelint', settings, workspaceRoot, true);
        this.cascadeCommonSettings('flexelint');
        this.executable = settings['c-cpp-flylint'].flexelint.executable;
        this.configFile = settings['c-cpp-flylint'].flexelint.configFile;
        this.active = this.enabled = settings['c-cpp-flylint'].flexelint.enable;
    }
    buildCommandLine(fileName, _tmpFileName) {
        var args = [
            this.executable,
            '-v',
            '-b',
            '-format=%f  %l %c  %t %n: %m',
            this.configFile,
            '-hsFr_1',
            '-width(4096,0)',
            '-zero(400)',
        ];
        if (linter_1.headerExts.indexOf(path.extname(fileName)) !== -1) {
            var hArgs = this.settings['c-cpp-flylint'].flexelint.headerArgs;
            if (_.isString(hArgs)) {
                args.push(hArgs);
            }
            else {
                hArgs.forEach(element => {
                    args.push(element);
                });
            }
        }
        args.push(fileName);
        return args;
    }
    transformParse(currentParsed, parsed) {
        if (parsed) {
            if ((parsed['code'] === '830' && parsed['message'] !== 'Location cited in prior message') || (parsed['code'] === '831' && parsed['message'] !== 'Reference cited in prior message')) {
                currentParsed['line'] = parsed['line'];
                currentParsed['column'] = parsed['column'];
                parsed = null;
            }
            else if (parsed['code'] === '830' || parsed['code'] === '831') {
                parsed = null;
            }
        }
        return { currentParsed: currentParsed, parsed: parsed };
    }
    parseLine(line) {
        let regex = /^(.+?)\s\s([0-9]+)\s([0-9]+\s)?\s(Info|Warning|Error|Note)\s([0-9]+):\s(.*)$/;
        let regexArray;
        let excludeRegex = /^((During Specific Walk:|\s\sFile\s).*|)$/;
        if (excludeRegex.exec(line) !== null) {
            // skip this line
            return null;
        }
        if ((regexArray = regex.exec(line)) !== null) {
            return {
                fileName: regexArray[1],
                line: parseInt(regexArray[2]) - 1,
                column: 0,
                severity: this.getSeverityCode(regexArray[4]),
                code: regexArray[5],
                message: regexArray[6],
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
    getSeverityCode(severity) {
        let output = this.settings['c-cpp-flylint'].flexelint.severityLevels[severity];
        return settings_1.VS_DiagnosticSeverity.from(output);
    }
}
exports.Flexelint = Flexelint;
//# sourceMappingURL=flexelint.js.map