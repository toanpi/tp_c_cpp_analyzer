"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Clang = void 0;
const path = require("path");
const settings_1 = require("../settings");
const linter_1 = require("./linter");
const node_1 = require("vscode-languageserver/node");
class Clang extends linter_1.Linter {
    constructor(settings, workspaceRoot) {
        super('Clang', settings, workspaceRoot, false);
        this.actualFileName = '';
        this.tmpFileName = '';
        this.cascadeCommonSettings('clang');
        this.executable = settings['c-cpp-flylint'].clang.executable;
        this.configFile = settings['c-cpp-flylint'].clang.configFile;
        this.active = this.enabled = settings['c-cpp-flylint'].clang.enable;
    }
    lintOn() {
        return [linter_1.Lint.ON_SAVE, linter_1.Lint.ON_TYPE, linter_1.Lint.ON_BUILD];
    }
    buildCommandLine(fileName, tmpFileName) {
        let includePathParams = this.getIncludePathParams();
        let languageParam = this.getLanguageParam();
        let iquoteParams;
        if (this.settings['c-cpp-flylint'].run === 'onType') {
            iquoteParams = this.expandedArgsFor('-iquote', false, [path.dirname(fileName)].concat(this.includePaths), null);
        }
        else {
            iquoteParams = [];
        }
        let pedanticParams = this.getPedanticParams();
        let msExtensions = this.settings['c-cpp-flylint'].clang.msExtensions ?
            ['-fms-extensions'] : [];
        let noExceptions = this.settings['c-cpp-flylint'].clang.noExceptions ?
            ['-fno-exceptions'] : [];
        let noRtti = this.settings['c-cpp-flylint'].clang.noRtti ?
            ['-fno-rtti'] : [];
        let blocks = this.settings['c-cpp-flylint'].clang.blocks ?
            ['-fblocks'] : [];
        let includeArgParams = this.expandedArgsFor('-include', false, this.settings['c-cpp-flylint'].clang.includes, null);
        let warningsParams = this.expandedArgsFor('-W', true, this.settings['c-cpp-flylint'].clang.warnings, null);
        let standardParams = this.expandedArgsFor('--std=', true, this.standard, ['c11', 'c++11']);
        let standardLibParams = this.expandedArgsFor('--stdlib=', true, this.settings['c-cpp-flylint'].clang.standardLibs, null);
        let defineParams = this.expandedArgsFor('-D', true, this.defines, null);
        let undefineParams = this.expandedArgsFor('-U', true, this.undefines, null);
        let args = [
            this.executable,
            '-fsyntax-only',
            '-fno-color-diagnostics',
            '-fno-caret-diagnostics',
            '-fno-diagnostics-show-option',
            '-fdiagnostics-show-category=name',
            '-ferror-limit=200'
        ]
            .concat(iquoteParams)
            .concat(standardParams)
            .concat(pedanticParams)
            .concat(standardLibParams)
            .concat(msExtensions)
            .concat(noExceptions)
            .concat(noRtti)
            .concat(blocks)
            .concat(includeArgParams)
            .concat(warningsParams)
            .concat(defineParams)
            .concat(undefineParams)
            .concat(includePathParams)
            .concat(languageParam)
            .concat(this.settings['c-cpp-flylint'].clang.extraArgs || []);
        if (this.settings['c-cpp-flylint'].run === 'onType') {
            args.push(tmpFileName);
        }
        else {
            args.push(fileName);
        }
        this.actualFileName = fileName;
        this.tmpFileName = tmpFileName;
        return args;
    }
    parseLine(line) {
        let regex = /^(.+?):([0-9]+):([0-9]+):\s(fatal|error|warning|note)(?: error)?:\s(.*)$/;
        let regexArray;
        if (line === '') {
            // skip this line
            return null;
        }
        let excludeRegex = /^(WX.*|_WX.*|__WX.*|Q_.*|warning: .* incompatible with .*|warning: .* input unused|warning: include location .* is unsafe for cross-compilation.*)$/;
        if (excludeRegex.exec(line) !== null) {
            // skip this line
            return null;
        }
        let inFileArray;
        let inFileRegex = /^In file included from (.+?):([0-9]+):$/;
        if ((inFileArray = inFileRegex.exec(line)) !== null) {
            return {
                fileName: (inFileArray[1] === this.tmpFileName ? this.actualFileName : inFileArray[1]),
                line: parseInt(inFileArray[2]) - 1,
                column: 0,
                severity: node_1.DiagnosticSeverity.Warning,
                code: 0,
                message: 'Issues in file included from here',
                source: this.name
            };
        }
        if ((regexArray = regex.exec(line)) !== null) {
            return {
                fileName: (regexArray[1] === this.tmpFileName ? this.actualFileName : regexArray[1]),
                line: parseInt(regexArray[2]) - 1,
                column: parseInt(regexArray[3]) - 1,
                severity: this.getSeverityCode(regexArray[4]),
                code: 0,
                message: regexArray[5],
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
        let output = this.settings['c-cpp-flylint'].clang.severityLevels[severity];
        return settings_1.VS_DiagnosticSeverity.from(output);
    }
    getPedanticParams() {
        let params = [];
        if (this.settings['c-cpp-flylint'].clang.pedantic) {
            params.push(`-pedantic`);
        }
        if (this.settings['c-cpp-flylint'].clang.pedanticErrors) {
            params.push(`-pedantic-errors`);
        }
        return params;
    }
    getLanguageParam() {
        let language = this.language;
        let params = [];
        if (this.isValidLanguage(language)) {
            params.push(`-x`);
            params.push(`${language}`);
        }
        return params;
    }
}
exports.Clang = Clang;
//# sourceMappingURL=clang.js.map