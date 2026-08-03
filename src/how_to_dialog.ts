export type HowToDialogOptions = {
  readonly onDismissed?: () => void;
};

export type HowToDialogController = {
  readonly open: () => void;
  readonly close: () => void;
  readonly isOpen: () => boolean;
};

/** Connects the static first-run guide while preserving native dialog focus and Escape behavior. */
export function renderHowToDialog(
  root: ParentNode = document,
  options: HowToDialogOptions = {},
): HowToDialogController {
  const dialog = requireElement<HTMLDialogElement>(root, "dialog.how-to-dialog");
  const openButton = requireElement<HTMLButtonElement>(root, "#how-to-open");
  const startButton = requireElement<HTMLButtonElement>(root, "#how-to-start");
  const fallbackFocus = requireElement<HTMLInputElement>(root, "#player-search");
  let previouslyFocused: HTMLElement | null = null;

  openButton.addEventListener("click", open);
  dialog.addEventListener("close", handleClose);

  function open(): void {
    if (dialog.open) {
      return;
    }
    previouslyFocused = focusedElement();
    dialog.showModal();
    startButton.focus();
  }

  function close(): void {
    if (dialog.open) {
      dialog.close();
    }
  }

  function isOpen(): boolean {
    return dialog.open;
  }

  function handleClose(): void {
    options.onDismissed?.();
    const focusTarget = previouslyFocused;
    previouslyFocused = null;
    if (focusTarget !== null && focusTarget !== document.body && focusTarget.isConnected) {
      focusTarget.focus();
      return;
    }
    fallbackFocus.focus();
  }

  return { open, close, isOpen };
}

function focusedElement(): HTMLElement | null {
  const activeElement = document.activeElement;
  return activeElement instanceof HTMLElement ? activeElement : null;
}

function requireElement<ElementType extends Element>(
  root: ParentNode,
  selector: string,
): ElementType {
  const element = root.querySelector<ElementType>(selector);
  if (element === null) {
    throw new Error(`Required how-to element is missing: ${selector}`);
  }
  return element;
}
