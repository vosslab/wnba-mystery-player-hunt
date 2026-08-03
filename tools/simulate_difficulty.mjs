/**
 * Deterministically measures how the current static roster behaves under two
 * simple guessing strategies. This is intentionally an offline analysis tool:
 * it reads a committed roster file and never fetches data or opens a browser.
 */
import { readFile } from "node:fs/promises";

import { evaluateGuess } from "../src/clue_engine.ts";
import { parseRosterSnapshot } from "../src/types/player.ts";

const DEFAULT_INPUT = new URL("../src/data/roster.json", import.meta.url);

function usage() {
  return [
    "Usage: node --import tsx tools/simulate_difficulty.mjs [options]",
    "",
    "Options:",
    "  --input PATH       Static roster file (default: src/data/roster.json)",
    "  --puzzle-date DATE UTC calendar date used for age feedback (default: roster as-of date)",
    "  --json             Emit machine-readable results",
    "  -h, --help         Show this help",
  ].join("\n");
}

function parseArguments(argumentsList) {
  const options = { input: DEFAULT_INPUT, puzzleDate: undefined, json: false };
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "-h" || argument === "--help") {
      console.log(usage());
      process.exit(0);
    }
    if (argument === "--json") {
      options.json = true;
      continue;
    }
    if (argument === "--input" || argument === "--puzzle-date") {
      const value = argumentsList[index + 1];
      if (value === undefined || value.startsWith("-")) {
        throw new Error(`${argument} requires a value.`);
      }
      if (argument === "--input") {
        options.input = value;
      } else {
        options.puzzleDate = value;
      }
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${argument}`);
  }
  return options;
}

function feedbackSignature(guess, target, puzzleDateUtc, clueId) {
  return evaluateGuess(guess, target, puzzleDateUtc)
    .cells.filter((cell) => clueId === undefined || cell.clueId === clueId)
    .map((cell) => cell.match)
    .join("|");
}

function expectedRemainingSize(candidates, guess, puzzleDateUtc) {
  const buckets = new Map();
  for (const target of candidates) {
    const signature = feedbackSignature(guess, target, puzzleDateUtc);
    buckets.set(signature, (buckets.get(signature) ?? 0) + 1);
  }
  const squareTotal = [...buckets.values()].reduce((total, size) => total + size * size, 0);
  return squareTotal / candidates.length;
}

function chooseInformationGainGuess(candidates, puzzleDateUtc) {
  let bestGuess = candidates[0];
  let bestExpectedSize = Number.POSITIVE_INFINITY;
  for (const guess of candidates) {
    const expectedSize = expectedRemainingSize(candidates, guess, puzzleDateUtc);
    if (
      expectedSize < bestExpectedSize ||
      (expectedSize === bestExpectedSize && guess.playerId < bestGuess.playerId)
    ) {
      bestGuess = guess;
      bestExpectedSize = expectedSize;
    }
  }
  return bestGuess;
}

function remainingCandidates(candidates, guess, target, puzzleDateUtc) {
  const observed = feedbackSignature(guess, target, puzzleDateUtc);
  return candidates.filter(
    (candidate) =>
      candidate.playerId !== guess.playerId &&
      feedbackSignature(guess, candidate, puzzleDateUtc) === observed,
  );
}

function verifyIdentityElimination(players, puzzleDateUtc) {
  const original = players[0];
  const identicalProfile = {
    ...original,
    playerId: `${original.playerId}-identical-profile`,
    displayName: `${original.displayName} duplicate`,
    searchName: `${original.searchName} duplicate`,
  };
  const remaining = remainingCandidates(
    [original, identicalProfile],
    original,
    identicalProfile,
    puzzleDateUtc,
  );
  if (remaining.length !== 1 || remaining[0].playerId !== identicalProfile.playerId) {
    throw new Error("Identity-elimination self-check failed.");
  }
}

function chooseLowestId(candidates) {
  return candidates.reduce((lowest, candidate) =>
    candidate.playerId < lowest.playerId ? candidate : lowest,
  );
}

function playOne(players, target, puzzleDateUtc, guessLimit, strategy) {
  let candidates = players;
  for (let attempt = 1; attempt <= guessLimit; attempt += 1) {
    const guess =
      strategy === "information-gain"
        ? chooseInformationGainGuess(candidates, puzzleDateUtc)
        : chooseLowestId(candidates);
    if (guess.playerId === target.playerId) {
      return { solved: true, attempts: attempt };
    }
    candidates = remainingCandidates(candidates, guess, target, puzzleDateUtc);
  }
  return { solved: false, attempts: null };
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function summarize(players, puzzleDateUtc, guessLimit, strategy) {
  const outcomes = players.map((target) =>
    playOne(players, target, puzzleDateUtc, guessLimit, strategy),
  );
  const solvedAttempts = outcomes.flatMap((outcome) =>
    outcome.solved && outcome.attempts !== null ? [outcome.attempts] : [],
  );
  const distribution = Object.fromEntries(
    Array.from({ length: guessLimit }, (_, index) => index + 1).map((attempt) => [
      attempt,
      solvedAttempts.filter((solvedAttempt) => solvedAttempt === attempt).length,
    ]),
  );
  const losses = outcomes.length - solvedAttempts.length;
  return {
    guessLimit,
    strategy,
    solved: solvedAttempts.length,
    losses,
    lossRate: losses / outcomes.length,
    meanSolvedAttempts:
      solvedAttempts.length === 0
        ? null
        : solvedAttempts.reduce((total, attempts) => total + attempts, 0) / solvedAttempts.length,
    medianSolvedAttempts: solvedAttempts.length === 0 ? null : median(solvedAttempts),
    distribution,
  };
}

function measureClueDiscrimination(players, puzzleDateUtc) {
  const clueIds = evaluateGuess(players[0], players[0], puzzleDateUtc).cells.map(
    (cell) => cell.clueId,
  );
  return clueIds.map((clueId) => {
    let expectedRemainingTotal = 0;
    for (const guess of players) {
      const buckets = new Map();
      for (const target of players) {
        const signature = feedbackSignature(guess, target, puzzleDateUtc, clueId);
        buckets.set(signature, (buckets.get(signature) ?? 0) + 1);
      }
      expectedRemainingTotal += [...buckets.values()].reduce(
        (total, size) => total + size * size,
        0,
      );
    }
    const expectedRemaining = expectedRemainingTotal / (players.length * players.length);
    return {
      clueId,
      expectedRemaining,
      reductionPercent: (1 - expectedRemaining / players.length) * 100,
    };
  });
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value) {
  return value === null ? "n/a" : value.toFixed(2);
}

function renderText(result) {
  const lines = [
    "WNBA difficulty simulation (offline static roster)",
    `Roster: ${result.dataKind}/${result.dataStatus}, ${result.playerCount} players`,
    `Puzzle date: ${result.puzzleDateUtc}`,
    "Identity-elimination self-check: passed",
    `Baseline first guess: ${result.baselineFirstGuess.displayName} (${result.baselineFirstGuess.playerId})`,
    "",
    "Information-gain baseline:",
    "limit  solved  losses  loss rate  mean solved  median solved  distribution",
  ];
  for (const summary of result.baseline) {
    const distribution = Object.entries(summary.distribution)
      .map(([attempt, count]) => `${attempt}:${count}`)
      .join(" ");
    lines.push(
      `${summary.guessLimit}      ${summary.solved}       ${summary.losses}       ${formatPercent(summary.lossRate).padEnd(8)} ${formatNumber(summary.meanSolvedAttempts).padEnd(12)} ${formatNumber(summary.medianSolvedAttempts).padEnd(13)} ${distribution}`,
    );
  }
  lines.push("", "Lowest-playerId sensitivity:");
  for (const summary of result.lowestId) {
    lines.push(
      `${summary.guessLimit} guesses: ${summary.solved} solved, ${summary.losses} losses (${formatPercent(summary.lossRate)}).`,
    );
  }
  lines.push("", "Single-clue discrimination (lower expected remaining is stronger):");
  for (const clue of result.clues) {
    lines.push(
      `${clue.clueId}: ${clue.expectedRemaining.toFixed(2)} expected remaining, ${clue.reductionPercent.toFixed(1)}% reduction.`,
    );
  }
  return lines.join("\n");
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const inputText = await readFile(options.input, "utf8");
  const parsed = parseRosterSnapshot(JSON.parse(inputText));
  if (!parsed.ok) {
    throw new Error(`Invalid roster file:\n${parsed.issues.join("\n")}`);
  }
  const snapshot = parsed.snapshot;
  const puzzleDateUtc = options.puzzleDate ?? snapshot.asOfDateUtc;
  const players = [...snapshot.players].sort((left, right) =>
    left.playerId.localeCompare(right.playerId),
  );
  if (players.length === 0) {
    throw new Error("Roster file contains no players.");
  }
  verifyIdentityElimination(players, puzzleDateUtc);
  const result = {
    dataKind: snapshot.dataKind,
    dataStatus: snapshot.dataStatus,
    playerCount: players.length,
    puzzleDateUtc,
    baselineFirstGuess: chooseInformationGainGuess(players, puzzleDateUtc),
    baseline: [5, 6, 7, 9].map((guessLimit) =>
      summarize(players, puzzleDateUtc, guessLimit, "information-gain"),
    ),
    lowestId: [5, 6, 7, 9].map((guessLimit) =>
      summarize(players, puzzleDateUtc, guessLimit, "lowest-id"),
    ),
    clues: measureClueDiscrimination(players, puzzleDateUtc),
  };
  console.log(options.json ? JSON.stringify(result, null, 2) : renderText(result));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`simulate_difficulty: ${message}`);
  process.exitCode = 1;
});
