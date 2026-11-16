const { request, login, token, saveToken } = require("../../lib/api");
const platform = require("../../lib/platform");

Page({
  data: { active: false, signedIn: false, profile: null, boards: [], boardId: "", board: null,
    reference: "", preview: null, group: null, games: [], game: "", rawText: "", scorePreview: null,
    loldlePreview: null, loldleDate: "", isLoldle: false, members: [],
    name: "", code: "", selectedGameName: "", busy: false, error: "", info: "" },
  onLoad(options) {
    this.setData({ boardId: options.boardId || "", reference: options.ref || "",
      active: platform.isChatToolMode() });
    this.boot();
  },
  async boot() {
    if (!this.data.active) return;
    if (!token()) return;
    this.setData({ error: "" });
    try {
      const capability = await request("/wechat/chat-tool/capabilities");
      if (!capability.enabled) throw new Error("Chat Tool Mode is not enabled for this app.");
      await this.loadAccount();
    } catch (error) { this.setData({ error: error.message }); }
  },
  async signIn() {
    this.setData({ busy: true, error: "" });
    try { await login(); await this.boot(); }
    catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ busy: false }); }
  },
  async loadAccount() {
    const me = await request("/me");
    const state = { signedIn: true, profile: me.profile, boards: [], preview: null };
    if (me.profile) state.boards = await request("/leaderboards");
    if (me.profile && this.data.reference) {
      try { state.preview = await request(`/wechat/shares/${encodeURIComponent(this.data.reference)}`); }
      catch (error) { state.error = error.message; }
    }
    this.setData(state);
    if (!me.profile) return;
    try {
      const group = await this.refreshContext();
      const boardId = group.mapped && group.leaderboardId ? group.leaderboardId : this.data.boardId;
      if (boardId && state.boards.some(board => board.id === boardId)) await this.loadBoard(boardId);
    } catch (error) { this.setData({ error: `${error.message} You can still open a regular group card.` }); }
  },
  async refreshContext() {
    const evidence = await platform.chatInfo();
    const group = await request("/wechat/chat-tool/context", "POST", {
      encryptedData: evidence.encryptedData, iv: evidence.iv
    });
    this.setData({ group });
    return group;
  },
  async loadBoard(boardId, gameSlug = "") {
    const path = `/leaderboards/${encodeURIComponent(boardId)}?range=today${gameSlug ? `&game=${encodeURIComponent(gameSlug)}` : ""}`;
    const board = await request(path);
    this.setData({ board, boardId, game: board.game.slug,
      selectedGameName: board.game.name, isLoldle: board.game.slug.startsWith("loldle"),
      games: board.games && board.games.length ? board.games : [board.game] });
  },
  chooseBoard(event) { this.setData({ game: "" }); this.loadBoard(event.currentTarget.dataset.id).catch(error => this.setData({ error: error.message })); },
  chooseGame(event) {
    const game = this.data.games[Number(event.detail.value)];
    this.setData({ scorePreview: null, loldlePreview: null });
    this.loadBoard(this.data.boardId, game.slug).catch(error => this.setData({ error: error.message }));
  },
  onText(event) { this.setData({ rawText: event.detail.value,
    isLoldle: this.data.game.startsWith("loldle") || /LoLdle/i.test(event.detail.value),
    scorePreview: null, loldlePreview: null }); },
  onDate(event) { this.setData({ loldleDate: event.detail.value, loldlePreview: null }); },
  onName(event) { this.setData({ name: event.detail.value }); },
  onCode(event) { this.setData({ code: event.detail.value.trim() }); },
  async createProfile() {
    this.setData({ busy: true, error: "" });
    try {
      await request("/me/profile", "PUT", { displayName: this.data.name.trim(), avatarColor: "#dfff4f" });
      await this.loadAccount();
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ busy: false }); }
  },
  async linkAccount() {
    this.setData({ busy: true, error: "" });
    try {
      const session = await request("/wechat/link-codes/redeem", "POST", { code: this.data.code });
      saveToken(session.token); await this.loadAccount();
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ busy: false }); }
  },
  async join() {
    this.setData({ busy: true, error: "" });
    try {
      const result = await request(`/wechat/shares/${encodeURIComponent(this.data.reference)}/join`, "POST");
      await this.loadAccount(); await this.loadBoard(result.id);
      this.setData({ info: "Joined the leaderboard." });
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ busy: false }); }
  },
  async linkGroup() {
    const accepted = await new Promise(resolve => wx.showModal({ title: "Link this group?",
      content: `Associate this verified group with ${this.data.board.name}?`,
      success: result => resolve(result.confirm), fail: () => resolve(false) }));
    if (!accepted) return;
    try {
      await this.refreshContext();
      await request("/wechat/group-links", "POST", { leaderboardId: this.data.boardId, confirmed: true });
      this.setData({ group: await request("/wechat/group-context/current"), info: "Group linked." });
    } catch (error) { this.setData({ error: error.message }); }
  },
  async previewScore() {
    this.setData({ busy: true, error: "", info: "" });
    try {
      if (this.data.isLoldle) {
        if (!this.data.loldleDate) throw new Error("Enter the LoLdle date as YYYY-MM-DD.");
        const result = await request("/submissions/loldle/preview", "POST",
          { rawText: this.data.rawText, puzzleDate: this.data.loldleDate });
        this.setData({ loldlePreview: result.submissions, scorePreview: null });
      } else {
        const result = await request("/submissions/preview", "POST",
          { game: this.data.game, rawText: this.data.rawText });
        this.setData({ scorePreview: result.submission, loldlePreview: null });
      }
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ busy: false }); }
  },
  async submitScore() {
    this.setData({ busy: true, error: "" });
    try {
      await this.refreshContext().catch(() => {});
      if (this.data.loldlePreview) await request("/submissions/loldle", "POST",
        { rawText: this.data.rawText, puzzleDate: this.data.loldleDate });
      else await request("/submissions", "POST", {
        game: this.data.game, rawText: this.data.rawText, confirmed: this.data.scorePreview
      });
      this.setData({ rawText: "", scorePreview: null, loldlePreview: null, info: "Score saved." });
      await this.loadBoard(this.data.boardId, this.data.game);
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ busy: false }); }
  },
  async shareCard() {
    this.setData({ busy: true, error: "", info: "" });
    try {
      await this.refreshContext();
      const card = await request(`/wechat/chat-tool/cards/${this.data.boardId}`, "POST");
      const result = await platform.shareCard(card);
      if (card.cardId && result.dynamicShared) {
        try { await request(`/wechat/chat-tool/cards/${card.cardId}/shared`, "POST"); }
        catch (_) { this.setData({ info: "Card sent. Live updates could not be enabled." }); }
      }
      if (!this.data.info) this.setData({ info: "Card shared to this chat." });
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ busy: false }); }
  },
  async selectMembers() {
    try {
      const result = await platform.selectMembers();
      this.setData({ members: result.members || [], info: `${(result.members || []).length} member(s) selected.` });
    } catch (error) { this.setData({ error: error.message }); }
  },
  async remind() {
    if (!this.data.members.length) return;
    try {
      await platform.remind(this.data.members, this.data.boardId);
      this.setData({ members: [], info: "Reminder sent by WeChat." });
    } catch (error) { this.setData({ error: error.message }); }
  },
  openRegular() {
    wx.reLaunch({ url: "/pages/index/index" + (this.data.reference ? `?ref=${encodeURIComponent(this.data.reference)}` : "") });
  }
});
