const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

let saved = "";
let requests = [];
const successRequest = ({ url, method, data, header, success }) => {
  requests.push({ url, method, data, header });
  success({ statusCode: 200,
    data: url.endsWith("/wechat/session") ? { token: "mini-session" } : { ok: true } });
};
global.wx = {
  getStorageSync: () => saved,
  setStorageSync: (_, value) => { saved = value; },
  removeStorageSync: () => { saved = ""; },
  login: ({ success }) => success({ code: "one-use-code" }),
  request: successRequest,
  getLaunchOptionsSync: () => ({})
};

const api = require("../lib/api");
const group = require("../lib/group");

beforeEach(() => { saved = ""; requests = []; wx.request = successRequest; });

test("login exchanges code and sends only the Daily Tracker token on later requests", async () => {
  await api.login();
  assert.equal(requests[0].method, "POST");
  assert.deepEqual(requests[0].data, { code: "one-use-code" });
  assert.equal(requests[0].header.Authorization, undefined);
  await api.request("/leaderboards");
  assert.equal(requests[1].header.Authorization, "Bearer mini-session");
  assert.equal(requests[1].url, "https://api.example.com/api/v1/leaderboards");
});

test("missing group evidence falls back without a group resolve request", async () => {
  assert.equal(await group.resolveGroup(), null);
  assert.equal(requests.length, 0);
});

test("valid-looking group evidence is passed to server for verification", async () => {
  wx.getGroupEnterInfo = ({ success }) => success({ encryptedData: "cipher", iv: "iv" });
  assert.deepEqual(await group.resolveGroup(), { ok: true });
  assert.equal(requests[0].url, "https://api.example.com/api/v1/wechat/group-context/resolve");
  assert.deepEqual(requests[0].data, { encryptedData: "cipher", iv: "iv" });
  delete wx.getGroupEnterInfo;
});

test("an expired app session is discarded", async () => {
  saved = "old-token";
  wx.request = ({ success }) => success({ statusCode: 401, data: { error: "Sign in again." } });
  await assert.rejects(api.request("/me"), /Sign in again/);
  assert.equal(api.token(), "");
});

test("board sharing puts only the opaque reference in the card path", () => {
  let page;
  global.Page = definition => { page = definition; };
  require("../pages/board/board");
  const card = page.onShareAppMessage.call({ data: {
    share: { reference: "opaque-reference", title: "Daily Tracker — Friends" }
  } });
  assert.deepEqual(card, { title: "Daily Tracker — Friends",
    path: "/pages/index/index?ref=opaque-reference" });
  assert.equal(require("../lib/chat-tool").isChatToolSupported(), false);
  delete global.Page;
});
