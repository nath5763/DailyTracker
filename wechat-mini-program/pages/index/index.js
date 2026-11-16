const { request, login, token, saveToken } = require("../../lib/api");
const { resolveGroup } = require("../../lib/group");

Page({
  data: { ready: false, enabled: false, signedIn: false, profile: null, boards: [],
    reference: "", preview: null, group: null, name: "", code: "", error: "", busy: false },
  onLoad(options) {
    const reference = options.ref || getApp().globalData.reference || "";
    getApp().globalData.reference = reference;
    this.setData({ reference });
  },
  onShow() {
    const reference = getApp().globalData.reference || this.data.reference;
    if (reference !== this.data.reference) this.setData({ reference });
    this.load();
  },
  async load() {
    this.setData({ error: "" });
    try {
      const capabilities = await request("/wechat/capabilities");
      this.setData({ enabled: capabilities.enabled, ready: true });
      if (!capabilities.enabled || !token()) return;
      await this.loadAccount(capabilities.groupContextEnabled);
    } catch (error) { this.setData({ ready: true, error: error.message }); }
  },
  async signIn() {
    this.setData({ busy: true, error: "" });
    try {
      await login();
      const capabilities = await request("/wechat/capabilities");
      await this.loadAccount(capabilities.groupContextEnabled);
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ busy: false }); }
  },
  async loadAccount(groupEnabled) {
    try {
      const me = await request("/me");
      const state = { signedIn: true, profile: me.profile, boards: [], preview: null };
      if (me.profile) state.boards = await request("/leaderboards");
      if (me.profile && this.data.reference) {
        try { state.preview = await request(`/wechat/shares/${this.data.reference}`); }
        catch (error) { state.error = error.message; }
      }
      this.setData(state);
      if (groupEnabled) {
        const group = await resolveGroup();
        getApp().globalData.group = group;
        this.setData({ group });
      }
    } catch (error) { this.setData({ signedIn: false, error: error.message }); }
  },
  onName(event) { this.setData({ name: event.detail.value }); },
  onCode(event) { this.setData({ code: event.detail.value.trim() }); },
  async createProfile() {
    if (this.data.name.trim().length < 2) return this.setData({ error: "Enter a display name." });
    this.setData({ busy: true, error: "" });
    try {
      await request("/me/profile", "PUT", { displayName: this.data.name.trim(), avatarColor: "#dfff4f" });
      await this.loadAccount(false);
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ busy: false }); }
  },
  async linkAccount() {
    this.setData({ busy: true, error: "" });
    try {
      const session = await request("/wechat/link-codes/redeem", "POST", { code: this.data.code });
      saveToken(session.token);
      await this.loadAccount(false);
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ busy: false }); }
  },
  async join() {
    this.setData({ busy: true, error: "" });
    try {
      const result = await request(`/wechat/shares/${this.data.reference}/join`, "POST");
      wx.navigateTo({ url: `/pages/board/board?id=${result.id}` });
    } catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ busy: false }); }
  },
  async linkGroup(event) {
    const boardId = event.currentTarget.dataset.id;
    const confirmation = await new Promise(resolve => wx.showModal({
      title: "Link this group?", content: "Associate this verified WeChat group with your leaderboard? Only the leaderboard owner can later disconnect it.",
      success: result => resolve(result.confirm), fail: () => resolve(false)
    }));
    if (!confirmation) return;
    try {
      await request("/wechat/group-links", "POST", { leaderboardId: boardId, confirmed: true });
      wx.showToast({ title: "Group linked", icon: "success" });
      getApp().globalData.group = { verified: true, mapped: true, leaderboardId: boardId };
      this.setData({ group: getApp().globalData.group });
    } catch (error) { this.setData({ error: error.message }); }
  },
  openBoard(event) { wx.navigateTo({ url: `/pages/board/board?id=${event.currentTarget.dataset.id}` }); },
  openCreate() { wx.navigateTo({ url: "/pages/create/create" }); },
  openAccount() { wx.navigateTo({ url: "/pages/account/account" }); }
});
