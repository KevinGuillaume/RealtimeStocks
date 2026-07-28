const SELECTED_SYMBOL_KEY = "realtimestocks:selectedSymbol";

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
