const fs = require('fs');
const path = './src/utils/request.ts';
let content = fs.readFileSync(path, 'utf8');

const t1 = \        // 处理业务错误
        if (code !== 10000) {
          // token 过期或无效
          if (
            code === 401 ||
            (code === 1000 && msg && !!msg.match(/登录|过期|无效|失效/))
          ) {
            const userDataStr = localStorage.getItem("userData");
            if (userDataStr) {
              const userData = JSON.parse(userDataStr);
              if (userData.phone && userData.pwdHash) {
                console.log("检测到登录失效，阻断跳转，抛出以供静默重登");
                localStorage.removeItem("token");
                return Promise.reject(new Error("AUTO_LOGIN_REQUIRED"));
              }
            }
            ElMessage.error(msg || "登录已失效");
            localStorage.removeItem("token");
            router.push("/login");
            return Promise.reject(new Error(msg));
          }

          ElMessage.error(msg || "请求失败");
          return Promise.reject(new Error(msg));
        }\;

content = content.replace(/        \/\/ 处理业务错误[\s\S]+?return Promise\.reject\(new Error\(msg\)\);\n        \}/, t1);

const t2 = \      (error) => {
        const status = error.response?.status;
        const errorMsg = errorMessages[status] || "请求失败，请稍后重试";

        // HTTP 401 错误也需要处理
        if (status === 401) {
          const userDataStr = localStorage.getItem("userData");
          if (userDataStr) {
            const userData = JSON.parse(userDataStr);
            if (userData.phone && userData.pwdHash) {
              console.log("检测到 HTTP 401，阻断跳转，抛出以供静默重登");
              localStorage.removeItem("token");
              return Promise.reject(new Error("AUTO_LOGIN_REQUIRED"));
            }
          }
          ElMessage.error(errorMsg);
          localStorage.removeItem("token");
          router.push("/login");
          return Promise.reject(error);
        }

        ElMessage.error(errorMsg);
        return Promise.reject(error);
      }\;

content = content.replace(/      \(error\) => \{[\s\S]+?return Promise\.reject\(error\);\n      \}/, t2);

fs.writeFileSync(path, content);
console.log('Fixed request.ts');
