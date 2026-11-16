const { request } = require("../../lib/api");
const { isChatToolSupported, openChatTool } = require("../../lib/chat-tool");

Page({
  data: { id: "", board: null, selectedGame: "", games: [], share: null, group: null, dateLabel: "",
    links: [], busy: false, error: "", info: "", chatToolAvailable: false, capabilities: null },
  onLoad(options) { wx.hideShareMenu(); this.setData({ id: options.id, group: getApp().globalData.group, dateLabel: new Date().toLocaleDateString() }); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  onShow() { if (this.data.id) this.load(); },
  async load() {
    this.setData({ error: "" });
    try {
      const path = `/leaderboards/${this.data.id}?range=today${this.data.selectedGame ? `&game=${encodeURIComponent(this.data.selectedGame)}` : ""}`;
      const board = await request(path);
      const games = board.games && board.games.length ? board.games : [board.game];
      this.setData({ board, games, selectedGame: board.game.slug });
      const capabilities = await request("/wechat/capabilities");
      this.setData({ capabilities, chatToolAvailable: isChatToolSupported(capabilities) });
      if (board.owner) this.setData({ links: await request(`/wechat/leaderboards/${this.data.id}/group-links`) });
    } catch (error) { this.setData({ error: error.message }); }
  },
  chooseGame(event) { this.setData({ selectedGame: event.currentTarget.dataset.slug }); this.load(); },
  submit() { wx.navigateTo({ url: `/pages/submit/submit?boardId=${this.data.id}&game=${this.data.selectedGame}` }); },
  history(event) { wx.navigateTo({ url: `/pages/history/history?boardId=${this.data.id}&userId=${event.currentTarget.dataset.id}&game=${this.data.selectedGame}` }); },
  async prepareShare() {
    this.setData({ busy: true, error: "", info: "" });
    try {
      const share = await request(`/wechat/shares/${this.data.id}`, "POST");
      this.setData({ share, info: "Card ready for 24 hours. Tap Share to send it to your existing WeChat group." });
      wx.showShareMenu({ withShareTicket: true });
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ busy: false }); }
  },
  async openChatTool() {
    const opened = await openChatTool(this.data.id, this.data.capabilities);
    if (!opened) this.setData({ info: "Chat Tool is unavailable. Use the regular group card below." });
  },
  onShareAppMessage() {
    if (!this.data.share) return { title: "Daily Tracker", path: "/pages/index/index" };
    return { title: this.data.share.title, path: `/pages/index/index?ref=${this.data.share.reference}` };
  },
  async linkGroup() {
    const accepted = await new Promise(resolve => wx.showModal({ title: "Associate this group?",
      content: `Link the verified group to ${this.data.board.name}? This does not grant group admin access.`,
      success: result => resolve(result.confirm), fail: () => resolve(false) }));
    if (!accepted) return;
    try {
      await request("/wechat/group-links", "POST", { leaderboardId: this.data.id, confirmed: true });
      this.setData({ info: "Verified group linked." });
      await this.load();
    } catch (error) { this.setData({ error: error.message }); }
  },
  async disconnect(event) {
    const accepted = await new Promise(resolve => wx.showModal({ title: "Disconnect group?",
      content: "Scores and memberships will remain. The group association will be removed.",
      success: result => resolve(result.confirm), fail: () => resolve(false) }));
    if (!accepted) return;
    try {
      await request(`/wechat/group-links/${event.currentTarget.dataset.id}`, "DELETE");
      this.setData({ info: "Group disconnected." }); await this.load();
    } catch (error) { this.setData({ error: error.message }); }
  }
});
