"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VS_DiagnosticSeverity = exports.propertiesPlatform = void 0;
const _ = require("lodash");
const os = require("os");
const node_1 = require("vscode-languageserver/node");
function propertiesPlatform() {
    switch (os.platform()) {
        case 'darwin': return 'Mac';
        case 'linux': return 'Linux';
        case 'win32': return 'Win32';
        default:
            throw RangeError(`Unsupported operating system; no entry for ${os.platform()}`);
    }
}
exports.propertiesPlatform = propertiesPlatform;
var VS_DiagnosticSeverity;
(function (VS_DiagnosticSeverity) {
    function from(value) {
        if (_.isNumber(value)) {
            return value;
        }
        if (!_.isString(value)) {
            throw TypeError(`The diagnostic code ${value} was neither a number nor string!`);
        }
        switch (value) {
            case 'Error': return node_1.DiagnosticSeverity.Error;
            case 'Warning': return node_1.DiagnosticSeverity.Warning;
            case 'Information': return node_1.DiagnosticSeverity.Information;
            case 'Hint': return node_1.DiagnosticSeverity.Hint;
            default:
                throw RangeError(`The diagnostic code ${value} has no mapping to DiagnosticSeverty.`);
        }
    }
    VS_DiagnosticSeverity.from = from;
})(VS_DiagnosticSeverity = exports.VS_DiagnosticSeverity || (exports.VS_DiagnosticSeverity = {}));
;
//# sourceMappingURL=settings.js.map