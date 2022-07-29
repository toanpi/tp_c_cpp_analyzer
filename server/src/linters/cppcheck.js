"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CppCheck = void 0;
const _ = require("lodash");
const settings_1 = require("../settings");
const linter_1 = require("./linter");
const node_1 = require("vscode-languageserver/node");
class CppCheck extends linter_1.Linter {
    constructor(settings, workspaceRoot) {
        super('CppCheck', settings, workspaceRoot, false);
        this.cascadeCommonSettings('cppcheck');
        this.executable = settings['c-cpp-flylint'].cppcheck.executable;
        this.configFile = settings['c-cpp-flylint'].cppcheck.configFile;
        this.active = this.enabled = settings['c-cpp-flylint'].cppcheck.enable;
    }
    buildCommandLine(fileName, _tmpFileName) {
        let enableParams = this.settings['c-cpp-flylint'].cppcheck.unusedFunctions
            ? ['--enable=warning,style,performance,portability,information,unusedFunction']
            : ['--enable=warning,style,performance,portability,information'];
        let addonParams = this.getAddonParams();
        let includeParams = this.getIncludePathParams();
        let suppressionParams = this.getSuppressionParams();
        let languageParam = this.getLanguageParam();
        let platformParams = this.getPlatformParams();
        let standardParams = this.expandedArgsFor('--std=', true, this.standard, ['c11', 'c++11']);
        let defineParams = this.expandedArgsFor('-D', true, this.defines, null);
        let undefineParams = this.expandedArgsFor('-U', true, this.undefines, null);
        let args = [this.executable]
            .concat(['--inline-suppr'])
            .concat(enableParams)
            .concat(addonParams)
            .concat(includeParams)
            .concat(standardParams)
            .concat(defineParams)
            .concat(undefineParams)
            .concat(suppressionParams)
            .concat(languageParam)
            .concat([platformParams])
            .concat([`--template="{file}  {line}  {severity} {id}: {message}"`])
            .concat(this.settings['c-cpp-flylint'].cppcheck.extraArgs || []);
        if (this.settings['c-cpp-flylint'].cppcheck.verbose === true) {
            args.push('--verbose');
        }
        if (this.settings['c-cpp-flylint'].cppcheck.force) {
            args.push('--force');
        }
        if (this.settings['c-cpp-flylint'].cppcheck.inconclusive === true) {
            args.push('--inconclusive');
        }
        args.push(fileName);
        return args;
    }
    parseLine(line) {
        let regex = /^(.+?)\s\s([0-9]+)\s([0-9]+\s)?\s(style|information|portability|performance|warning|error)\s(.+?):\s(.*)$/;
        let regexArray;
        let excludeRegex = /^((Checking |Defines:|Undefines:|Includes:|Platform:|.*information missingInclude.*).*|cppcheck: .*. Disabling .* check.|)$/;
        if (excludeRegex.exec(line) !== null) {
            // skip this line
            return null;
        }
        if ((regexArray = regex.exec(line)) !== null) {
            return {
                fileName: regexArray[1],
                line: parseInt(regexArray[2]) - 1,
                column: parseInt(regexArray[3]) || 0,
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
        let output = this.settings['c-cpp-flylint'].cppcheck.severityLevels[severity];
        return settings_1.VS_DiagnosticSeverity.from(output);
    }
    isValidPlatform(platform) {
        const allowedPlatforms = ['avr8', 'unix32', 'unix64', 'win32A', 'win32W', 'win64', 'native'];
        return _.includes(allowedPlatforms, platform);
    }
    getPlatformParams() {
        let platform = this.settings['c-cpp-flylint'].cppcheck.platform;
        if (platform) {
            if (!this.isValidPlatform(platform)) {
                return '--platform=native';
            }
            return `--platform=${platform}`;
        }
        return '--platform=native';
    }
    getSuppressionParams() {
        let suppressions = this.settings['c-cpp-flylint'].cppcheck.suppressions;
        let params = [];
        if (suppressions) {
            _.each(suppressions, (element) => {
                params.push(`--suppress=${element}`);
            });
        }
        return params;
    }
    getLanguageParam() {
        let language = this.language;
        let params = [];
        if (this.isValidLanguage(language)) {
            params.push(`--language=${language}`);
        }
        return params;
    }
    getAddonParams() {
        let addons = this.settings['c-cpp-flylint'].cppcheck.addons;
        let params = [];
        if (addons) {
            _.each(addons, (element) => {
                params.push(`--addon=${element}`);
            });
        }
        return params;
    }
}
exports.CppCheck = CppCheck;
//# sourceMappingURL=cppcheck.js.map