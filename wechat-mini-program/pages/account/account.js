const { request, clearToken } = require("../../lib/api");

Page({
  data: { me: null, status: null, boards: [], selected: "", links: [], error: "", info: "" },
  onShow() { this.load(); },
  async load() {
    try {
      const [me, status, boards] = await Promise.all([request("/me"), request("/wechat/status"), request("/leaderboards")]);
      this.setData({ me, status, boards });
    } catch (error) { this.setData({ error: error.message }); }
  },
  async showLinks(event) {
    const id = event.currentTarget.dataset.id;
    try { this.setData({ selected: id, links: await request(`/wechat/leaderboards/${id}/group-links`) }); }
    catch (error) { this.setData({ error: error.message }); }
  },
  async disconnect(event) {
    const accepted = await new Promise(resolve => wx.showModal({ title: "Disconnect group?",
      content: "This removes the mapping. Scores and memberships remain.",
      success: result => resolve(result.confirm), fail: () => resolve(false) }));
    if (!accepted) return;
    try {
      await request(`/wechat/group-links/${event.currentTarget.dataset.id}`, "DELETE");
      this.setData({ info: "Group disconnected." });
      await this.showLinks({ currentTarget: { dataset: { id: this.data.selected } } });
    } catch (error) { this.setData({ error: error.message }); }
  },
  async unlink() {
    const accepted = await new Promise(resolve => wx.showModal({ title: "Unlink WeChat?",
      content: "Your scores remain. This Mini Program session will end.",
      success: result => resolve(result.confirm), fail: () => resolve(false) }));
    if (!accepted) return;
    try {
      await request("/wechat/identity", "DELETE"); clearToken();
      wx.reLaunch({ url: "/pages/index/index" });
    } catch (error) { this.setData({ error: error.message }); }
  }
});
