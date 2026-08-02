import type { PlayerId } from "./brands";
import { DEFAULT_GUESS_LIMIT } from "./constants";
import { reconcileTodayPuzzle, submitGuess } from "./game_state";
import { renderResultDialog, type ClipboardWriter } from "./result_dialog";
import { loadSaveData, saveSaveData } from "./save_load";
import { buildPlayerSearchIndex, normalizeSearchText, queryPlayerSearch } from "./search_index";
import type { PlayerSearchResult } from "./search_index";
import type { PlayerRecord, RosterSnapshotV1 } from "./types/player";
import type { KeyValueStore, SaveDataV1, ThemePreference } from "./types/save";
import { renderControls, type ControlsController, type SearchSuggestion } from "./ui_controls";
import { renderGrid } from "./ui_grid";

export type GameClock = {
  readonly todayUtc: () => string;
};

export type GameRandom = {
  readonly next: () => number;
};

export type PlayableGameOptions = {
  readonly root?: ParentNode;
  readonly snapshot: RosterSnapshotV1;
  readonly clock?: GameClock;
  readonly random?: GameRandom;
  readonly storage?: KeyValueStore;
  readonly clipboardWriter?: ClipboardWriter;
  readonly guessLimit?: number;
};

export type PlayableGameController = {
  readonly submitPlayerId: (playerId: PlayerId) => void;
  readonly pickForMe: () => void;
  readonly saveData: () => SaveDataV1;
};

type RuntimeState = {
  saveData: SaveDataV1;
  readonly snapshot: RosterSnapshotV1;
  readonly searchIndex: ReturnType<typeof buildPlayerSearchIndex>;
};

//============================================

/**
 * Joins the pure game modules to the browser UI. Clock, randomness, storage,
 * and clipboard access enter only here, keeping daily selection testable.
 */
export function bootPlayableGame(options: PlayableGameOptions): PlayableGameController {
  const root = options.root ?? document;
  const guessLimit = options.guessLimit ?? DEFAULT_GUESS_LIMIT;
  const clock = options.clock ?? browserClock();
  const random = options.random ?? browserRandom();
  const storage = options.storage ?? browserStorage();
  const gameRoot = requireElement<HTMLElement>(root, ".game-shell");
  const grid = requireElement<HTMLElement>(root, "#comparison-grid");
  const resultDialog = renderResultDialog(root, { clipboardWriter: options.clipboardWriter });
  const initialSaveData = reconcileTodayPuzzle(
    loadSaveData(storage, guessLimit),
    options.snapshot,
    clock.todayUtc(),
  ).saveData;
  const state: RuntimeState = {
    saveData: initialSaveData,
    snapshot: options.snapshot,
    searchIndex: buildPlayerSearchIndex(options.snapshot.players),
  };
  let controls: ControlsController | null = null;

  controls = renderControls(root, {
    onSearchInput(query: string): void {
      renderSearchSuggestions(query);
    },
    onSubmitGuess(query: string): void {
      submitSearchQuery(query);
    },
    onPickForMe(): void {
      pickForMe();
    },
    onThemePreferenceChange(preference: ThemePreference): void {
      state.saveData = { ...state.saveData, themePreference: preference };
      persistState();
    },
  });

  controls.setThemePreference(state.saveData.themePreference);
  persistState();
  renderState(state.saveData.puzzle?.status !== "active");
  gameRoot.dataset.ready = "true";

  function submitSearchQuery(query: string): void {
    const player = findExactPlayer(query);
    if (player === undefined) {
      controls?.setStatus("Choose a full player name from the matches, then make your guess.");
      return;
    }
    submitPlayerId(player.playerId);
  }

  function submitPlayerId(playerId: PlayerId): void {
    const result = submitGuess(state.saveData, state.snapshot, playerId, guessLimit);
    state.saveData = result.saveData;
    if (result.kind === "rejected") {
      controls?.setStatus(rejectionMessage(result.reason));
      return;
    }

    persistState();
    controls?.clearSearch();
    renderState(result.completedStatus !== null);
    if (result.completedStatus === null) {
      controls?.setStatus("Guess added. Use the clues to narrow the next player.");
    }
  }

  function pickForMe(): void {
    const puzzle = state.saveData.puzzle;
    if (puzzle === null || puzzle.status !== "active") {
      controls?.setStatus("Today's round is complete. Open the result to see the answer.");
      return;
    }
    const guessedIds = new Set(
      puzzle.guesses.map(function playerIdForGuess(guess) {
        return guess.guessedPlayerId;
      }),
    );
    const candidates = state.snapshot.players.filter(function selectUnusedPlayer(player) {
      return !guessedIds.has(player.playerId);
    });
    const selected = selectRandomPlayer(candidates, random.next());
    submitPlayerId(selected.playerId);
  }

  function renderSearchSuggestions(query: string): void {
    const puzzle = state.saveData.puzzle;
    const excludedIds = new Set(
      puzzle?.guesses.map(function playerIdForGuess(guess) {
        return guess.guessedPlayerId;
      }) ?? [],
    );
    const results = queryPlayerSearch(state.searchIndex, query, excludedIds);
    const suggestions = results.map(toSuggestion);
    controls?.setSuggestions(suggestions);
    if (query.trim().length > 0 && suggestions.length === 0) {
      controls?.setStatus("Keep typing or try another spelling.");
    }
  }

  function renderState(openResult: boolean): void {
    const puzzle = state.saveData.puzzle;
    if (puzzle === null) {
      throw new Error("Today's puzzle was not initialized.");
    }
    renderGrid(grid, puzzle.guesses);
    controls?.setAttemptSummary(puzzle.guesses.length, guessLimit);
    controls?.setStatisticsSummary(formatStatistics(state.saveData));
    controls?.setReady(puzzle.status === "active");

    if (puzzle.status === "active") {
      controls?.setStatus(
        puzzle.guesses.length === 0
          ? "Choose a player to make your first guess."
          : "Choose your next player from the active WNBA development pool.",
      );
      return;
    }

    const answer = findPlayer(puzzle.targetPlayerId);
    if (answer === undefined) {
      throw new Error("The completed puzzle target is missing from the bundled snapshot.");
    }
    controls?.setStatus(
      puzzle.status === "won"
        ? "You found today's player. Your result is ready."
        : "Out of guesses. Your result is ready.",
    );
    if (openResult && !resultDialog.isOpen()) {
      resultDialog.open({ puzzle, answerName: answer.displayName, guessLimit });
    }
  }

  function persistState(): void {
    const saved = saveSaveData(storage, state.saveData);
    if (!saved) {
      controls?.setStatus("Progress stays playable in this tab, but this browser cannot save it.");
    }
  }

  function findExactPlayer(query: string): PlayerRecord | undefined {
    const normalizedQuery = normalizeSearchText(query);
    return state.snapshot.players.find(function matchesPlayer(player) {
      return (
        normalizeSearchText(player.displayName) === normalizedQuery ||
        normalizeSearchText(player.searchName) === normalizedQuery
      );
    });
  }

  function findPlayer(playerId: PlayerId): PlayerRecord | undefined {
    return state.snapshot.players.find(function hasPlayerId(player) {
      return player.playerId === playerId;
    });
  }

  return { submitPlayerId, pickForMe, saveData: readSaveData };

  function readSaveData(): SaveDataV1 {
    return state.saveData;
  }
}

