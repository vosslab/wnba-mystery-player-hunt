import type { ThemePreference } from "./types/save";

export type SearchSuggestion = {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
};

export type ControlsCallbacks = {
  readonly onSearchInput?: (query: string) => void;
  readonly onSubmitGuess?: (query: string) => void;
  readonly onSuggestionSelected?: (suggestion: SearchSuggestion) => void;
  readonly onPickForMe?: () => void;
  readonly onThemePreferenceChange?: (preference: ThemePreference) => void;
};

export type ControlsController = {
  readonly setReady: (ready: boolean) => void;
  readonly setStatus: (message: string) => void;
  readonly setSuggestions: (suggestions: readonly SearchSuggestion[]) => void;
  readonly clearSearch: () => void;
  readonly setAttemptSummary: (attempts: number, guessLimit: number) => void;
  readonly setStatisticsSummary: (summary: string) => void;
  readonly setThemePreference: (preference: ThemePreference) => void;
};

/**
 * Connects the static, accessible controls to callbacks supplied by the game layer.
 * The controller has no storage dependency: save_load owns the one persisted save record.
 */
export function renderControls(
  root: ParentNode = document,
  callbacks: ControlsCallbacks = {},
): ControlsController {
  const searchInput = requireElement<HTMLInputElement>(root, "#player-search");
  const guessForm = requireElement<HTMLFormElement>(root, "#guess-form");
  const guessButton = requireElement<HTMLButtonElement>(root, "#guess-button");
  const pickButton = requireElement<HTMLButtonElement>(root, "#pick-player");
  const status = requireElement<HTMLElement>(root, "#game-status");
  const suggestionList = requireElement<HTMLElement>(root, "#player-suggestions");
  const guessCount = requireElement<HTMLElement>(root, ".guess-count");
  const statistics = requireElement<HTMLElement>(root, "#statistics-summary");
  const themeControls = root.querySelectorAll<HTMLInputElement>('input[name="theme"]');
  let suggestions: readonly SearchSuggestion[] = [];
  let activeIndex = -1;

  searchInput.addEventListener("input", handleSearchInput);
  searchInput.addEventListener("keydown", handleSearchKeydown);
  guessForm.addEventListener("submit", handleSubmit);
  pickButton.addEventListener("click", handlePickForMe);
  for (const control of themeControls) {
    control.addEventListener("change", handleThemeChange);
  }

  function handleSearchInput(): void {
    callbacks.onSearchInput?.(searchInput.value);
  }

  function handleSearchKeydown(event: KeyboardEvent): void {
    if (event.key === "ArrowDown") {
      if (suggestions.length > 0) {
        event.preventDefault();
        setActiveIndex(activeIndex + 1);
      }
      return;
    }
    if (event.key === "ArrowUp") {
      if (suggestions.length > 0) {
        event.preventDefault();
        setActiveIndex(activeIndex - 1);
      }
      return;
    }
    if (event.key === "Escape") {
      clearSuggestions();
      return;
    }
    if (event.key === "Enter" && activeIndex >= 0) {
      const suggestion = suggestions[activeIndex];
      if (suggestion !== undefined) {
        event.preventDefault();
        selectSuggestion(suggestion, true);
      }
    }
  }

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    callbacks.onSubmitGuess?.(searchInput.value);
  }

  function handlePickForMe(): void {
    callbacks.onPickForMe?.();
  }

  function handleThemeChange(event: Event): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement) || !target.checked) {
      return;
    }
    const preference = parseThemePreference(target.value);
    applyThemePreference(preference);
    callbacks.onThemePreferenceChange?.(preference);
  }

  function setReady(ready: boolean): void {
    searchInput.disabled = !ready;
    guessButton.disabled = !ready;
    pickButton.disabled = !ready;
    if (!ready) {
      clearSuggestions();
    }
  }

  function setStatus(message: string): void {
    status.textContent = message;
  }

  function setSuggestions(nextSuggestions: readonly SearchSuggestion[]): void {
    suggestions = nextSuggestions;
    activeIndex = suggestions.length > 0 ? 0 : -1;
    renderSuggestions();
  }

  function clearSearch(): void {
    searchInput.value = "";
    clearSuggestions();
    searchInput.focus();
  }

  function setAttemptSummary(attempts: number, guessLimit: number): void {
    const remaining = Math.max(guessLimit - attempts, 0);
    const label = `${remaining} ${remaining === 1 ? "guess" : "guesses"} left`;
    guessCount.textContent = label;
    guessCount.setAttribute("aria-label", label);
  }

  function setStatisticsSummary(summary: string): void {
    statistics.textContent = summary;
  }

  function setThemePreference(preference: ThemePreference): void {
    applyThemePreference(preference);
    const control = root.querySelector<HTMLInputElement>(
      `input[name="theme"][value="${preference}"]`,
    );
    if (control !== null) {
      control.checked = true;
    }
  }

  function setActiveIndex(nextIndex: number): void {
    if (suggestions.length === 0) {
      activeIndex = -1;
      renderSuggestions();
      return;
    }
    const lastIndex = suggestions.length - 1;
    activeIndex = nextIndex < 0 ? lastIndex : nextIndex > lastIndex ? 0 : nextIndex;
    renderSuggestions();
  }

  function clearSuggestions(): void {
    suggestions = [];
    activeIndex = -1;
    renderSuggestions();
  }

  function renderSuggestions(): void {
    suggestionList.replaceChildren();
    const activeSuggestion = suggestions[activeIndex];
    searchInput.setAttribute("aria-expanded", String(suggestions.length > 0));
    if (activeSuggestion === undefined) {
      searchInput.removeAttribute("aria-activedescendant");
    } else {
      searchInput.setAttribute("aria-activedescendant", activeSuggestion.id);
    }

    for (const [index, suggestion] of suggestions.entries()) {
      const item = createSuggestion(suggestion, index === activeIndex);
      item.addEventListener("mousedown", preventFocusLoss);
      item.addEventListener("click", handleSuggestionClick);
      suggestionList.append(item);
    }
  }

  function preventFocusLoss(event: MouseEvent): void {
    event.preventDefault();
  }

  function handleSuggestionClick(event: MouseEvent): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLLIElement)) {
      return;
    }
    const selectedId = target.id;
    const suggestion = suggestions.find(function findSuggestion(
      candidate: SearchSuggestion,
    ): boolean {
      return candidate.id === selectedId;
    });
    if (suggestion !== undefined) {
      selectSuggestion(suggestion, false);
    }
  }

  function selectSuggestion(suggestion: SearchSuggestion, submit: boolean): void {
    searchInput.value = suggestion.label;
    clearSuggestions();
    callbacks.onSuggestionSelected?.(suggestion);
    if (submit) {
      callbacks.onSubmitGuess?.(suggestion.label);
    }
  }

  setReady(false);
  setAttemptSummary(0, 6);
  return {
    setReady,
    setStatus,
    setSuggestions,
    clearSearch,
    setAttemptSummary,
    setStatisticsSummary,
    setThemePreference,
  };
}

/** Applies a preference while leaving persistence to the save integration layer. */
export function applyThemePreference(preference: ThemePreference): void {
  if (preference === "system") {
    document.documentElement.removeAttribute("data-theme");
    return;
  }
  document.documentElement.dataset.theme = preference;
}

function createSuggestion(suggestion: SearchSuggestion, active: boolean): HTMLLIElement {
  const item = document.createElement("li");
  item.id = suggestion.id;
  item.setAttribute("role", "option");
  item.setAttribute("aria-selected", String(active));
  item.dataset.suggestion = "player";
  item.textContent = `${suggestion.label} - ${suggestion.detail}`;
  return item;
}

function parseThemePreference(value: string): ThemePreference {
  if (value === "system" || value === "light" || value === "dark") {
    return value;
  }
  throw new Error(`Unsupported theme preference: ${value}`);
}

function requireElement<ElementType extends Element>(
  root: ParentNode,
  selector: string,
): ElementType {
  const element = root.querySelector<ElementType>(selector);
  if (element === null) {
    throw new Error(`Required control is missing: ${selector}`);
  }
  return element;
}
