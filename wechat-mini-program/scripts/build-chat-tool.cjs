const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist-chat-tool");
if (path.dirname(output) !== root || (fs.existsSync(output) &&
    fs.realpathSync(output) !== output)) throw new Error("Build output must stay inside the Mini Program project.");
const approved = process.env.WECHAT_CHAT_TOOL_APPROVED === "true";
const appid = process.env.WECHAT_APP_ID || "";
const apiUrl = process.env.WECHAT_API_BASE_URL || "";
if (!approved) throw new Error("Set WECHAT_CHAT_TOOL_APPROVED=true only after console approval.");
if (!/^wx[a-zA-Z0-9]{16}$/.test(appid)) throw new Error("Set WECHAT_APP_ID to the approved Mini Program AppID.");
if (!/^https:\/\/[^/]+$/.test(apiUrl)) throw new Error("Set WECHAT_API_BASE_URL to the allowlisted HTTPS API origin.");

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const name of ["app.js", "app.wxss", "pages", "lib"]) {
  fs.cpSync(path.join(root, name), path.join(output, name), { recursive: true });
}
fs.cpSync(path.join(root, "phase2-source", "chat-tool"), path.join(output, "chat-tool"), { recursive: true });
fs.writeFileSync(path.join(output, "config.js"),
  `module.exports = ${JSON.stringify({ API_BASE_URL: apiUrl, WECHAT_CHAT_TOOL_ENABLED: true })};\n`);
fs.writeFileSync(path.join(output, "chat-tool", "config.js"),
  `module.exports = ${JSON.stringify({ API_BASE_URL: apiUrl })};\n`);

const app = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8"));
app.subPackages = [{ root: "chat-tool", pages: ["pages/index/index"], independent: true,
  componentFramework: "glass-easel", renderer: "skyline" }];
app.chatTools = [{ root: "chat-tool", entryPagePath: "pages/index/index",
  desc: "Daily game leaderboard and score sharing" }];
app.rendererOptions = { skyline: { disableABTest: true, defaultDisplayBlock: true,
  defaultContentBox: true, tagNameStyleIsolation: "legacy", sdkVersionBegin: "3.7.0" } };
fs.writeFileSync(path.join(output, "app.json"), JSON.stringify(app, null, 2) + "\n");
const project = JSON.parse(fs.readFileSync(path.join(root, "project.config.json"), "utf8"));
project.appid = appid;
fs.writeFileSync(path.join(output, "project.config.json"), JSON.stringify(project, null, 2) + "\n");

function size(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).reduce((sum, entry) => {
    const file = path.join(directory, entry.name);
    return sum + (entry.isDirectory() ? size(file) : fs.statSync(file).size);
  }, 0);
}
const packageBytes = size(path.join(output, "chat-tool"));
if (packageBytes > 500 * 1024) throw new Error(`Chat Tool package exceeds 500 KB: ${packageBytes}`);
console.log(`Built ${output} (independent Chat Tool package: ${packageBytes} bytes)`);
