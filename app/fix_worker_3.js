const fs = require('fs');
const path = './src/components/ClassSignPanel.vue';
let content = fs.readFileSync(path, 'utf8');

const t4_old = \        const signInOffsetMs = autoSignConfig.value.signInOffset * 60 * 1000;
        const signBackOffsetMs = autoSignConfig.value.signBackOffset * 60 * 1000;\;

const t4_new = \        const signInOffsetMs = autoSignConfig.value.signInOffset * 60 * 1000;
        const signBackOffsetMs = autoSignConfig.value.signBackOffset * 60 * 1000;

        // 【动态轮询计算】：距离任何一个目标时间（签到/签退）的最短时间差
        let minDeltaMs = Infinity;
        if (clubActivity.value.signStatus === '1') {
            minDeltaMs = Math.min(minDeltaMs, Math.abs(startTs - now));
        } else if (clubActivity.value.signInStatus === '1' && clubActivity.value.signStatus === '2') {
            minDeltaMs = Math.min(minDeltaMs, Math.abs(endTs - now));
        }\;

content = content.replace(t4_old, t4_new);

const t5_old = \        if (now >= startTs - signInOffsetMs && now <= startTs + signInOffsetMs) {
            if (clubActivity.value.signStatus === '1') {
                await executeRetryTask('1');
            }
        }
    } catch (e) {
        addLog('时间解析异常，无法判断。', 'error');
    }\;

const t5_new = \        if (now >= startTs - signInOffsetMs && now <= startTs + signInOffsetMs) {
            if (clubActivity.value.signStatus === '1') {
                await executeRetryTask('1');
                // 签到完成后，规划下一次轮询来拉取最新状态（变成待签退），可以稍微快点（比如直接等1分钟后再拉）
                if (worker) worker.postMessage({ type: 'schedule_tick', delay: 60 * 1000 });
                return;
            }
        }

        // 常规动态调度下一个 tick
        if (worker) {
            let nextDelayMs = 10 * 60 * 1000; // 默认 10 分钟 (慢速模式)
            if (minDeltaMs <= 15 * 60 * 1000) {
                // 当距离目标时间差 <= 15分钟 时，进入冲刺/活跃模式，每 3 分钟拉取一次
                nextDelayMs = 3 * 60 * 1000;
                // addLog('已进入活动临近区间，调整为高频监测模式...', 'info');
            }
            if (isExecutingAuto.value === false) {
                 worker.postMessage({ type: 'schedule_tick', delay: nextDelayMs });
            }
        }

    } catch (e) {
        addLog('时间解析异常，无法判断。', 'error');
        if (worker) worker.postMessage({ type: 'schedule_tick', delay: 10 * 60 * 1000 });
    }\;

content = content.replace(t5_old, t5_new);

fs.writeFileSync(path, content);
console.log('Worker replaced part 3.');
