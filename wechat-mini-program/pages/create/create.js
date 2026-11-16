const { request } = require("../../lib/api");

Page({
  data: { name: "", type: "MULTI_GAME", games: [], gameIndex: 0, busy: false, error: "" },
  async onLoad() {
    try { this.setData({ games: await request("/games") }); }
    catch (error) { this.setData({ error: error.message }); }
  },
  onName(event) { this.setData({ name: event.detail.value }); },
  onType(event) { this.setData({ type: event.detail.value }); },
  onGame(event) { this.setData({ gameIndex: Number(event.detail.value) }); },
  async create() {
    this.setData({ busy: true, error: "" });
    try {
      const data = { name: this.data.name.trim(), boardType: this.data.type };
      if (this.data.type === "SINGLE_GAME") data.gameSlug = this.data.games[this.data.gameIndex].slug;
      const result = await request("/leaderboards", "POST", data);
      wx.redirectTo({ url: `/pages/board/board?id=${result.id}` });
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ busy: false }); }
  }
});
