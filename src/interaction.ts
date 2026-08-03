import type { PlayerId } from "./brands";
import { DEFAULT_GUESS_LIMIT } from "./constants";
import { reconcileTodayPuzzle, submitGuess } from "./game_state";
import { renderResultDialog, type ClipboardWriter } from "./result_dialog";
import { loadSaveData, saveSaveData } from "./save_load";
import { scoreAvailableAfter, scoreForWin } from "./score";
import { buildPlayerSearchIndex, normalizeSearchText, queryPlayerSearch } from "./search_index";
import type { PlayerSearchResult } from "./search_index";
import type { GameMode } from "./types/game";
import type { PlayerRecord, RosterSnapshotV1 } from "./types/player";
import type { DailyPuzzleState } from "./types/puzzle";
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
  readonly mode: () => GameMode;
};

type RuntimeState = {
  dailySaveData: SaveDataV1;
  practicePuzzle: DailyPuzzleState | null;
  mode: GameMode;
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
    dailySaveData: initialSaveData,
    practicePuzzle: null,
    mode: "daily",
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
    onGameModeChange(mode: GameMode): void {
      changeGameMode(mode);
    },
    onNewPracticePlayer(): void {
      startNewPracticeRound();
    },
    onThemePreferenceChange(preference: ThemePreference): void {
      state.dailySaveData = { ...state.dailySaveData, themePreference: preference };
      persistDailyState();
    },
  });

  controls.setThemePreference(state.dailySaveData.themePreference);
  persistDailyState();
  renderState(state.dailySaveData.puzzle?.status !== "active");
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
    const result = submitGuess(activeSaveData(), state.snapshot, playerId, guessLimit);
    if (state.mode === "daily") {
      state.dailySaveData = result.saveData;
    } else {
      state.practicePuzzle = result.saveData.puzzle;
    }
    if (result.kind === "rejected") {
      controls?.setStatus(rejectionMessage(result.reason));
      return;
    }

    if (state.mode === "daily") {
      persistDailyState();
    }
    controls?.clearSearch();
    renderState(result.completedStatus !== null);
    if (result.completedStatus === null) {
      controls?.setStatus("Guess added. Use the clues to narrow the next player.");
    }
  }

  function pickForMe(): void {
    const puzzle = activePuzzle();
    if (puzzle === null || puzzle.status !== "active") {
      controls?.setStatus("This round is complete. Start another practice or return to Daily.");
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
    controls?.setSearchValue(selected.displayName);
    controls?.setStatus(`${selected.displayName} selected. Press Guess when you are ready.`);
  }

  function renderSearchSuggestions(query: string): void {
    const puzzle = activePuzzle();
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
    const puzzle = activePuzzle();
    if (puzzle === null) {
      throw new Error("The active puzzle was not initialized.");
    }
    gameRoot.dataset.mode = state.mode;
    renderGrid(grid, puzzle.guesses);
    controls?.setGameMode(state.mode);
    controls?.setRoundSummary(formatRoundSummary(puzzle, guessLimit));
    controls?.setStatisticsSummary(formatStatistics(state.dailySaveData));
    controls?.setReady(puzzle.status === "active");

    if (puzzle.status === "active") {
      controls?.setStatus(activeRoundStatus(state.mode, puzzle.guesses.length));
      return;
    }

    const answer = findPlayer(puzzle.targetPlayerId);
    if (answer === undefined) {
      throw new Error("The completed puzzle target is missing from the bundled snapshot.");
    }
    controls?.setStatus(completedRoundStatus(state.mode, puzzle.status));
    if (openResult && !resultDialog.isOpen()) {
      resultDialog.open({
        puzzle,
        answerName: answer.displayName,
        guessLimit,
        mode: state.mode,
        onNewPracticePlayer: startNewPracticeRound,
      });
    }
  }

  function changeGameMode(mode: GameMode): void {
    if (mode === state.mode) {
      return;
    }

    resultDialog.close();
    if (mode === "practice" && state.practicePuzzle === null) {
      startNewPracticeRound();
      return;
    }

    state.mode = mode;
    const puzzle = activePuzzle();
    renderState(puzzle?.status !== "active");
  }

  function startNewPracticeRound(): void {
    resultDialog.close();
    const excludedIds = new Set<PlayerId>();
    const dailyTargetId = state.dailySaveData.puzzle?.targetPlayerId;
    if (dailyTargetId !== undefined) {
      excludedIds.add(dailyTargetId);
    }
    if (state.practicePuzzle !== null) {
      excludedIds.add(state.practicePuzzle.targetPlayerId);
    }

    const freshCandidates = state.snapshot.players.filter(function selectFreshTarget(player) {
      return !excludedIds.has(player.playerId);
    });
    const candidates = freshCandidates.length > 0 ? freshCandidates : state.snapshot.players;
    const target = selectRandomPlayer(candidates, random.next());
    state.practicePuzzle = {
      puzzleDateUtc: clock.todayUtc(),
      targetPlayerId: target.playerId,
      status: "active",
      guesses: [],
    };
    state.mode = "practice";
    renderState(false);
    controls?.clearSearch();
  }

  function activePuzzle(): DailyPuzzleState | null {
    return state.mode === "daily" ? state.dailySaveData.puzzle : state.practicePuzzle;
  }

  function activeSaveData(): SaveDataV1 {
    if (state.mode === "daily") {
      return state.dailySaveData;
    }
    if (state.practicePuzzle === null) {
      throw new Error("Practice mode requires an active practice puzzle.");
    }
    return { ...state.dailySaveData, puzzle: state.practicePuzzle };
  }

  function persistDailyState(): void {
    const saved = saveSaveData(storage, state.dailySaveData);
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

  return { submitPlayerId, pickForMe, saveData: readSaveData, mode: readMode };

  function readSaveData(): SaveDataV1 {
    return state.dailySaveData;
  }

  function readMode(): GameMode {
    return state.mode;
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

function formatRoundSummary(puzzle: DailyPuzzleState, guessLimit: number): string {
  const attempts = puzzle.guesses.length;
  if (puzzle.status === "won") {
    return `${attempts}/${guessLimit} | ${scoreForWin(attempts)} pts`;
  }
  if (puzzle.status === "lost") {
    return `0 left | 0 pts`;
  }

  const remaining = Math.max(guessLimit - attempts, 0);
  const availableScore = scoreAvailableAfter(attempts);
  return `${remaining} left | ${availableScore} pts available`;
}

function activeRoundStatus(mode: GameMode, attempts: number): string {
  if (mode === "practice") {
    return attempts === 0
      ? "Practice round. Daily statistics stay unchanged. Choose your first player."
      : "Practice round. Use the clues to choose your next player.";
  }
  return attempts === 0
    ? "Choose a player to make your first daily guess."
    : "Choose your next player from the bundled player pool.";
}

function completedRoundStatus(mode: GameMode, status: DailyPuzzleState["status"]): string {
  if (mode === "practice") {
    return status === "won"
      ? "Practice solved. Start another player whenever you're ready."
      : "Practice complete. Start another player and try again.";
  }
  return status === "won"
    ? "You found today's player. Your result is ready."
    : "Out of guesses. Your result is ready.";
}

function rejectionMessage(reason: string): string {
  if (reason === "duplicate-guess") {
    return "You already guessed that player. Keep the name or choose another match.";
  }
  if (reason === "puzzle-complete") {
    return "This round is complete. Start another practice or return to Daily.";
  }
  return "That player is unavailable in today's bundled player pool. Try another match.";
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
