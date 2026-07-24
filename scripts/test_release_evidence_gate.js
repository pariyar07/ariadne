#!/usr/bin/env node

const assert = require("assert");
const { extractAttestation, validateAttestation } = require("./release_evidence_gate");

const significant = {
  schemaVersion: 1,
  changeId: "scope-routing-v2",
  classification: "significant",
  verdict: "pass-with-limitations",
  evidenceId: "EVAL-2026-001",
  evidenceSha256: "a".repeat(64),
  limitations: ["Codex runtime only"],
  approvedBy: "maintainer",
  approvedAt: "2026-07-24T00:00:00Z",
};

assert.deepStrictEqual(validateAttestation(significant), []);
assert(validateAttestation({ ...significant, verdict: "pending" }).includes("significant-change-requires-accepted-verdict"));
assert(validateAttestation({ ...significant, evidenceSha256: null }).includes("significant-change-requires-evidence-hash"));
assert(validateAttestation({ ...significant, privateEvidenceLocation: "/" + "Users/name/private-eval" }).includes("unsupported-field:privateEvidenceLocation"));
assert(validateAttestation({ ...significant, changeId: "replace-me" }).includes("placeholder-value:changeId"));
assert(validateAttestation({ ...significant, limitations: ["See /" + "Users/name/private-eval"] }).includes("private-detail-in-public-attestation"));

const exempt = {
  schemaVersion: 1,
  changeId: "docs-typo",
  classification: "exempt",
  verdict: "not-required",
  evidenceId: null,
  evidenceSha256: null,
  limitations: [],
  exemptionRationale: "Typographical correction with no behavior or claim change.",
  approvedBy: "maintainer",
  approvedAt: "2026-07-24T00:00:00Z",
};
assert.deepStrictEqual(validateAttestation(exempt), []);
assert(validateAttestation({ ...exempt, exemptionRationale: "" }).includes("exempt-change-requires-rationale"));

const body = `before\n<!-- ariadne:release-attestation:start -->\n\`\`\`json\n${JSON.stringify(significant)}\n\`\`\`\n<!-- ariadne:release-attestation:end -->\nafter`;
assert.deepStrictEqual(extractAttestation(body), significant);
assert.throws(() => extractAttestation("no attestation"), /missing release attestation/u);

console.log("release-evidence-gate-test-ok");
