"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Linter = exports.PathEnv = exports.fromLint = exports.toLint = exports.Lint = exports.headerExts = void 0;
/* eslint-disable no-console */
const which = require("which");
const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const cross_spawn = require("cross-spawn");
const substituteVariables = require('var-expansion').substituteVariables; // no types available
const slash = require('slash'); // no types available
exports.headerExts = ['.h', '.H', '.hh', '.hpp', '.h++', '.hxx'];
var Lint;
(function (Lint) {
    Lint[Lint["ON_SAVE"] = 1] = "ON_SAVE";
    Lint[Lint["ON_TYPE"] = 2] = "ON_TYPE";
    Lint[Lint["ON_BUILD"] = 3] = "ON_BUILD";
})(Lint = exports.Lint || (exports.Lint = {}));
function toLint(s) {
    switch (s) {
        case 'onSave': return Lint.ON_SAVE;
        case 'onType': return Lint.ON_TYPE;
        case 'onBuild': return Lint.ON_BUILD;
        default:
            throw Error('Unknown onLint value of ' + s);
    }
}
exports.toLint = toLint;
function fromLint(lint) {
    switch (lint) {
        case Lint.ON_SAVE: return 'ON_SAVE';
        case Lint.ON_TYPE: return 'ON_TYPE';
        case Lint.ON_BUILD: return 'ON_BUILD';
        default:
            throw Error('Unknown enum Lint value of ' + lint);
    }
}
exports.fromLint = fromLint;
class PathEnv {
    constructor() {
        this.paths = [];
        if (process.env.PATH) {
            this.paths = process.env.PATH.split(path.delimiter);
        }
    }
    append(p) {
        // assert(p.includes(path.delimiter) !== true);
        this.paths = this.deduplicate(this.paths.concat(...p));
    }
    prepend(p) {
        // assert(p.includes(path.delimiter) !== true);
        if (typeof p === 'string') {
            p = [p];
        }
        this.paths = this.deduplicate(p.concat(...this.paths));
    }
    deduplicate(array) {
        return Array.from(new Set(array));
    }
    toString() {
        return this.paths.join(path.delimiter);
    }
}
exports.PathEnv = PathEnv;
class Linter {
    constructor(name, settings, workspaceRoot, requireConfig) {
        this.executable = '';
        this.configFile = '';
        this.name = name;
        this.settings = settings;
        this.workspaceRoot = workspaceRoot;
        this.requireConfig = requireConfig;
        this.enabled = true;
        this.active = true;
        this.language = settings['c-cpp-flylint'].language;
        this.standard = settings['c-cpp-flylint'].standard;
        this.defines = settings['c-cpp-flylint'].defines;
        this.undefines = settings['c-cpp-flylint'].undefines;
        this.includePaths = settings['c-cpp-flylint'].includePaths;
    }
    cascadeCommonSettings(key) {
        let checkKey = (item) => {
            return this.settings['c-cpp-flylint'][key].hasOwnProperty(item) &&
                this.settings['c-cpp-flylint'][key].hasOwnProperty(item) !== null &&
                this.settings['c-cpp-flylint'][key][item] !== null;
        };
        let maybe = (orig, maybeKey) => {
            if (checkKey(maybeKey)) {
                if (_.isArray(orig)) {
                    return this.settings['c-cpp-flylint'][key][maybeKey];
                }
                else if (_.isString(orig)) {
                    return this.settings['c-cpp-flylint'][key][maybeKey];
                }
            }
            return orig;
        };
        this.language = maybe(this.language, 'language');
        this.standard = maybe(this.standard, 'standard');
        this.defines = maybe(this.defines, 'defines');
        this.undefines = maybe(this.undefines, 'undefines');
        this.includePaths = maybe(this.includePaths, 'includePaths');
    }
    setExecutable(fileName) {
        this.executable = fileName;
    }
    setConfigFile(fileName) {
        this.configFile = fileName;
    }
    Name() {
        return this.name;
    }
    isEnabled() {
        return this.enabled === true;
    }
    isActive() {
        return this.active === true;
    }
    enable() {
        this.enabled = true;
    }
    disable() {
        this.enabled = false;
    }
    lintOn() {
        return [Lint.ON_SAVE, Lint.ON_BUILD];
    }
    async initialize() {
        await this.maybeEnable().catch(() => {
            // empty
        });
        return this;
    }
    async maybeEnable() {
        if (!this.isEnabled()) {
            return Promise.resolve('');
        }
        return this.maybeExecutablePresent()
            .then((val) => {
            this.executable = val;
            return this.maybeConfigFilePresent();
        });
    }
    maybeExecutablePresent() {
        return new Promise((resolve, reject) => {
            let paths = new PathEnv();
            paths.prepend(path.resolve(__dirname, '../../..'));
            which(this.executable, { path: paths.toString() }, (err, result) => {
                if (err) {
                    this.disable();
                    if (this.settings['c-cpp-flylint'].debug) {
                        console.log(`The executable was not found for ${this.name}; looked for ${this.executable}`);
                    }
                    reject(Error(`The executable was not found for ${this.name}, disabling linter`));
                }
                else {
                    resolve(result);
                }
            });
        });
    }
    async maybeConfigFilePresent() {
        if (!this.requireConfig) {
            return Promise.resolve('');
        }
        return this.locateFile(this.workspaceRoot, this.configFile)
            .then((val) => {
            this.configFile = val;
            this.enable();
            return val;
        })
            .catch(() => {
            this.disable();
            console.log(`The configuration file was not found for ${this.name}; looked for ${this.configFile}`);
            throw Error(`could not locate configuration file for ${this.name}, disabling linter`);
        });
    }
    locateFile(directory, fileName) {
        return new Promise((resolve, reject) => {
            let parent = directory;
            do {
                directory = parent;
                const location = (() => {
                    if (path.isAbsolute(fileName)) {
                        return fileName;
                    }
                    else {
                        return path.join(directory, fileName);
                    }
                })();
                try {
                    fs.accessSync(location, fs.constants.R_OK);
                    resolve(location);
                }
                catch (e) {
                    // do nothing
                }
                parent = path.dirname(directory);
            } while (parent !== directory);
            reject('could not locate file within project workspace');
        });
    }
    locateFiles(directory, fileName) {
        var locates;
        locates = [];
        fileName.forEach(element => {
            locates.push(this.locateFile(directory, element));
        });
        return Promise.all(locates);
    }
    expandVariables(str) {
        process.env.workspaceRoot = this.workspaceRoot;
        process.env.workspaceFolder = this.workspaceRoot;
        let { value, error } = substituteVariables(str, { env: process.env });
        if (error) {
            return { error: error };
        }
        else if (value === '') {
            return { error: `Expanding '${str}' resulted in an empty string.` };
        }
        else {
            return { result: slash(value) };
        }
    }
    buildCommandLine(fileName, tmpFileName) {
        return [this.executable, fileName, tmpFileName];
    }
    runLinter(params, workspaceDir) {
        let cmd = params.shift() || this.executable;
        if (this.settings['c-cpp-flylint'].debug) {
            console.log('executing: ', cmd, params.join(' '));
        }
        return cross_spawn.sync(cmd, params, { 'cwd': workspaceDir, encoding: 'utf8' });
    }
    lint(fileName, directory, tmpFileName) {
        if (!this.enabled) {
            return [];
        }
        let result = this.runLinter(this.buildCommandLine(fileName, tmpFileName), directory || this.workspaceRoot);
        let stdout = result.stdout !== null ? result.stdout.replace(/\r/g, '').split('\n') : [];
        let stderr = result.stderr !== null ? result.stderr.replace(/\r/g, '').split('\n') : [];
        if (result.error) {
            console.error(result.error);
        }
        if (this.settings['c-cpp-flylint'].debug) {
            console.log(stdout);
            console.log(stderr);
        }
        if (result.status !== 0) {
            console.log(`${this.name} exited with status code ${result.status}`);
        }
        return this.parseLines(stdout.concat(stderr));
    }
    isQuote(ch) {
        return ch === '\'' || ch === '\"';
    }
    parseLines(lines) {
        let results = [];
        let currentParsed = null;
        lines.forEach(line => {
            if (this.isQuote(line.charAt(0))) {
                line = line.substr(1);
                if (this.isQuote(line.charAt(line.length - 1))) {
                    line = line.substr(0, line.length - 1);
                }
            }
            let parsed = this.parseLine(line);
            if (parsed) {
                // check for parse error
                if (parsed.parseError) {
                    if (this.settings['c-cpp-flylint'].ignoreParseErrors) {
                        console.log(parsed.parseError);
                        return;
                    }
                    else {
                        throw Error(parsed.parseError);
                    }
                }
                ({ currentParsed, parsed } = this.transformParse(currentParsed, parsed));
                if (currentParsed !== null && !currentParsed.parseError) {
                    // output an entry
                    results.push(currentParsed);
                }
                currentParsed = parsed;
            }
        });
        if (currentParsed !== null) {
            // output an entry
            results.push(currentParsed);
        }
        return results;
    }
    transformParse(currentParsed, parsed) {
        return { currentParsed: currentParsed, parsed: parsed };
    }
    parseLine(_line) {
        return null;
    }
    isValidLanguage(language) {
        const allowLanguages = ['c', 'c++'];
        return _.includes(allowLanguages, language);
    }
    getIncludePathParams() {
        let paths = this.includePaths;
        let params = [];
        if (paths) {
            _.each(paths, (element) => {
                let value = this.expandVariables(element);
                if (value.error) {
                    console.log(`Error expanding include path '${element}': ${value.error.message}`);
                }
                else {
                    params.push(`-I`);
                    params.push(`${value.result}`);
                }
            });
        }
        return params;
    }
    expandedArgsFor(key, joined, values, defaults) {
        let params = [];
        if (values) {
            _.each(values, (element) => {
                let value = this.expandVariables(element);
                if (value.error) {
                    console.log(`Error expanding '${element}': ${value.error.message}`);
                }
                else {
                    if (joined) {
                        params.push(`${key}${value.result}`);
                    }
                    else {
                        params.push(key);
                        params.push(`${value.result}`);
                    }
                }
            });
        }
        else if (defaults) {
            _.each(defaults, (element) => {
                let value = this.expandVariables(element);
                if (value.error) {
                    console.log(`Error expanding '${element}': ${value.error.message}`);
                }
                else {
                    if (joined) {
                        params.push(`${key}${value.result}`);
                    }
                    else {
                        params.push(key);
                        params.push(`${value.result}`);
                    }
                }
            });
        }
        return params;
    }
}
exports.Linter = Linter;
//# sourceMappingURL=linter.js.map