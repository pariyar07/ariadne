# Security Policy

## Reporting A Vulnerability

Please do not open public issues for suspected vulnerabilities.

Use GitHub private vulnerability reporting when it is enabled for this repository. If private reporting is not available, contact the maintainer privately and include:

- affected skill, script, workflow, or documentation path
- a minimal reproduction or proof of concept
- whether the issue can expose private vault content, overwrite files outside Ariadne marker blocks, or leak secrets
- any suggested mitigation

The maintainer will acknowledge valid reports when possible, triage impact, and coordinate a fix before public disclosure.

## Scope

Security-sensitive areas include:

- marker-managed writes to global agent instruction files
- vault registration and discovery paths
- deterministic vault validation scripts
- GitHub Actions workflows and repository automation
- public templates that could encourage users to paste private vault content, secrets, client data, or production logs

Ariadne is a Markdown knowledge-vault skill package with optional Obsidian-compatible view features. It should not contain generic runtime-adaptive coordination behavior, production credentials, private vault snapshots, customer data, or maintainer-local paths.

## Supported Versions

Only the `main` branch is maintained for security fixes.

## Maintainer Checklist

- Enable GitHub private vulnerability reporting if the repository settings support it.
- Protect `main` with required status checks for `validate-repo`, `validate-skills`, and Scorecard.
- Require pull request review from CODEOWNERS before merging.
- Keep workflow permissions least-privilege by default.
- Never publish private vault content, secrets, local absolute paths, or maintainer-only workflow assumptions in public docs.
