export function crosswordEdit(letters, entry, cell, value) {
  const nextLetters = [...letters];
  nextLetters[cell] = value.toUpperCase().replace(/[^A-Z]/g, '').slice(-1);
  const index = entry.cells.indexOf(cell);
  return { letters: nextLetters, next: entry.cells[Math.min(index + 1, entry.cells.length - 1)], answer: entry.cells.every(i => nextLetters[i]) ? entry.cells.map(i => nextLetters[i]).join('') : null };
}
