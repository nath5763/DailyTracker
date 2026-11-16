const { request } = require("../../lib/api");

Page({
  data: { boardId: "", games: [], game: "", rawText: "", preview: null, isLoldle: false,
    loldleDate: "", loldlePreview: null, busy: false, error: "", success: "" },
  async onLoad(options) {
    this.setData({ boardId: options.boardId || "", game: options.game || "" });
    try {
      const games = (await request("/games")).filter(game =>
        !game.supportedFormats || game.supportedFormats.includes("share-text"));
      const game = options.game || (games[0] && games[0].slug) || "";
      this.setData({ games, game, isLoldle: game.startsWith("loldle") });
    } catch (error) { this.setData({ error: error.message }); }
  },
  onGame(event) {
    const game = this.data.games[Number(event.detail.value)];
    this.setData({ game: game.slug, isLoldle: game.slug.startsWith("loldle") || /LoLdle/i.test(this.data.rawText), preview: null, loldlePreview: null });
  },
  onText(event) { this.setData({ rawText: event.detail.value, isLoldle: this.data.game.startsWith("loldle") || /LoLdle/i.test(event.detail.value), preview: null, loldlePreview: null }); },
  onDate(event) { this.setData({ loldleDate: event.detail.value, loldlePreview: null }); },
  async preview() {
    this.setData({ busy: true, error: "", success: "" });
    try {
      if (this.data.isLoldle) {
        if (!this.data.loldleDate) throw new Error("Choose the LoLdle puzzle date.");
        const result = await request("/submissions/loldle/preview", "POST",
          { rawText: this.data.rawText, puzzleDate: this.data.loldleDate });
        this.setData({ loldlePreview: result.submissions, preview: null });
      } else {
        const result = await request("/submissions/preview", "POST",
          { game: this.data.game, rawText: this.data.rawText });
        this.setData({ preview: result.submission, loldlePreview: null });
      }
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ busy: false }); }
  },
  async submit() {
    this.setData({ busy: true, error: "" });
    try {
      if (this.data.loldlePreview) {
        await request("/submissions/loldle", "POST",
          { rawText: this.data.rawText, puzzleDate: this.data.loldleDate });
      } else {
        await request("/submissions", "POST",
          { game: this.data.game, rawText: this.data.rawText, confirmed: this.data.preview });
      }
      wx.showShareMenu();
      this.setData({ success: "Score saved. Open the leaderboard to see updated standings.",
        preview: null, loldlePreview: null, rawText: "" });
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ busy: false }); }
  },
  onShareAppMessage() {
    return { title: `I played ${this.data.game} on Daily Tracker`, path: "/pages/index/index" };
  },
  openBoard() { wx.navigateBack(); }
});
