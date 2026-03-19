p<template>
    <el-card class="class-sign-panel" v-loading="loading">
        <template #header>
            <h3>俱乐部活动签到</h3>
        </template>

        <div v-if="!clubActivity || !clubActivity.activityId">
            <div class="mb-4">当前暂无可签到/签退的活动记录</div>

            <!-- 如果当前没有正在进行的，展示可报名的列表库 -->
            <div class="mt-4 border-t pt-4">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h4 style="margin: 0;">可报名的活动:</h4>
                    <el-select v-model="selectedDate" size="small" style="width: 160px" @change="fetchDailyClubs">
                        <el-option v-for="item in dateOptions" :key="item.value" :label="item.label"
                            :value="item.value" />
                    </el-select>
                </div>

                <div v-if="availableClubs.length > 0">
                    <div v-for="club in availableClubs" :key="club.clubActivityId" class="club-avail-item mt-2">
                        <div style="display: flex; flex-direction: column;">
                            <span>{{ club.activityName }} ({{ club.signInStudent }}/{{ club.maxStudent }})</span>
                            <span class="text-gray-500 text-sm" style="margin-top: 4px;">{{ club.startTime }} ~ {{
                                club.endTime
                                }}</span>
                        </div>
                        <el-button size="small" type="success" :disabled="club.signInStudent >= club.maxStudent"
                            @click="handleJoinClub(club)">报名</el-button>
                    </div>
                </div>
                <div v-else class="text-gray-500 text-sm mt-2">该日暂无可参报的活动</div>
            </div>
        </div>

        <el-card v-else shadow="hover" class="mt-4">
            <h4>{{ clubActivity.activityName || '未知活动' }}</h4>
            <p>活动地点: {{ clubActivity.address || '-' }}</p>
            <p>开始时间: {{ clubActivity.startTime }} | 结束时间: {{ clubActivity.endTime }}</p>

            <p>
                签到状态: {{ clubActivity.signInStatus === '1' ? '已签到' : '未签到' }}
                <span v-if="clubActivity.signInTime"> ({{ clubActivity.signInTime }})</span>
            </p>
            <p>签退状态: {{ clubActivity.signBackStatus === '1' ? '已签退' : '未签退' }}</p>

            <!-- 动作按钮 -->
            <div class="mt-4">
                <el-button type="primary" :disabled="!canSignIn" @click="handleSign('1')">
                    一键签到
                </el-button>
                <el-button type="warning" :disabled="!canSignBack" @click="handleSign('2')">
                    一键签退
                </el-button>
            </div>

            <!-- 自动签到托管设置 -->
            <el-divider style="margin: 16px 0;" />
            <div class="auto-sign-settings">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h4 style="margin: 0;">🚀 自动签到/签退托管</h4>
                    <el-switch v-model="autoSignConfig.enabled" active-text="已开启" inactive-text="未开启" />
                </div>
                <div v-if="autoSignConfig.enabled" class="text-sm text-gray-500" style="margin-top: 8px;">
                    运行中：Web Worker多线程轮询。建议手机端保持屏幕常亮不切出本页，以防系统强制杀进程。
                </div>
                <div style="margin-top: 12px; display: flex; align-items: center; justify-content: space-between;">
                    <span class="text-sm">签到允许窗口 (正负分钟): </span>
                    <el-input-number v-model="autoSignConfig.signInOffset" :min="1" :max="60" size="small" />
                </div>
                <div style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
                    <span class="text-sm">签退允许窗口 (正负分钟): </span>
                    <el-input-number v-model="autoSignConfig.signBackOffset" :min="1" :max="60" size="small" />
                </div>
            </div>

            <!-- 运行日志 -->
            <div class="mt-4" style="background: #f9fafc; border-radius: 4px; padding: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <h5 style="margin: 0;">📋 执行日志</h5>
                    <el-button size="small" type="danger" link @click="clearLogs">清空日志</el-button>
                </div>
                <div style="max-height: 150px; overflow-y: auto; font-size: 13px; line-height: 1.6;">
                    <div v-for="(log, idx) in runLogs" :key="idx" :class="['log-' + log.type]"
                        style="margin-bottom: 4px;">
                        <span style="color: #9ca3af;">[{{ log.time }}]</span> {{ log.msg }}
                    </div>
                    <div v-if="!runLogs.length" style="color: #9ca3af; text-align: center; padding: 10px 0;">暂无日志记录
                    </div>
                </div>
            </div>
        </el-card>

        <div class="mt-8 pt-4 border-t">
            <!-- 顺带把体育课信息只做展示 -->
            <h4>我的体育课考勤任务 (仅查看)</h4>
            <div v-if="classList.length === 0" class="text-gray-500 text-sm mt-2">无体育课打卡任务</div>
            <div v-for="item in classList" :key="item.classLearnId" class="text-sm mt-2">
                🔴 {{ item.sportsClassName }} ({{ item.startTime }} - {{ item.endTime }})
            </div>
        </div>
    </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted } from 'vue';
