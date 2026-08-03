import { createContext } from 'react'

// Carries the set of field paths a chat edit just changed, plus a callback to
// mark one "seen" (cleared). Provided by CVEditor, consumed by CVField — so the
// per-line highlight needs no prop threading through every section component.
export const ChatChangesContext = createContext({
  changedPaths: null,      // Set<string> of dotted field paths, or null
  onChangeSeen: () => {},  // (path) => void — clear a path once the user looks
})
