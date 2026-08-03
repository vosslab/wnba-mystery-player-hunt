import { playerIdFromString } from "../brands";
import type { PlayerId } from "../brands";

export type Conference = "East" | "West";
export type PositionCode = "G" | "F" | "C";

export type DraftInfo =
  | {
      readonly kind: "drafted";
      readonly year: number;
      readonly overallPick: number;
    }
  | {
      readonly kind: "undrafted";
    };

export type PlayerRecord = {
  readonly playerId: PlayerId;
  readonly displayName: string;
  readonly searchName: string;
  readonly teamCode: string;
  readonly conference: Conference;
  readonly heightInches: number;
  readonly birthDateUtc: string;
  readonly draft: DraftInfo;
  readonly country: string;
  readonly college: string;
  readonly positionPrimary: PositionCode;
  readonly positionAlternates: readonly PositionCode[];
};

export type SnapshotDataKind = "derived" | "official";
export type SnapshotDataStatus = "verified";

type RecognizabilitySelectionRule = {
  readonly eligibilityGate: "current-roster";
  readonly recognizabilityMetric: "WNBA_FANTASY_PTS";
  /** The current season first, followed by the immediately preceding season. */
  readonly seasons: readonly [currentSeason: string, precedingSeason: string];
  readonly cutoff: number;
  readonly selectedPoolSize: number;
};

export type DerivedSelectionRule = RecognizabilitySelectionRule & {
  readonly kind: "derived";
};

export type OfficialSelectionRule = RecognizabilitySelectionRule & {
  readonly kind: "official";
};

export type SnapshotSelectionRule = DerivedSelectionRule | OfficialSelectionRule;

type RosterSnapshotEnvelopeV1 = {
  readonly schemaVersion: 1;
  readonly asOfDateUtc: string;
  readonly sourceNote: string;
  readonly players: readonly PlayerRecord[];
};

export type OfficialRosterSnapshotV1 = RosterSnapshotEnvelopeV1 & {
  readonly dataKind: "official";
  readonly dataStatus: "verified";
  readonly selectionRule: OfficialSelectionRule;
};

export type DerivedRosterSnapshotV1 = RosterSnapshotEnvelopeV1 & {
  readonly dataKind: "derived";
  readonly dataStatus: "verified";
  readonly selectionRule: DerivedSelectionRule;
};

/**
 * Provenance is a discriminated union so a derived snapshot cannot be
 * presented to the game as official WNBA data.
 */
export type RosterSnapshotV1 = DerivedRosterSnapshotV1 | OfficialRosterSnapshotV1;

export type RosterSnapshotParseResult =
  | { readonly ok: true; readonly snapshot: RosterSnapshotV1 }
  | { readonly ok: false; readonly issues: readonly string[] };

type JsonRecord = Record<string, unknown>;

type TwoUnknownValues = readonly [unknown, unknown];

const SNAPSHOT_KEYS = [
  "schemaVersion",
  "asOfDateUtc",
  "dataKind",
  "dataStatus",
  "sourceNote",
  "selectionRule",
  "players",
] as const;

const PLAYER_KEYS = [
  "playerId",
  "displayName",
  "searchName",
  "teamCode",
  "conference",
  "heightInches",
  "birthDateUtc",
  "draft",
  "country",
  "college",
  "positionPrimary",
  "positionAlternates",
] as const;

function asRecord(value: unknown, path: string, issues: string[]): JsonRecord | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    issues.push(`${path} must be an object.`);
    return undefined;
  }

  const record: JsonRecord = {};
  for (const [key, entry] of Object.entries(value)) {
    record[key] = entry;
  }
  return record;
}

function rejectUnexpectedKeys(
  record: JsonRecord,
  allowedKeys: readonly string[],
  path: string,
  issues: string[],
): void {
  for (const key of Object.keys(record)) {
    if (!allowedKeys.includes(key)) {
      issues.push(`${path}.${key} is not allowed.`);
    }
  }
}

function requiredString(
  record: JsonRecord,
  key: string,
  path: string,
  issues: string[],
): string | undefined {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push(`${path}.${key} must be a non-empty string.`);
    return undefined;
  }

  return value;
}