import { userService } from '@/services/user';
import { useUserStore } from '@/stores/user';
import { ElMessage } from 'element-plus';
import type { SportsClassClocking, SignInTf, ClubInfo } from '@/types/api';

const loading = ref(false);
const clubActivity = ref<SignInTf | null>(null);
const classList = ref<SportsClassClocking[]>([]);
const availableClubs = ref<ClubInfo[]>([]);
const userStore = useUserStore();

// ======= 新增：自动签到相关 =======
const isExecutingAuto = ref(false);
const autoSignConfig = ref({
    enabled: false,
    signInOffset: 10,
    signBackOffset: 10
});

interface LogItem {
    time: string;
    msg: string;
    type: 'success' | 'warning' | 'error' | 'info';
}
const runLogs = ref<LogItem[]>([]);

const addLog = (msg: string, type: LogItem['type'] = 'info') => {
    const time = new Date().toLocaleTimeString();
    runLogs.value.unshift({ time, msg, type });
    if (runLogs.value.length > 50) runLogs.value.pop();
    localStorage.setItem('autoSignLogs', JSON.stringify(runLogs.value));
};

const clearLogs = () => {
    runLogs.value = [];
    localStorage.removeItem('autoSignLogs');
};

let worker: Worker | null = null;
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

watch(autoSignConfig, (newVal) => {
    localStorage.setItem('autoSignConfig', JSON.stringify(newVal));
    if (newVal.enabled) {
        startWorker();
    } else {
        stopWorker();
    }
}, { deep: true });

