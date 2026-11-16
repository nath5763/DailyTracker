App({
  globalData: { group: null, reference: null },
  onLaunch(options) {
    if (options.query && options.query.ref) this.globalData.reference = options.query.ref;
    wx.showShareMenu({ withShareTicket: true });
  },
  onShow(options) {
    this.globalData.reference = options.query && options.query.ref ? options.query.ref : null;
  }
});
