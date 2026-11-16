const { WECHAT_CHAT_TOOL_ENABLED } = require("../config");
function isChatToolSupported(capabilities) {
  return WECHAT_CHAT_TOOL_ENABLED && Boolean(capabilities && capabilities.chatToolEnabled)
    && typeof wx !== "undefined" && typeof wx.openChatTool === "function";
}

function openChatTool(boardId, capabilities) {
  if (!isChatToolSupported(capabilities)) return Promise.resolve(false);
  return new Promise(resolve => wx.openChatTool({
    url: `/chat-tool/pages/index/index?boardId=${encodeURIComponent(boardId)}`,
    success: () => resolve(true), fail: () => resolve(false)
  }));
}

module.exports = { isChatToolSupported, openChatTool };