const executeRetryTask = async (type: "1" | "2") => {
    isExecutingAuto.value = true;
    let attempt = 0;
    let success = false;
    const maxRetries = 5;

    addLog(`进入自动${type === '1' ? '签到' : '签退'}环节，开始尝试...`, 'info');

    while (attempt <= maxRetries && !success) {
        if (attempt > 0) {
            const baseDelay = Math.pow(2, attempt) * 1000;
            const jitter = Math.random() * 1000;
            const delay = baseDelay + jitter;
            addLog(`重试(${attempt}/${maxRetries}): 等待 ${(delay / 1000).toFixed(1)} 秒`, 'info');
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        try {
            const lat = parseFloat(clubActivity.value!.latitude || '0');
            const lng = parseFloat(clubActivity.value!.longitude || '0');
            const jitterLat = (lat + (Math.random() - 0.5) * 0.0001).toFixed(6);
            const jitterLng = (lng + (Math.random() - 0.5) * 0.0001).toFixed(6);

            const response = await userService.signInOrSignBack({
                activityId: clubActivity.value!.activityId,
                latitude: jitterLat,
                longitude: jitterLng,
                signType: type,
                studentId: userStore.userInfo!.studentId
            });

            if (response.code === 10000) {
                if (response.response && response.response.status === '0') {
                    addLog(`尝试被系统拒绝: ${response.response.message}`, 'error');
                    break; // 被封禁或者限制等业务级错误，不再重试
                } else {
                    addLog(`【成功】 自动${type === '1' ? '签到' : '签退'}顺利完成!`, 'success');
                    success = true;
                    // 如果完成了签退，由于不再需要轮询，自动关闭开关
                    if (type === '2') {
                        autoSignConfig.value.enabled = false;
                        addLog('任务全部流转完毕，已为您自动停止托管并休眠', 'success');
                    }
                    await fetchActivities(); // 同步 UI 状态
                }
            } else {
                addLog(`执行失败: ${response.msg}`, 'warning');
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
    const studentId = userStore.userInfo?.studentId;
    if (!studentId) return;

    // 获取最新状态
    try {
        const res = await userService.getSignInTf(studentId);
        clubActivity.value = res.response || null;
    } catch (e) {
        addLog('请求状态接口失败，等待下次轮询', 'error');
        return;
    }

    // 没有活动，直接忽略
    if (!clubActivity.value || !clubActivity.value.activityId) return;

    const now = new Date().getTime();
    try {
        // "2023-11-17 08:00:00" 或者仅 "08:00" -> 转换为跨平台毫秒级真实时间戳
        const parseTime = (timeStr: string) => {
            if (!timeStr) return NaN;
            let str = timeStr.replace(/-/g, '/');
            if (str.length <= 8) { // 兼容可能是 "08:00:00" 或 "08:00" 这种无日期情况
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                str = `${yyyy}/${mm}/${dd} ${str}`;
            }
            return new Date(str).getTime();
        };

        const startTs = parseTime(clubActivity.value.startTime);
        const endTs = parseTime(clubActivity.value.endTime);

        if (isNaN(startTs) || isNaN(endTs)) {
            addLog('返回的时间格式无法自动解析，请检查', 'error');
            return;
        }
        const signInOffsetMs = autoSignConfig.value.signInOffset * 60 * 1000;
        const signBackOffsetMs = autoSignConfig.value.signBackOffset * 60 * 1000;

        // 【判断签退】：如果时间满足签退，并且当前需要签退 (signInStatus 已签到且 signStatus 等待签退)
        if (now >= endTs - signBackOffsetMs && now <= endTs + signBackOffsetMs) {
            if (clubActivity.value.signInStatus === '1' && clubActivity.value.signStatus === '2') {
                await executeRetryTask('2');
                return; // 如果进入签退流程，不进行签到
            }
        }

        // 【判断签到】：如果时间满足签到，并且当前需要签到 (signStatus === '1')
        if (now >= startTs - signInOffsetMs && now <= startTs + signInOffsetMs) {
            if (clubActivity.value.signStatus === '1') {
                await executeRetryTask('1');
            }
        }
    } catch (e) {
        addLog('时间解析异常，无法判断。', 'error');
    }
};

// 日期选择相关
const selectedDate = ref('');
const dateOptions = ref<{ label: string, value: string }[]>([]);

const initDateOptions = () => {
    const options = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const val = `${year}-${month}-${day}`;
        let label = val;
        if (i === 0) label = `今天 (${val})`;
        else if (i === 1) label = `明天 (${val})`;
        else if (i === 2) label = `后天 (${val})`;
        options.push({ label, value: val });
    }
    dateOptions.value = options;
    selectedDate.value = options[0].value;
};
initDateOptions();

const fetchDailyClubs = async (dateStr: string) => {
    if (!userStore.userInfo?.studentId || !userStore.userInfo?.schoolId) return;
    loading.value = true;
    try {
        const clubRes = await userService.getActivityList(
            userStore.userInfo.studentId,
            dateStr,
            userStore.userInfo.schoolId
        );
        let allClubs = clubRes.response || [];
        // 按照开始时间排序
        allClubs.sort((a, b) => new Date(a.startTime.replace(/-/g, '/')).getTime() - new Date(b.startTime.replace(/-/g, '/')).getTime());
        availableClubs.value = allClubs;
    } catch (error) {
        ElMessage.error("获取活动列表失败");
    }
    loading.value = false;
};

// 严格还原 AutoRun 的状态判定机
const canSignIn = computed(() => {
    return clubActivity.value?.signStatus === '1';
});

const canSignBack = computed(() => {
    return clubActivity.value?.signInStatus === '1' && clubActivity.value?.signStatus === '2';
});

const fetchActivities = async () => {
    loading.value = true;
    try {
        const studentId = userStore.userInfo?.studentId;
        if (studentId) {
            const res = await userService.getSignInTf(studentId);
            clubActivity.value = res.response || null;

            // 如果没有正在进行的俱乐部活动，则拉取可以报名的列表
            if (!clubActivity.value || !clubActivity.value.activityId) {
                // 默认加载选中的单天日期
                await fetchDailyClubs(selectedDate.value);
            }
        }

        // 顺带拉取一下体育课纯展示
        const classRes = await userService.getMySportsClassClocking();
        classList.value = classRes.response || [];
    } catch (e) {
        ElMessage.error("获取考勤数据失败");
    }
    loading.value = false;
};

const handleJoinClub = async (club: ClubInfo) => {
    if (!userStore.userInfo?.studentId) {
        ElMessage.error("未获取到当前用户信息");
        return;
    }

    loading.value = true;
    try {
        const res = await userService.joinClubActivity(
            userStore.userInfo.studentId,
            club.clubActivityId
        );

        if (res.code === 10000) {
            if (res.response && res.response.status === '0') {
                ElMessage.warning(res.response.message || "报名限制：操作失败");
            } else {
                ElMessage.success(res.response?.message || "报名成功！");
                await fetchActivities(); // 刷新状态，此时应该能拿到进行中的俱乐部活动了
            }
        } else {
            ElMessage.warning(`报名异常：${res.msg}`);
        }
    } catch (error) {
        ElMessage.error("报名请求失败");
    }
    loading.value = false;
};

const handleSign = async (type: "1" | "2") => {
    if (isExecutingAuto.value) {
        ElMessage.warning('正在自动执行中，请稍后手动操作或先关闭自动托管');
        return;
    }
    if (!clubActivity.value || !clubActivity.value.activityId) return;

    const lat = parseFloat(clubActivity.value.latitude || '0');
    const lng = parseFloat(clubActivity.value.longitude || '0');

    if (!lat || !lng) {
        ElMessage.warning('未能获取到目标的经纬度信息，无法签到');
        return;
    }

    // 增加微小随机偏移 (防止精准坐标打死被查)
    const jitterLat = (lat + (Math.random() - 0.5) * 0.0001).toFixed(6);
    const jitterLng = (lng + (Math.random() - 0.5) * 0.0001).toFixed(6);

    if (!userStore.userInfo?.studentId) {
        ElMessage.error("未获取到当前用户信息");
        return;
    }

    try {
        const response = await userService.signInOrSignBack({
            activityId: clubActivity.value.activityId,
            latitude: jitterLat,
            longitude: jitterLng,
            signType: type,
            studentId: userStore.userInfo.studentId
        });

        if (response.code === 10000) {
            ElMessage.success(type === '1' ? "签到成功!" : "签退成功!");
            await fetchActivities(); // 刷新状态
        } else {
            ElMessage.warning(`操作异常：${response.msg}`);
        }
    } catch (error) {
        ElMessage.error("发送网络请求失败");
    }
};

onMounted(() => {
    fetchActivities();

    // 恢复配置
    const savedConfig = localStorage.getItem('autoSignConfig');
    if (savedConfig) {
        try {
            const parsed = JSON.parse(savedConfig);
            autoSignConfig.value = { ...autoSignConfig.value, ...parsed };
        } catch (e) { }
    }

    // 恢复历史日志
    const savedLogs = localStorage.getItem('autoSignLogs');
    if (savedLogs) {
        try {
            runLogs.value = JSON.parse(savedLogs);
        } catch (e) { }
    }

    // 若开启则恢复调度任务
    if (autoSignConfig.value.enabled) {
        startWorker();
    }
});

onUnmounted(() => {
    // 组件卸载时自动清理内存中的 Worker
    stopWorker();
});
</script>

<style scoped>
.log-success {
    color: #10b981;
}

.log-warning {
    color: #f59e0b;
}

.log-error {
    color: #ef4444;
}

.log-info {
    color: #3b82f6;
}

.class-sign-panel {
    margin-bottom: 20px;
}

.club-avail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background-color: #f9fafc;
    border-radius: 4px;
}

.mt-2 {
    margin-top: 8px;
}

.mt-4 {
    margin-top: 16px;
}

.mt-8 {
    margin-top: 32px;
}

.pt-4 {
    padding-top: 16px;
}

.border-t {
    border-top: 1px solid #eee;
}

.text-sm {
    font-size: 14px;
}

.text-gray-500 {
    color: #6b7280;
}
</style>
