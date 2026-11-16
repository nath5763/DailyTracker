const { request } = require("../../lib/api");
Page({
  data: { history: null, error: "" },
  async onLoad(options) {
    try {
      const path = `/leaderboards/${options.boardId}/members/${options.userId}/scores?game=${encodeURIComponent(options.game)}&range=all`;
      this.setData({ history: await request(path) });
    } catch (error) { this.setData({ error: error.message }); }
  }
});
