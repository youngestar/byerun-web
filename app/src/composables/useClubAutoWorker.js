import { ref, watch, onMounted, onUnmounted } from 'vue';

export function useClubAutoWorker({ studentId, api, signTask, loadSignTask, showMessage }) {
  const isExecutingAuto = ref(false);
  const runLogs = ref([]);
  const autoSignConfig = ref({
    enabled: false,
    signInOffset: 10,
    signBackOffset: 10,
  });

  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    runLogs.value.unshift({ time, msg, type });
    if (runLogs.value.length > 50) runLogs.value.pop();
    localStorage.setItem('clubAutoSignLogs', JSON.stringify(runLogs.value));
  };

  const clearLogs = () => {
    runLogs.value = [];
    localStorage.removeItem('clubAutoSignLogs');
  };

  const executeRetryTask = async (typeStr) => {
    isExecutingAuto.value = true;
    let attempt = 0;
    let success = false;
    const maxRetries = 5;

    addLog(`进入自动${typeStr === '1' ? '签到' : '签退'}环节，开始尝试...`, 'info');

    while (attempt <= maxRetries && !success) {
      if (attempt > 0) {
        const baseDelay = Math.pow(2, attempt) * 1000;
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;
        addLog(`重试(${attempt}/${maxRetries}): 等待 ${(delay / 1000).toFixed(1)} 秒`, 'info');
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      try {
        const currentTask = signTask.value;
        if (!currentTask) break;

        const lat = parseFloat(currentTask.latitude || '0');
        const lng = parseFloat(currentTask.longitude || '0');
        const jitterLat = (lat + (Math.random() - 0.5) * 0.0001).toFixed(6);
        const jitterLng = (lng + (Math.random() - 0.5) * 0.0001).toFixed(6);

        const response = await api.signInOrSignBack({
          activityId: currentTask.activityId,
          latitude: jitterLat,
          longitude: jitterLng,
          signType: typeStr,
          studentId: studentId.value,
        });

        const data = response?.data;
        const code = Number(data?.code);
        const isSuccess = code === 10000 || code === 1000;

        if (isSuccess) {
          if (data.response && data.response.status === '0') {
            addLog(`尝试被系统拒绝: ${data.response.message || data.msg || '未知'}`, 'error');
            break;
          } else {
            addLog(`【成功】 自动${typeStr === '1' ? '签到' : '签退'}顺利完成!`, 'success');
            success = true;
            if (typeStr === '2') {
              autoSignConfig.value.enabled = false;
              addLog('任务全部流转完毕，已为您自动停止托管并休眠', 'success');
            }
            await loadSignTask();
          }
        } else {
          addLog(`执行失败: ${data?.msg || '未知错误'}`, 'warning');
        }
      } catch (error) {
        addLog(`网络接口请求异常，准备重试`, 'error');
      }

      if (!success) attempt++;
    }

    if (!success && attempt > maxRetries) {
      addLog(`【失败】 已达到最大重试次数 ${maxRetries} 次，放弃当前自动执行。`, 'error');
    }
    isExecutingAuto.value = false;
  };

  const checkAndAutoSign = async () => {
    if (isExecutingAuto.value) return;
    if (!studentId.value) return;

    try {
      await loadSignTask();
    } catch (e) {
      addLog('请求状态接口失败，等待下次轮询', 'error');
      return;
    }

    const currentTask = signTask.value;
    if (!currentTask || !currentTask.activityId) return;

    const now = new Date().getTime();
    try {
      const parseTime = (timeStr) => {
        if (!timeStr) return NaN;
        let str = timeStr.replace(/-/g, '/');
        if (str.length <= 8) {
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, '0');
          const dd = String(today.getDate()).padStart(2, '0');
          str = `${yyyy}/${mm}/${dd} ${str}`;
        }
        return new Date(str).getTime();
      };

      const startTs = parseTime(currentTask.startTime);
      const endTs = parseTime(currentTask.endTime);

      if (isNaN(startTs) || isNaN(endTs)) {
        addLog('返回的时间格式无法自动解析，请检查', 'error');
        return;
      }

      const signInOffsetMs = autoSignConfig.value.signInOffset * 60 * 1000;
      const signBackOffsetMs = autoSignConfig.value.signBackOffset * 60 * 1000;

      if (now >= endTs - signBackOffsetMs && now <= endTs + signBackOffsetMs) {
        if (currentTask.signInStatus === '1' && currentTask.signStatus === '2') {
          await executeRetryTask('2');
          return;
        }
      }

      if (now >= startTs - signInOffsetMs && now <= startTs + signInOffsetMs) {
        if (currentTask.signStatus === '1') {
          await executeRetryTask('1');
        }
      }
    } catch (e) {
      addLog('时间解析异常，无法判断', 'error');
    }
  };

  let worker = null;

  const startWorker = () => {
    if (worker) return;
    const code = `
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
    `;
    const blob = new Blob([code], { type: 'application/javascript' });
    worker = new Worker(URL.createObjectURL(blob));
    worker.onmessage = (e) => {
      if (e.data === 'tick') {
        checkAndAutoSign();
      }
    };
    worker.postMessage('start');
    addLog('已开启自动检测 (WebWorker轮询中)', 'info');
  };

  const stopWorker = () => {
    if (worker) {
      worker.postMessage('stop');
      worker.terminate();
      worker = null;
      addLog('已关闭自动检测', 'warning');
    }
  };

  watch(
    autoSignConfig,
    (newVal) => {
      localStorage.setItem('clubAutoSignConfig', JSON.stringify(newVal));
      if (newVal.enabled) {
        startWorker();
      } else {
        stopWorker();
      }
    },
    { deep: true },
  );

  onMounted(() => {
    const savedConfig = localStorage.getItem('clubAutoSignConfig');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        autoSignConfig.value = { ...autoSignConfig.value, ...parsed };
      } catch (e) {}
    }

    const savedLogs = localStorage.getItem('clubAutoSignLogs');
    if (savedLogs) {
      try {
        runLogs.value = JSON.parse(savedLogs);
      } catch (e) {}
    }

    if (autoSignConfig.value.enabled) {
      startWorker();
    }
  });

  onUnmounted(() => {
    if (worker) {
      worker.postMessage('stop');
      worker.terminate();
      worker = null;
    }
  });

  return { autoSignConfig, isExecutingAuto, runLogs, clearLogs };
}