function requiredPositiveInteger(
  record: JsonRecord,
  key: string,
  path: string,
  issues: string[],
): number | undefined {
  const value = record[key];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    issues.push(`${path}.${key} must be a positive integer.`);
    return undefined;
  }

  return value;
}

function isTwoUnknownValues(value: unknown): value is TwoUnknownValues {
  return Array.isArray(value) && value.length === 2;
}

function isUtcDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(`${value}T`);
}

function isUtcDateTime(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) {
    return false;
  }

  const date = new Date(value);
  const normalized = date.toISOString().replace(".000Z", "Z");
  return !Number.isNaN(date.valueOf()) && normalized === value;
}

function parseConference(value: unknown, path: string, issues: string[]): Conference | undefined {
  if (value === "East" || value === "West") {
    return value;
  }

  issues.push(`${path} must be East or West.`);
  return undefined;
}

function parseSnapshotDataStatus(
  value: unknown,
  path: string,
  issues: string[],
): SnapshotDataStatus | undefined {
  if (value === "verified") {
    return value;
  }

  issues.push(`${path} must be verified.`);
  return undefined;
}

function parsePositionCode(
  value: unknown,
  path: string,
  issues: string[],
): PositionCode | undefined {
  if (value === "G" || value === "F" || value === "C") {
    return value;
  }

  issues.push(`${path} must be G, F, or C.`);
  return undefined;
}

