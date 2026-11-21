import legacyModes from "./v1-mode-ids.json";
type RecordValue = Record<string, unknown>;
function record(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function modeId(value: unknown) {
  return typeof value === "string" && Object.hasOwn(legacyModes, value)
    ? legacyModes[value as keyof typeof legacyModes]
    : value;
}
function migrateRound(round: unknown) {
  if (!record(round)) return;
  round.mode = modeId(round.mode);
  if (Array.isArray(round.events))
    for (const event of round.events)
      if (record(event)) event.type = modeId(event.type);
}
// This table describes the original wire format and must never follow display translations.
export function migrateV1(data: unknown) {
  if (!record(data) || data.v !== 1) return;
  migrateRound(data.round);
  if (Array.isArray(data.history)) data.history.forEach(migrateRound);
  data.v = 2;
}
