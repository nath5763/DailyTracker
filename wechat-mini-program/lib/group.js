const { request } = require("./api");

function groupEvidence() {
  const options = typeof wx.getEnterOptionsSync === "function" ? wx.getEnterOptionsSync() : wx.getLaunchOptionsSync();
  return new Promise(resolve => {
    const fallback = () => {
      if (options.shareTicket && typeof wx.getShareInfo === "function") {
        wx.getShareInfo({ shareTicket: options.shareTicket,
          success: value => resolve(value), fail: () => resolve(null) });
      } else resolve(null);
    };
    if (typeof wx.getGroupEnterInfo === "function") {
      wx.getGroupEnterInfo({ success: value => value.encryptedData && value.iv ? resolve(value) : fallback(), fail: fallback });
    } else fallback();
  });
}

async function resolveGroup() {
  const evidence = await groupEvidence();
  if (!evidence || !evidence.encryptedData || !evidence.iv) return null;
  try {
    return await request("/wechat/group-context/resolve", "POST", {
      encryptedData: evidence.encryptedData, iv: evidence.iv
    });
  } catch (_) { return null; }
}

module.exports = { resolveGroup };
