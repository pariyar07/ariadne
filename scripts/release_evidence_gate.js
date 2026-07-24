#!/usr/bin/env node

const fs = require("fs");

const START = "<!-- ariadne:release-attestation:start -->";
const END = "<!-- ariadne:release-attestation:end -->";
const ALLOWED_FIELDS = new Set([
  "schemaVersion", "changeId", "classification", "verdict", "evidenceId", "evidenceSha256",
  "limitations", "exemptionRationale", "approvedBy", "approvedAt",
]);
const SHA256 = /^[a-f0-9]{64}$/u;
const PLACEHOLDERS = new Set(["replace-me", "pending", "todo", "tbd"]);
const PRIVATE_DETAIL = new RegExp("(?:/" + "Users/|ariadne-" + "eval-lab|github\\.com/[^\\s]+/ariadne-" + "eval-lab)", "iu");

function extractAttestation(body) {
  const start = body.indexOf(START);
  const end = body.indexOf(END);
  if (start < 0 || end < 0 || end <= start) throw new Error("missing release attestation marker block");
  const block = body.slice(start + START.length, end);
  const match = block.match(/```json\s*([\s\S]*?)\s*```/u);
  if (!match) throw new Error("release attestation must contain one JSON code block");
  return JSON.parse(match[1]);
}

function validateAttestation(value) {
  const failures = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return ["attestation-must-be-object"];
  for (const field of Object.keys(value)) if (!ALLOWED_FIELDS.has(field)) failures.push(`unsupported-field:${field}`);
  if (value.schemaVersion !== 1) failures.push("unsupported-schema-version");
  if (typeof value.changeId !== "string" || !value.changeId.trim()) failures.push("missing-change-id");
  else if (PLACEHOLDERS.has(value.changeId.trim().toLowerCase())) failures.push("placeholder-value:changeId");
  if (!["significant", "exempt"].includes(value.classification)) failures.push("invalid-classification");
  if (!Array.isArray(value.limitations) || value.limitations.some((item) => typeof item !== "string")) failures.push("invalid-limitations");
  if (typeof value.approvedBy !== "string" || !value.approvedBy.trim()) failures.push("missing-approver");
  else if (PLACEHOLDERS.has(value.approvedBy.trim().toLowerCase())) failures.push("placeholder-value:approvedBy");
  if (typeof value.approvedAt !== "string" || Number.isNaN(Date.parse(value.approvedAt))) failures.push("invalid-approval-time");
  if (value.classification === "significant") {
    if (!["pass", "pass-with-limitations"].includes(value.verdict)) failures.push("significant-change-requires-accepted-verdict");
    if (typeof value.evidenceId !== "string" || !value.evidenceId.trim()) failures.push("significant-change-requires-evidence-id");
    if (!SHA256.test(value.evidenceSha256 || "")) failures.push("significant-change-requires-evidence-hash");
  }
  if (value.classification === "exempt") {
    if (value.verdict !== "not-required") failures.push("exempt-change-requires-not-required-verdict");
    if (typeof value.exemptionRationale !== "string" || !value.exemptionRationale.trim()) failures.push("exempt-change-requires-rationale");
  }
  if (PRIVATE_DETAIL.test(JSON.stringify(value))) failures.push("private-detail-in-public-attestation");
  return failures;
}

function main() {
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const failures = validateAttestation(extractAttestation(event.pull_request?.body || ""));
  if (failures.length) throw new Error(`release evidence gate failed: ${failures.join(", ")}`);
  console.log("release-evidence-gate-ok");
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exit(1); }
}

module.exports = { extractAttestation, validateAttestation };
