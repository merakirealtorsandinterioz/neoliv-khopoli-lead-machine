const fs = require("fs");
const path = require("path");

module.exports = function loadProject(projectId) {
  const filePath = path.join(__dirname, "../projects", `${projectId}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error("Unknown project_id");
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};
