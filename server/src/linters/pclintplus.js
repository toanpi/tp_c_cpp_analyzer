"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PclintPlus = void 0;
const path = require("path");
const _ = require("lodash");
const settings_1 = require("../settings");
const linter_1 = require("./linter");
const node_1 = require("vscode-languageserver/node");
class PclintPlus extends linter_1.Linter {
    constructor(settings, workspaceRoot) {
        super('PclintPlus', settings, workspaceRoot, true);
        this.lastParse = {};
        this.cascadeCommonSettings('pclintplus');
        this.setExecutable(settings['c-cpp-flylint'].pclintplus.executable);
        this.setConfigFile(settings['c-cpp-flylint'].pclintplus.configFile);
        this.active = this.enabled = settings['c-cpp-flylint'].pclintplus.enable;
    }
    buildCommandLine(fileName, _tmpFileName) {
        var args = [
            this.executable,
            this.configFile,
            '-v',
            '-b',
            '-format=%f  %l %c  %t %n: %m',
            '-h1',
            '-width(0,0)',
            '-zero(400)', // exit zero if no warnings at level >= 400
        ];
        if (linter_1.headerExts.indexOf(path.extname(fileName)) !== -1) {
            var hArgs = this.settings['c-cpp-flylint'].pclintplus.headerArgs;
            if (typeof hArgs === 'string') {
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
    parseLine(line) {
        let regex = /^(([^ ]+)?\s\s([0-9]+)\s([0-9]+\s)?\s([iI]nfo|[wW]arning|[eE]rror|[nN]ote|[sS]upplemental)\s([0-9]+):\s(.*)|(.+?):([0-9]+):([0-9]+:)?\s([iI]nfo|[wW]arning|[eE]rror|[nN]ote|[sS]upplemental)\s([0-9]+):\s(.*))$/;
        let regexArray;
        let excludeRegex = /^(\s+file \'.*\'|[^ \t]+|)$/;
        if (excludeRegex.exec(line) !== null) {
            // skip this line
            return null;
        }
        if ((regexArray = regex.exec(line)) !== null) {
            if (_.every([regexArray[3], regexArray[4], regexArray[5]], el => el !== undefined)) {
                if (_.isUndefined(regexArray[2])) {
                    regexArray[2] = this.lastParse.fileName;
                    regexArray[3] = this.lastParse.line;
                    regexArray[4] = this.lastParse.column;
                }
                else {
                    this.lastParse.fileName = regexArray[2];
                    this.lastParse.line = regexArray[3];
                    this.lastParse.column = regexArray[4];
                }
                return {
                    fileName: regexArray[2],
                    line: parseInt(regexArray[3]) - 1,
                    column: 0,
                    severity: this.getSeverityCode(regexArray[5].toLowerCase()),
                    code: regexArray[6],
                    message: regexArray[7],
                    source: this.name,
                };
            }
            else {
                if (_.isUndefined(regexArray[8])) {
                    regexArray[8] = this.lastParse.fileName;
                    regexArray[9] = this.lastParse.line;
                    regexArray[10] = this.lastParse.column;
                }
                else {
                    this.lastParse.fileName = regexArray[8];
                    this.lastParse.line = regexArray[9];
                    this.lastParse.column = regexArray[10];
                }
                return {
                    fileName: regexArray[8],
                    line: parseInt(regexArray[9]) - 1,
                    column: 0,
                    severity: this.getSeverityCode(regexArray[11].toLowerCase()),
                    code: regexArray[12],
                    message: regexArray[13],
                    source: this.name,
                };
            }
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
    transformParse(currentParsed, parsed) {
        if (parsed) {
            // Skip over successful completion messages...
            if (parsed['code'] === '900') {
                parsed = null;
            }
        }
        return { currentParsed: currentParsed, parsed: parsed };
    }
    getSeverityCode(severity) {
        let output = this.settings['c-cpp-flylint'].pclintplus.severityLevels[severity];
        return settings_1.VS_DiagnosticSeverity.from(output);
    }
}
exports.PclintPlus = PclintPlus;
//# sourceMappingURL=pclintplus.js.map