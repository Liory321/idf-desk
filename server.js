process.env.COMBINED = "1";

const express = require("express");
const path = require("path");
const dataApp = require("./data-site/server");
const supportApp = require("./support-site/server");

const app = express();
app.use("/source", express.static(path.join(__dirname, "data-site", "public")));
app.use(dataApp);
app.use(supportApp);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`האתר המאוחד פעיל על פורט ${port}`);
});
