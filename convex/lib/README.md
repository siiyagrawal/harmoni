# Persona data boundary

Persona items are private by default, start as drafts, and become eligible for another user's read only after the owner approves them. `canView` is the shared policy check for persona access. It enforces private, connection, shared circle, and purpose-specific custom grant visibility.

Client-facing reads of another person's context must use `persona.read`, which calls `canView` and writes an `accessLog` row for every allowed read. Matching runs in `matching.refresh`; it calls `getContextForMatching`, which uses the matching purpose and logs every permitted item it returns.

`getContextForMatching(ctx, viewerId, targetUserId)` is the only function future LLM features may use to read another person's persona data. Do not pass persona documents or raw persona queries to an LLM from another function. This MVP makes no LLM calls.

Matching compares only the viewer's own approved `want` items with another user's approved `have` items that `canView(..., "matching")` permits. The stored reason is built only from the permitted `have` item. The client cannot supply a user ID to identify the viewer; public functions resolve the viewer from the session token.
