const fs = require('fs');
const path = 'd:/我滴作业/摸点东西玩玩/byerun-web/app/src/components/ClassSignPanel.vue';
let content = fs.readFileSync(path, 'utf8');

const inject1 = 
  const tryAutoLogin = async (): Promise<boolean> => {
      const phone = userStore.userInfo?.phone;
      const pwdHash = userStore.userInfo?.pwdHash;
      if (!phone || !pwdHash) return false;

      try {
          addLog('检测到登录失效，尝试静默重新登录...', 'warning');
          const data = await authService.login(phone, pwdHash);
          if (data.code === 10000 && data.response?.oauthToken?.token) {
              userStore.setToken(data.response.oauthToken.token);
              addLog('【成功】账号已重新登录，恢复监听！', 'success');
              return true;
          }
      } catch (err) {
          addLog('自动重登发生网络或服务端错误', 'error');
      }
      return false;
  };

  const checkAndAutoSign = async () => {;

content = content.replace('  const checkAndAutoSign = async () => {', inject1);

const search2 =       } catch (e) {
          addLog('请求状态接口失败，等待下次轮询', 'error');
          return;
      };
const inject2 =       } catch (e: any) {
          if (e.message === 'AUTO_LOGIN_REQUIRED' || (e.message && e.message.match(/登录|过期|无效|失效/))) {
              const relogged = await tryAutoLogin();
              if (relogged) {
                  return checkAndAutoSign(); // 立即重试
              }
          }
          addLog('请求状态接口失败，等待下次轮询: ' + (e.message || ''), 'error');
          return;
      };

content = content.replace(search2, inject2);
fs.writeFileSync(path, content);
console.log('Script updated');
