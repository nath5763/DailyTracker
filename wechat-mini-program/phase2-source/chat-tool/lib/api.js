// Independent subpackages cannot import the main package's transport module.
const { API_BASE_URL } = require("../config");
const TOKEN_KEY = "daily-tracker-wechat-token";
function token() { return wx.getStorageSync(TOKEN_KEY) || ""; }
function saveToken(value) { wx.setStorageSync(TOKEN_KEY, value); }
function request(path, method = "GET", data) {
  return new Promise((resolve, reject) => wx.request({
    url: `${API_BASE_URL}/api/v1${path}`, method, data,
    header: { "Content-Type": "application/json", ...(token() ? { Authorization: `Bearer ${token()}` } : {}) },
    success(response) {
      if (response.statusCode >= 200 && response.statusCode < 300) return resolve(response.data);
      if (response.statusCode === 401) wx.removeStorageSync(TOKEN_KEY);
      reject(new Error((response.data && response.data.error) || "The request failed."));
    },
    fail() { reject(new Error("Network error. Try again.")); }
  }));
}
function login() {
  return new Promise((resolve, reject) => wx.login({
    success: value => value.code ? resolve(value.code) : reject(new Error("WeChat sign-in failed.")),
    fail: () => reject(new Error("WeChat sign-in failed."))
  })).then(code => request("/wechat/session", "POST", { code })).then(result => {
    saveToken(result.token); return result;
  });
}
module.exports = { request, login, token, saveToken };
