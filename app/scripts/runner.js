const axios = require("axios");
const CryptoJS = require("crypto-js");
// 统一的 md5 哈希处理，跟前端 utils/crypto.ts 保持一致
const md5Hash = (str) => CryptoJS.MD5(str).toString().toLowerCase();
// === 配置区 ===
const appKey = process.env.VITE_APP_KEY || "389885588s0648fa";
const appSecret =
  process.env.VITE_APP_SECRET || "56E39A1658455588885690425C0FD16055A21676";
const baseURL =
  process.env.VITE_API_BASE_URL || "https://worker.run.where.nyc.mn";

const userPhone = process.env.USER_PHONE;
const userPwd = process.env.USER_PWD;

// 签到/签退时间允许的浮动范围（毫秒），这里设为 15 分钟
const SIGN_OFFSET_MS = 15 * 60 * 1000;

if (!userPhone || !userPwd) {
  console.error("❌ 缺少环境变量 USER_PHONE 或 USER_PWD");
  process.exit(1);
}

// === 辅助函数：生成签名 ===
function generateSign(query = null, body = null) {
  let signStr = "";

  if (query !== null) {
    const normalizedQuery = Object.entries(query).reduce(
      (acc, [key, value]) => {
        acc[key] = value === null ? "" : String(value);
        return acc;
      },
      {},
    );
    const sortedKeys = Object.keys(normalizedQuery).sort();
    for (const key of sortedKeys) {
      const value = normalizedQuery[key];
      if (value !== "") signStr += key + value;
    }
  }

  signStr += appKey;
  signStr += appSecret;

  if (body !== null) signStr += JSON.stringify(body);

  let replaced = false;
  const specialChars = [" ", "~", "!", "(", ")", "'"];
  for (const ch of specialChars) {
    if (signStr.includes(ch)) {
      signStr = signStr.replace(new RegExp("\\" + ch, "g"), "");
      replaced = true;
    }
  }

  if (replaced) signStr = encodeURIComponent(signStr);

  let sign = CryptoJS.MD5(signStr).toString().toUpperCase();
  if (replaced) sign += "encodeutf8";

  return sign;
}

// === 请求实例封装 ===
const request = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    appKey: appKey,
    "User-Agent": "okhttp/3.12.0",
  },
});

let currentToken = null;

request.interceptors.request.use((config) => {
  if (currentToken) {
    config.headers.token = currentToken;
  }
  const sign = generateSign(
    config.method === "get" ? config.params : null,
    config.method === "post" ? config.data : null,
  );
  config.headers.sign = sign;
  return config;
});

// 解析服务器返回的坑爹时间格式 "08:00:00" -> 当天的绝对时间戳
function parseTime(timeStr) {
  if (!timeStr) return NaN;
  let str = timeStr.replace(/-/g, "/");
  if (str.length <= 8) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    str = `${yyyy}/${mm}/${dd} ${str}`;
  }
  return new Date(str).getTime();
}

