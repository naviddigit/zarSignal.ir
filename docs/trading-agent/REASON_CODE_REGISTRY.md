# REASON_CODE_REGISTRY

Status: SOURCE_REQUIRED — zero actual codes supplied
Source: [owner-supplied package](TRADING_AGENT_CONTRACT_PACKAGE_V1.md), sections 09.

This is a lossless extraction of supplied sections, NOT the full Master Prompt V5.4. Recommended response examples are not executable validated schemas. No missing engine rules were reconstructed.

09 — REASON CODE REGISTRY
==================================================

Create:

docs/trading-agent/REASON_CODE_REGISTRY.md

Each real V5.4 reason must be represented as:

code
definition
engine_emission_rule_reference
approved_persian_text
allowed_text_parameters
applicable_assets
introduced_in_version
deprecated_in_version

Important:

Reasoning is visible.
Formula is hidden.

The UI may translate a deterministic Reason Code into understandable
Persian.

Example architecture only:

ENGINE CODE
     ↓
APPROVED COPY MAP
     ↓
USER TEXT

Do not use an LLM to invent the explanation after receiving the result.

Do not invent Reason Codes that do not exist in V5.4.
