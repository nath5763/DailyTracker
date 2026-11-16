const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const ordinary = require("../lib/chat-tool");
const platform = require("../phase2-source/chat-tool/lib/platform");

afterEach(() => { delete global.wx; });

test("ordinary package keeps Chat Tool entry disabled", async () => {
  let called = false;
  global.wx = { openChatTool: () => { called = true; } };
  assert.equal(ordinary.isChatToolSupported({ chatToolEnabled: true }), false);
  assert.equal(await ordinary.openChatTool("board", { chatToolEnabled: true }), false);
  assert.equal(called, false);
});

test("independent page only treats a Chat Tool launch as active", () => {
  global.wx = { getApiCategory: () => "chatTool" };
  assert.equal(platform.isChatToolMode(), true);
  wx.getApiCategory = () => "default";
  assert.equal(platform.isChatToolMode(), false);
  wx.getApiCategory = () => { throw new Error("unsupported"); };
  assert.equal(platform.isChatToolMode(), false);
});

test("dynamic card shares in the selected chat and falls back to a static card", async () => {
  const calls = [];
  global.wx = {
    updateShareMenu: options => { calls.push(["menu", options]); options.fail(); },
    shareAppMessageToGroup: options => { calls.push(["share", options]); options.success(); }
  };
  const card = { title: "Daily Tracker", path: "/chat-tool/pages/index/index?ref=opaque",
    activityId: "activity", templateId: "template" };
  assert.deepEqual(await platform.shareCard(card), { dynamicShared: false });
  assert.equal(calls[2][0], "share");
  assert.equal(calls[2][1].path, card.path);
  assert.equal(calls[2][1].title, card.title);
  assert.equal(calls[1][1].isUpdatableMessage, false);
});

test("group reminder uses selected platform member IDs", async () => {
  let options;
  global.wx = { notifyGroupMembers: value => { options = value; value.success(); } };
  await platform.remind(["member-1"], "board-id");
  assert.deepEqual(options.members, ["member-1"]);
  assert.equal(options.type, "complete");
  assert.match(options.entrancePath, /^\/chat-tool\/pages\/index\/index\?boardId=/);
});