// === 随机延迟与指纹生成 ===
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// === 主逻辑 ===
async function runAutoSign() {
  console.log(
    `[${new Date().toLocaleTimeString()}] 开始执行自动签到检测流程...`,
  );

  // 1. 增加随机休眠 (0~3分钟)，防止每次触发时间过于精确(整10分)被风控特征识别
  const randomDelayMs = Math.floor(Math.random() * 3 * 60 * 1000);
  console.log(
    `⏳ 为增强隐蔽性，随机等待 ${(randomDelayMs / 1000).toFixed(1)} 秒...`,
  );
  await sleep(randomDelayMs);

  // 2. 登录拿 Token
  let studentId;
  try {
    const device = {
      appVersion: "1.8.3",
      brand: "iPhone",
      deviceToken: generateUUID(), // 伪造随机的设备Token
      deviceType: "2",
      mobileType: "iPhone 15 Pro Max",
      sysVersion: "17.4.1", // 修正符合 iPhone 15 的真实系统版本
    };
    const res = await request.post("/auth/login/password", {
      ...device,
      password: md5Hash(userPwd),
      userPhone: userPhone,
    });

    if (res.data.code !== 10000) {
      console.error("❌ 登录失败:", res.data.msg);
      return;
    }

    currentToken = res.data.response.oauthToken.token;
    studentId = res.data.response.studentId;
    console.log("✅ 登录成功，拿到了 Token");
  } catch (err) {
    console.error("❌ 登录请求异常:", err.message);
    return;
  }

  // 2. 获取当前的活动状态
  let clubActivity;
  try {
    const res = await request.get("/clubactivity/getSignInTf", {
      params: { studentId },
    });
    if (res.data.code !== 10000) {
      console.log("⚠️ 获取活动状态接口不顺:", res.data.msg);
      return;
    }
    clubActivity = res.data.response;
  } catch (err) {
    console.error("❌ 获取活动状态异常:", err.message);
    return;
  }

  if (!clubActivity || !clubActivity.activityId) {
    console.log("💤 当前时间无正在进行的俱乐部活动。");
    return;
  }

  // 3. 校验时间和执行动作
  const now = new Date().getTime();
  const startTs = parseTime(clubActivity.startTime);
  const endTs = parseTime(clubActivity.endTime);

  console.log(`📌 当前活动: ${clubActivity.activityName}`);
  console.log(
    `⏱️ 签到时间: ${new Date(startTs).toLocaleTimeString()} | 签退时间: ${new Date(endTs).toLocaleTimeString()}`,
  );
  console.log(
    `🪧 当前签到状态: ${clubActivity.signInStatus === "1" ? "已签到" : "未签到"} | 签退状态: ${clubActivity.signBackStatus === "1" ? "已签退" : "未签退"}`,
  );

  // 微小地理位置偏移
  const lat = parseFloat(clubActivity.latitude || "0");
  const lng = parseFloat(clubActivity.longitude || "0");
  const jitterLat = (lat + (Math.random() - 0.5) * 0.0001).toFixed(6);
  const jitterLng = (lng + (Math.random() - 0.5) * 0.0001).toFixed(6);

  // 签退检查（优先级高于签到判断）
  if (now >= endTs - SIGN_OFFSET_MS && now <= endTs + SIGN_OFFSET_MS) {
    if (clubActivity.signInStatus === "1" && clubActivity.signStatus === "2") {
      console.log("🚀 符合【签退】条件，尝试执行签退...");
      await executeSign(
        "2",
        clubActivity.activityId,
        studentId,
        jitterLat,
        jitterLng,
      );
      return;
    }
  }

  // 签到检查
  if (now >= startTs - SIGN_OFFSET_MS && now <= startTs + SIGN_OFFSET_MS) {
    if (clubActivity.signStatus === "1") {
      console.log("🚀 符合【签到】条件，尝试执行签到...");
      await executeSign(
        "1",
        clubActivity.activityId,
        studentId,
        jitterLat,
        jitterLng,
      );
      return;
    }
  }

  console.log("💤 当前时间不在签到/签退允许的浮动窗口内，跳过...");
}

// === 签到动作请求 ===
async function executeSign(
  signType,
  activityId,
  studentId,
  jitterLat,
  jitterLng,
) {
  try {
    const res = await request.post("/clubactivity/signInOrSignBack", {
      activityId: activityId,
      latitude: String(jitterLat),
      longitude: String(jitterLng),
      signType: signType, // "1" 是签到，"2" 是签退
      studentId: Number(studentId),
    });

    if (res.data.code === 10000) {
      if (res.data.response && res.data.response.status === "0") {
        console.error(`❌ 被服务器拒绝: ${res.data.response.message}`);
      } else {
        console.log(`✅ 顺利完成操作: ${signType === "1" ? "签到" : "签退"}!`);
      }
    } else {
      console.error(`❌ 接口业务失败: ${res.data.msg}`);
    }
  } catch (err) {
    console.error(`❌ 网络请求失败:`, err.message);
  }
}

// 立即运行
runAutoSign();
