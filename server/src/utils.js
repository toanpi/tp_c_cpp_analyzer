"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = exports.RobustPromises = void 0;
var RobustPromises;
(function (RobustPromises) {
    async function retry(retries, delay, timeout, executor) {
        return new Promise((resolve, reject) => {
            const until = async () => {
                const failed = async () => {
                    // console.log(`Try timed out. Retrying...`);
                    if (--retries > 0)
                        setTimeout(until, delay);
                    else
                        reject();
                };
                var t = setTimeout(failed, timeout);
                try {
                    // console.log(`Try attempts are at ${retries}.`);
                    const result = await executor();
                    clearTimeout(t);
                    // console.log(`Try succeeded!`);
                    resolve(result);
                }
                catch (err) {
                    clearTimeout(t);
                    console.log(`Try caught an error. ${err}\nRetrying...`);
                    if (--retries > 0)
                        setTimeout(until, delay);
                    else
                        reject();
                }
            };
            setTimeout(until, delay); // primer
        });
    }
    RobustPromises.retry = retry;
})(RobustPromises = exports.RobustPromises || (exports.RobustPromises = {}));
function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}
exports.sleep = sleep;
//# sourceMappingURL=utils.js.map