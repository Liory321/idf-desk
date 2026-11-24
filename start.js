const { spawn } = require("child_process");
const path = require("path");

function launch(script) {
  const child = spawn(process.execPath, [path.join(__dirname, script)], {
    cwd: __dirname,
    stdio: "inherit",
  });
  child.on("exit", (code) => {
    if (code) process.exit(code);
  });
}

launch("data-site/server.js");
launch("support-site/server.js");

setTimeout(() => {
  console.log("\n  מוקד השירות:   http://localhost:3000");
  console.log("  מקור הנתונים:  http://localhost:4000\n");
}, 500);
