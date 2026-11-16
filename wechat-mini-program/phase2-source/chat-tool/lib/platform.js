function call(name, options = {}) {
  return new Promise((resolve, reject) => {
    if (typeof wx[name] !== "function") return reject(new Error("This WeChat client does not support Chat Tool Mode."));
    wx[name]({ ...options, success: resolve,
      fail: () => reject(new Error("WeChat could not complete this action.")) });
  });
}
function isChatToolMode() {
  try { return typeof wx.getApiCategory === "function" && wx.getApiCategory() === "chatTool"; }
  catch (_) { return false; }
}
function chatInfo() { return call("getChatToolInfo"); }
function selectMembers() { return call("selectGroupMembers", { maxSelectCount: 20 }); }
function remind(members, boardId) {
  return call("notifyGroupMembers", { title: "Daily games", members,
    entrancePath: `/chat-tool/pages/index/index?boardId=${encodeURIComponent(boardId)}`, type: "complete" });
}
async function shareCard(card) {
  if (card.activityId) {
    try {
      await call("updateShareMenu", { withShareTicket: true, isUpdatableMessage: true,
        activityId: card.activityId, useForChatTool: true, chooseType: 2,
        templateInfo: { templateId: card.templateId } });
    } catch (_) {
      await call("updateShareMenu", { isUpdatableMessage: false }).catch(() => {});
      await call("shareAppMessageToGroup", { title: card.title, path: card.path });
      return { dynamicShared: false };
    }
  }
  await call("shareAppMessageToGroup", { title: card.title, path: card.path });
  return { dynamicShared: Boolean(card.activityId) };
}
module.exports = { isChatToolMode, chatInfo, selectMembers, remind, shareCard };
