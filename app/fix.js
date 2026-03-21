const fs = require('fs');
const path = './src/components/ClassSignPanel.vue';
let content = fs.readFileSync(path, 'utf8');

const i1 = 
const tryAutoLogin = async () => {
    const phone = userStore.userInfo?.phone;
    const pwdHash = userStore.userInfo?.pwdHash;
    if (!phone || !pwdHash) return false;

    try {
        addLog('检测到登录失效，尝试静默重新登录...', 'warning');
        const data = await authService.login(phone, pwdHash);
        if (data.code === 10000 && data.response?.oauthToken?.token) {
            userStore.setToken(data.response.oauthToken.token);
            addLog('【成功】账号已静默重新登录，恢复监听接管！', 'success');
            return true;
        }
    } catch (err) {
        addLog('自动重登发生网络或服务端错误', 'error');
    }
    return false;
};

const checkAndAutoSign = async () => {;

content = content.replace('const checkAndAutoSign = async () => {', i1);

const i2 = } catch (e: any) {
        if (e.message === 'AUTO_LOGIN_REQUIRED' || (e.message && e.message.match(/登录|过期|无效|失效/))) {
            const relogged = await tryAutoLogin();
            if (relogged) {
                return checkAndAutoSign(); // 静默重登成功，立即重试循环
            }
        }
        addLog('请求状态接口失败，等待下次轮询', 'error');
        return;
    };

content = content.replace(/\} catch \(e\) \{\s+addLog\('请求状态接口失败，等待下次轮询', 'error'\);\s+return;\s+\}/, i2);

// Make sure authService is imported
if (!content.includes('import authService')) {
    content = content.replace('import { userService }', 'import { userService, authService }');
}

fs.writeFileSync(path, content);
console.log('Fixed Vue file.');
