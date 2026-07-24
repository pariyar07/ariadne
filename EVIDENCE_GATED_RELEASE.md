# Evidence-Gated Release Policy

Ariadne uses evidence-gated releases for significant behavioral and product changes. Implementation is not proof of usefulness, safety, portability, or user value.

## Required sequence

1. Define the user problem, intended benefit, affected claims, and failure risks.
2. Classify the change as `significant` or `exempt` before implementation.
3. For a maintainer-originated significant change, develop the candidate locally or in a private workspace without pushing it to this public repository.
4. Preregister scenarios, controls, oracles, success criteria, and possible dispositions.
5. Evaluate the pinned candidate in maintainer-controlled isolated infrastructure.
6. Require independent review of hash-bound evidence.
7. Record `pass`, `pass-with-limitations`, `revise`, or `reject`.
8. Only `pass` and `pass-with-limitations` authorize a public implementation pull request, merge, capability claim, or release.

External contributors are not expected to have access to maintainer evaluation infrastructure. Their public pull requests are candidate inputs and may remain unmerged until the maintainer completes the required evaluation.

## Significant by default

- agent behavior or instruction semantics
- write authorization, target selection, or destructive operations
- navigation, discovery, memory, retrieval, or context selection
- scope topology, inheritance, migration, or generated canonical surfaces
- privacy, security, isolation, credentials, or external integrations
- automation or unattended mutation
- runtime compatibility or portability
- public capability, safety, accuracy, efficiency, or cost claims

## Normally exempt

- typographical corrections
- documentation clarifications that do not change a product claim
- tests that do not change shipped behavior
- behavior-preserving refactors
- routine repository maintenance with no runtime or release effect

Ambiguous changes are significant until the maintainer records an exemption rationale.

## Public attestation

Every pull request includes one marker-bound JSON attestation in its body. Significant changes disclose only:

- opaque change and evidence IDs
- SHA-256 of the accepted evidence manifest
- verdict and limitations
- maintainer approval identity and time

The public attestation must never reveal private repository names or locations, hidden fixtures, graders, transcripts, credentials, vault content, or personal paths. `node scripts/release_evidence_gate.js` validates the pull-request body in CI.

## Overrides

An urgent maintainer override must state its scope, reason, expiry, and limitation. It may authorize a narrowly bounded safety response, but it cannot be represented as positive product evidence or used to strengthen a public claim.
