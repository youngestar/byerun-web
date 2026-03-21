const fs = require('fs');
const path = './src/components/ClassSignPanel.vue';
let content = fs.readFileSync(path, 'utf8');

const t4_old = '        const signInOffsetMs = autoSignConfig.value.signInOffset * 60 * 1000;\n        const signBackOffsetMs = autoSignConfig.value.signBackOffset * 60 * 1000;';

const t4_new = '        const signInOffsetMs = autoSignConfig.value.signInOffset * 60 * 1000;\n        const signBackOffsetMs = autoSignConfig.value.signBackOffset * 60 * 1000;\n\n        // 【动态轮询计算】：距离任何一个目标时间（签到/签退）的最短时间差\n        let minDeltaMs = Infinity;\n        if (clubActivity.value.signStatus === \\'1\\') {\n            minDeltaMs = Math.min(minDeltaMs, Math.abs(startTs - now));\n        } else if (clubActivity.value.signInStatus === \\'1\\' && clubActivity.value.signStatus === \\'2\\') {\n            minDeltaMs = Math.min(minDeltaMs, Math.abs(endTs - now));\n        }';

content = content.replace(t4_old, t4_new);

const t5_old = '        if (now >= startTs - signInOffsetMs && now <= startTs + signInOffsetMs) {\n            if (clubActivity.value.signStatus === \\'1\\') {\n                await executeRetryTask(\\'1\\');\n            }\n        }\n    } catch (e) {\n        addLog(\\'时间解析异常，无法判断。\\', \\'error\\');\n    }';

const t5_new = '        if (now >= startTs - signInOffsetMs && now <= startTs + signInOffsetMs) {\n            if (clubActivity.value.signStatus === \\'1\\') {\n                await executeRetryTask(\\'1\\');\n                // 签到完成后，规划下一次轮询来拉取最新状态（变成待签退），可以稍微快点（比如直接等1分钟后再拉）\n                if (worker) worker.postMessage({ type: \\'schedule_tick\\', delay: 60 * 1000 });\n                return;\n            }\n        }\n\n        // 常规动态调度下一个 tick\n        if (worker) {\n            let nextDelayMs = 10 * 60 * 1000; // 默认 10 分钟 (慢速模式)\n            if (minDeltaMs <= 15 * 60 * 1000) {\n                // 当距离目标时间差 <= 15分钟 时，进入冲刺/活跃模式，每 3 分钟拉取一次\n                nextDelayMs = 3 * 60 * 1000;\n            }\n            if (isExecutingAuto.value === false) {\n                 worker.postMessage({ type: \\'schedule_tick\\', delay: nextDelayMs });\n            }\n        }\n\n    } catch (e) {\n        addLog(\\'时间解析异常，无法判断。\\', \\'error\\');\n        if (worker) worker.postMessage({ type: \\'schedule_tick\\', delay: 10 * 60 * 1000 });\n    }';

content = content.replace(t5_old, t5_new);

fs.writeFileSync(path, content);
console.log('Worker replaced part 3 again.');
