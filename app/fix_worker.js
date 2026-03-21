const fs = require('fs');
const path = './src/components/ClassSignPanel.vue';
let content = fs.readFileSync(path, 'utf8');

const w_old = \    const code = \\\
        let timer = null;
        self.addEventListener('message', (e) => {
            if (e.data === 'start') {
                if(timer) clearInterval(timer);
                // 3分钟 180000ms 轮询
                timer = setInterval(() => self.postMessage('tick'), 180000);
                self.postMessage('tick'); // 启动时立刻执行一次检查
            } else if (e.data === 'stop') {
                if(timer) clearInterval(timer);
                timer = null;
            }
        });
    \\\;\;

const w_new = \    const code = \\\
        let timer = null;
        self.addEventListener('message', (e) => {
            const data = e.data;
            if (data && data.type === 'schedule_tick') {
                if(timer) clearTimeout(timer);
                const delay = data.delay || 180000;
                timer = setTimeout(() => {
                    self.postMessage('tick');
                }, delay);
            } else if (data === 'start') {
                self.postMessage('tick'); // 启动时立刻执行一次检查
            } else if (data === 'stop') {
                if(timer) clearTimeout(timer);
                timer = null;
            }
        });
    \\\;\;

content = content.replace(w_old, w_new);

fs.writeFileSync(path, content);
console.log('Worker replaced.');
