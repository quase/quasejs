module.exports = {
  entries: [
    [ "files/index.js", "atual/dist.js" ]
  ],
  babelOpts: {
    presets: [
      [ "env", {
        targets: { chrome: 50 },
        loose: true
      } ]
    ]
  },
  _error: "Duplicate import a. See files/index.js:2:7"
};