//============================================

function toSuggestion(result: PlayerSearchResult): SearchSuggestion {
  const suggestion: SearchSuggestion = {
    id: `player-option-${result.playerId}`,
    label: result.displayName,
    detail: `${result.team} | ${result.position}`,
  };
  return suggestion;
}

function selectRandomPlayer(players: readonly PlayerRecord[], randomValue: number): PlayerRecord {
  if (players.length === 0) {
    throw new Error("No unused players remain for Pick for me.");
  }
  if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
    throw new Error("Random selection must produce a number from 0 (inclusive) to 1 (exclusive).");
  }
  const selectedIndex = Math.floor(randomValue * players.length);
  const selected = players[selectedIndex];
  if (selected === undefined) {
    throw new Error("Random selection did not choose an eligible player.");
  }
  return selected;
}

function rejectionMessage(reason: string): string {
  if (reason === "duplicate-guess") {
    return "You already guessed that player. Keep the name or choose another match.";
  }
  if (reason === "puzzle-complete") {
    return "Today's round is complete. Open the result to see the answer.";
  }
  return "That player is unavailable in today's development player pool. Try another match.";
}

function formatStatistics(saveData: SaveDataV1): string {
  const statistics = saveData.statistics;
  const winRate =
    statistics.gamesPlayed === 0
      ? 0
      : Math.round((statistics.gamesWon / statistics.gamesPlayed) * 100);
  return (
    `${statistics.gamesPlayed} played, ${statistics.gamesWon} won (${winRate}%), ` +
    `${statistics.currentStreak} current streak, ${statistics.maximumStreak} best streak.`
  );
}

function browserClock(): GameClock {
  return {
    todayUtc(): string {
      return new Date().toISOString().slice(0, 10);
    },
  };
}

function browserRandom(): GameRandom {
  return { next: Math.random };
}

function browserStorage(): KeyValueStore {
  return {
    getItem(key: string): string | null {
      return window.localStorage.getItem(key);
    },
    setItem(key: string, value: string): void {
      window.localStorage.setItem(key, value);
    },
  };
}

function requireElement<ElementType extends Element>(
  root: ParentNode,
  selector: string,
): ElementType {
  const element = root.querySelector<ElementType>(selector);
  if (element === null) {
    throw new Error(`Required game element is missing: ${selector}`);
  }
  return element;
}
