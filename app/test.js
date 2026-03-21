const axios = require("axios");
async function run() {
  try {
    const res = await axios.post("https://worker.run.where.nyc.mn/auth/login/password", {}, {
      headers: {
        "User-Agent": "okhttp/3.12.0",
        "appKey": "389885588s0648fa"
      }
    });
    console.log("SUCCESS:", res.status, res.data);
  } catch(e) {
    console.log("ERROR STATUS:", e.response?.status);
    console.log("ERROR DATA:", e.response?.data);
  }
}
run();
