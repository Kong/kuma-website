#!/usr/bin/env node

const fs = require("fs");
const latestSemver = require("latest-semver");
const releases = "./docs/.vuepress/public/releases.json";
const tomlFile = "./netlify.toml";

// read the releases file so we can parse the data
fs.readFile(releases, "utf8", (err, data) => {
  if (err) throw err;

  // find the latest version in the releases JSON file
  const latest = latestSemver(JSON.parse(data));
  const docRedirectType = 301;

  // setup the content template
  const template = `# Docs redirect
[[redirects]]
from = "/docs/"
to = "/docs/${latest}/"
status = ${docRedirectType}
force = false

# Install redirect
[[redirects]]
from = "/install/"
to = "/install/${latest}/"
status = 200
force = false

# Docs: Latest redirect
[[redirects]]
from = "/docs/latest/*"
to = "/docs/${latest}/:splat"
status = ${docRedirectType}
force = false

# Install: Latest redirect
[[redirects]]
from = "/install/latest/*"
to = "/install/${latest}/:splat"
status = 200
force = false

#
# Redirects for old docs root pages
#

# Policies
from = "/docs/:version/policies/"
to = "/docs/:version/policies/introduction/"
status = 301
force = false

# Documentation
from = "/docs/:version/documentation/"
to = "/docs/:version/documentation/introduction/"
status = 301
force = false

# Overview
from = "/docs/:version/overview/"
to = "/docs/:version/overview/what-is-kuma/"
status = 301
force = false

# Installation
from = "/docs/:version/installation/"
to = "/docs/:version/installation/centos/"
status = 301
force = false

# Other
from = "/docs/:version/other/"
to = "/docs/:version/other/introduction/"
status = 301
force = false`;

  // write our redirects to the TOML file
  // this will write to the end of the file
  fs.writeFile(tomlFile, template, { flag: "a+" }, err => {
    if (err) throw err;
    console.log("Netlify redirects created successfully!");
  });
});
