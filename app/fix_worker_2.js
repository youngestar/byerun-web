const fs = require('fs');
const path = './src/components/ClassSignPanel.vue';
let content = fs.readFileSync(path, 'utf8');

const t2_old = \        addLog('请求状态接口失败，等待下次轮询', 'error');
        return;\;

const t2_new = \        addLog('请求状态接口失败，等待下次轮询', 'error');
        // 请求失败时，降级使用普通的较慢的轮询 (例如 10 分钟)，防止高频死循环报错
        if (worker) worker.postMessage({ type: 'schedule_tick', delay: 10 * 60 * 1000 });
        return;\;

content = content.replace(t2_old, t2_new);

const t3_old = \    // 没有活动，直接忽略
    if (!clubActivity.value || !clubActivity.value.activityId) return;\;

const t3_new = \    // 没有活动，直接忽略，进入慢速轮询模式(10分钟)
    if (!clubActivity.value || !clubActivity.value.activityId) {
        if (worker) worker.postMessage({ type: 'schedule_tick', delay: 10 * 60 * 1000 });
        return;
    }\;

content = content.replace(t3_old, t3_new);

fs.writeFileSync(path, content);
console.log('Worker replaced part 2.');
