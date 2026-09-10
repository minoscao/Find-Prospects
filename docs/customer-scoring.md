# Customer scoring

Approved design: list and assessment header show collaboration potential, recommendation, confidence, evidence coverage, and reasons. Seven dimensions use server-side weights managed inside password-protected Skill configuration. AI returns evidence-linked dimension values; server calculates totals. Unknown dimensions stay null and are excluded from the weighted denominator. Require 60 percent coverage, four rated dimensions, and product fit before showing a total. Score is provisional sales priority, never buying probability. Each assessment stores its scoring snapshot and versions, so later changes can be compared. Existing reports are not silently assigned invented scores.

Validation: unknown and invalid evidence handling, thresholds and weighted calculation, protected configuration, persisted report round trip, bilingual list/header and ordering, online generation and save.