function parsePositionAlternates(
  value: unknown,
  path: string,
  issues: string[],
): readonly PositionCode[] | undefined {
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array.`);
    return undefined;
  }

  const positions: PositionCode[] = [];
  for (const [index, item] of value.entries()) {
    const position = parsePositionCode(item, `${path}[${index}]`, issues);
    if (position !== undefined) {
      positions.push(position);
    }
  }

  return positions;
}

function parseDraft(value: unknown, path: string, issues: string[]): DraftInfo | undefined {
  const record = asRecord(value, path, issues);
  if (record === undefined) {
    return undefined;
  }

  const kind = record.kind;
  if (kind === "undrafted") {
    rejectUnexpectedKeys(record, ["kind"], path, issues);
    return { kind };
  }
  if (kind !== "drafted") {
    issues.push(`${path}.kind must be drafted or undrafted.`);
    return undefined;
  }

  rejectUnexpectedKeys(record, ["kind", "year", "overallPick"], path, issues);
  const year = requiredPositiveInteger(record, "year", path, issues);
  const overallPick = requiredPositiveInteger(record, "overallPick", path, issues);
  if (year === undefined || overallPick === undefined) {
    return undefined;
  }

  return { kind, year, overallPick };
}

function parsePlayer(value: unknown, path: string, issues: string[]): PlayerRecord | undefined {
  const record = asRecord(value, path, issues);
  if (record === undefined) {
    return undefined;
  }

  rejectUnexpectedKeys(record, PLAYER_KEYS, path, issues);
  const playerIdText = requiredString(record, "playerId", path, issues);
  const displayName = requiredString(record, "displayName", path, issues);
  const searchName = requiredString(record, "searchName", path, issues);
  const teamCode = requiredString(record, "teamCode", path, issues);
  const conference = parseConference(record.conference, `${path}.conference`, issues);
  const heightInches = requiredPositiveInteger(record, "heightInches", path, issues);
  const birthDateUtc = requiredString(record, "birthDateUtc", path, issues);
  const draft = parseDraft(record.draft, `${path}.draft`, issues);
  const country = requiredString(record, "country", path, issues);
  const college = requiredString(record, "college", path, issues);
  const positionPrimary = parsePositionCode(
    record.positionPrimary,
    `${path}.positionPrimary`,
    issues,
  );
  const positionAlternates = parsePositionAlternates(
    record.positionAlternates,
    `${path}.positionAlternates`,
    issues,
  );

  if (birthDateUtc !== undefined && !isUtcDateTime(birthDateUtc)) {
    issues.push(`${path}.birthDateUtc must be a UTC ISO timestamp.`);
  }
  if (
    playerIdText === undefined ||
    displayName === undefined ||
    searchName === undefined ||
    teamCode === undefined ||
    conference === undefined ||
    heightInches === undefined ||
    birthDateUtc === undefined ||
    !isUtcDateTime(birthDateUtc) ||
    draft === undefined ||
    country === undefined ||
    college === undefined ||
    positionPrimary === undefined ||
    positionAlternates === undefined
  ) {
    return undefined;
  }

  if (!/^\d+$/.test(playerIdText)) {
    issues.push(`${path}.playerId must contain decimal digits only.`);
    return undefined;
  }
  const playerId = playerIdFromString(playerIdText);

  return {
    playerId,
    displayName,
    searchName,
    teamCode,
    conference,
    heightInches,
    birthDateUtc,
    draft,
    country,
    college,
    positionPrimary,
    positionAlternates,
  };
}

function parseSelectionRule(
  value: unknown,
  dataKind: "official",
  path: string,
  issues: string[],
): OfficialSelectionRule | undefined;
function parseSelectionRule(
  value: unknown,
  dataKind: "derived",
  path: string,
  issues: string[],
): DerivedSelectionRule | undefined;
function parseSelectionRule(
  value: unknown,
  dataKind: SnapshotDataKind,
  path: string,
  issues: string[],
): SnapshotSelectionRule | undefined;
function parseSelectionRule(
  value: unknown,
  dataKind: SnapshotDataKind,
  path: string,
  issues: string[],
): SnapshotSelectionRule | undefined {
  const record = asRecord(value, path, issues);
  if (record === undefined) {
    return undefined;
  }

  rejectUnexpectedKeys(
    record,
    ["kind", "eligibilityGate", "recognizabilityMetric", "seasons", "cutoff", "selectedPoolSize"],
    path,
    issues,
  );
  const expectedRuleKind = dataKind === "official" ? "official" : "derived";
  if (
    record.kind !== expectedRuleKind ||
    record.eligibilityGate !== "current-roster" ||
    record.recognizabilityMetric !== "WNBA_FANTASY_PTS"
  ) {
    issues.push(`${path} must record the approved ${expectedRuleKind} selection rule.`);
    return undefined;
  }
  const seasonValues = record.seasons;
  if (!isTwoUnknownValues(seasonValues)) {
    issues.push(`${path}.seasons must contain current and preceding seasons.`);
    return undefined;
  }

  const currentSeason = seasonValues[0];
  const precedingSeason = seasonValues[1];
  if (typeof currentSeason !== "string" || !/^\d{4}$/.test(currentSeason)) {
    issues.push(`${path}.seasons[0] must be a four-digit current season.`);
  }
  if (typeof precedingSeason !== "string" || !/^\d{4}$/.test(precedingSeason)) {
    issues.push(`${path}.seasons[1] must be a four-digit preceding season.`);
  }
  const cutoff = requiredPositiveInteger(record, "cutoff", path, issues);
  const selectedPoolSize = requiredPositiveInteger(record, "selectedPoolSize", path, issues);
  if (
    typeof currentSeason !== "string" ||
    !/^\d{4}$/.test(currentSeason) ||
    typeof precedingSeason !== "string" ||
    !/^\d{4}$/.test(precedingSeason) ||
    cutoff === undefined ||
    selectedPoolSize === undefined
  ) {
    return undefined;
  }

  const currentSeasonNumber = Number(currentSeason);
  const precedingSeasonNumber = Number(precedingSeason);
  if (currentSeasonNumber - precedingSeasonNumber !== 1) {
    issues.push(`${path}.seasons must be distinct adjacent seasons in current-first order.`);
    return undefined;
  }

  const seasons: RecognizabilitySelectionRule["seasons"] = [currentSeason, precedingSeason];

  return {
    kind: expectedRuleKind,
    eligibilityGate: "current-roster",
    recognizabilityMetric: "WNBA_FANTASY_PTS",
    seasons,
    cutoff,
    selectedPoolSize,
  };
}

/**
 * Validate imported roster JSON at the one TypeScript boundary. The strict
 * allowlist prevents performance statistics from reaching the game bundle.
 */
export function parseRosterSnapshot(value: unknown): RosterSnapshotParseResult {
  const issues: string[] = [];
  const record = asRecord(value, "snapshot", issues);
  if (record === undefined) {
    return { ok: false, issues };
  }

  rejectUnexpectedKeys(record, SNAPSHOT_KEYS, "snapshot", issues);
  const schemaVersion = record.schemaVersion;
  const asOfDateUtc = requiredString(record, "asOfDateUtc", "snapshot", issues);
  const sourceNote = requiredString(record, "sourceNote", "snapshot", issues);
  const dataKind = record.dataKind;
  const dataStatus = parseSnapshotDataStatus(record.dataStatus, "snapshot.dataStatus", issues);
  if (schemaVersion !== 1) {
    issues.push("snapshot.schemaVersion must be 1.");
  }
  if (asOfDateUtc !== undefined && !isUtcDate(asOfDateUtc)) {
    issues.push("snapshot.asOfDateUtc must be a UTC date.");
  }
  if (dataKind !== "derived" && dataKind !== "official") {
    issues.push("snapshot.dataKind must be derived or official.");
  }
  if (dataKind === "official" && dataStatus !== "verified") {
    issues.push("Official snapshots must have verified status.");
  }
  if (dataKind === "derived" && dataStatus !== "verified") {
    issues.push("Derived snapshots must have verified status.");
  }

  const validDataKind: SnapshotDataKind | undefined =
    dataKind === "derived" || dataKind === "official" ? dataKind : undefined;
  const selectionRule =
    validDataKind === undefined
      ? undefined
      : parseSelectionRule(record.selectionRule, validDataKind, "snapshot.selectionRule", issues);
  if (!Array.isArray(record.players)) {
    issues.push("snapshot.players must be an array.");
  }

  const players: PlayerRecord[] = [];
  if (Array.isArray(record.players)) {
    for (const [index, valueAtIndex] of record.players.entries()) {
      const player = parsePlayer(valueAtIndex, `snapshot.players[${index}]`, issues);
      if (player !== undefined) {
        players.push(player);
      }
    }
  }
  if (players.length === 0) {
    issues.push("snapshot.players must contain at least one valid player.");
  }
  if (Array.isArray(record.players) && players.length !== record.players.length) {
    issues.push("snapshot.players contains an invalid player.");
  }

  if (
    (validDataKind === "derived" || validDataKind === "official") &&
    (selectionRule?.kind === "derived" || selectionRule?.kind === "official") &&
    selectionRule.selectedPoolSize !== players.length
  ) {
    issues.push("snapshot.selectionRule.selectedPoolSize must equal validated player count.");
  }

  const seenPlayerIds = new Set<PlayerId>();
  for (const player of players) {
    if (seenPlayerIds.has(player.playerId)) {
      issues.push(`snapshot.players contains duplicate playerId ${player.playerId}.`);
    }
    seenPlayerIds.add(player.playerId);
  }

  if (
    issues.length > 0 ||
    schemaVersion !== 1 ||
    asOfDateUtc === undefined ||
    !isUtcDate(asOfDateUtc) ||
    sourceNote === undefined ||
    validDataKind === undefined ||
    dataStatus === undefined ||
    selectionRule === undefined ||
    (dataKind === "derived" && dataStatus !== "verified") ||
    (dataKind === "official" && dataStatus !== "verified")
  ) {
    return { ok: false, issues };
  }

  if (validDataKind === "derived") {
    if (dataStatus !== "verified" || selectionRule.kind !== "derived") {
      return { ok: false, issues: ["Derived snapshot provenance was not validated."] };
    }

    const snapshot: DerivedRosterSnapshotV1 = {
      schemaVersion: 1,
      asOfDateUtc,
      dataKind: "derived",
      dataStatus: "verified",
      sourceNote,
      selectionRule,
      players,
    };
    return { ok: true, snapshot };
  }

  if (dataStatus !== "verified" || selectionRule.kind !== "official") {
    return { ok: false, issues: ["Official snapshot provenance was not validated."] };
  }

  const snapshot: OfficialRosterSnapshotV1 = {
    schemaVersion: 1,
    asOfDateUtc,
    dataKind: "official",
    dataStatus: "verified",
    sourceNote,
    selectionRule,
    players,
  };
  return { ok: true, snapshot };
}
