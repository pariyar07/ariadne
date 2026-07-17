#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const templates = path.resolve(__dirname, "../assets/templates");
const agentNavigation = fs.readFileSync(path.join(templates, "Agent Navigation.md"), "utf8");
assert.match(agentNavigation, /read `Agent\/Task Routing Matrix\.md` before following content-hub or workstream links/u);

const scopeIndex = fs.readFileSync(path.join(templates, "Scope Index.md"), "utf8");
const instructionsAt = scopeIndex.indexOf("Scope instructions");
const navigationAt = scopeIndex.indexOf("Scope agent navigation");
const routingAt = scopeIndex.indexOf("Scope task routing");
assert(instructionsAt >= 0 && instructionsAt < navigationAt && navigationAt < routingAt, "scope entry route must expose instructions, navigation, then routing");

console.log("scope-entry-route-test-ok");
