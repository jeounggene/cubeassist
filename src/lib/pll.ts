// Pure helpers for the PLL recognition quiz. The case data itself lives in
// data/cases/pll.json; this module only derives display labels and the board.

// "PLL Aa perm" -> "Aa", "PLL E perm" -> "E".
export function pllShortName(name: string): string {
  return name.replace(/^PLL\s+/, "").replace(/\s+perm$/, "");
}

// The 21 PLLs grouped by family so the answer board stays scannable.
export const PLL_GROUPS: string[][] = [
  ["Aa", "Ab"],
  ["E"],
  ["F"],
  ["Ga", "Gb", "Gc", "Gd"],
  ["H"],
  ["Ja", "Jb"],
  ["Na", "Nb"],
  ["Ra", "Rb"],
  ["T"],
  ["Ua", "Ub"],
  ["V"],
  ["Y"],
  ["Z"],
];

export const PLL_NAMES: string[] = PLL_GROUPS.flat();

// "Aa" -> "A", "Gd" -> "G", "E" -> "E": drop the lowercase variant suffix to
// leave the PLL's family letter.
export function pllLetter(short: string): string {
  return short.replace(/[a-z]+$/, "");
}

// The 13 PLL families — each group is exactly one letter.
export const PLL_LETTERS: string[] = PLL_GROUPS.map((g) => pllLetter(g[0]));

// Appended to a case's alg to show it from a random one of its four angles.
// Any U-family suffix yields a valid alternate AUF of the same PLL.
export const AUFS = ["", "U", "U2", "U'"] as const;
