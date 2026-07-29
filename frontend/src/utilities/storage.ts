const SELECTED_SYMBOL_KEY = "realtimestocks:selectedSymbol";
const INSTRUCTIONS_OPEN_KEY = "realtimestocks:instructionsOpen";

export function getStoredSymbol(): string | null {
  try {
    return localStorage.getItem(SELECTED_SYMBOL_KEY);
  } catch {
    return null;
  }
}

export function setStoredSymbol(symbol: string | null): void {
  try {
    if (symbol) localStorage.setItem(SELECTED_SYMBOL_KEY, symbol);
    else localStorage.removeItem(SELECTED_SYMBOL_KEY);
  } catch {
    // localStorage unavailable (private browsing, disabled, etc.) — ignore
  }
}

// Defaults to closed the first time — only stays open once the user has
// explicitly expanded it.
export function getStoredInstructionsOpen(): boolean {
  try {
    return localStorage.getItem(INSTRUCTIONS_OPEN_KEY) === "true";
  } catch {
    return false;
  }
}

export function setStoredInstructionsOpen(open: boolean): void {
  try {
    localStorage.setItem(INSTRUCTIONS_OPEN_KEY, String(open));
  } catch {
    // localStorage unavailable (private browsing, disabled, etc.) — ignore
  }
}
