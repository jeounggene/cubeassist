export type QueueState = { queue: string[]; deviated: boolean };

export function invertToken(token: string): string {
  if (token.endsWith("2")) return token;
  if (token.endsWith("'")) return token[0];
  return `${token}'`;
}

// Quarter-turn count of a token, mod 4: R=1, R2=2, R'=3.
function amount(token: string): number {
  if (token.endsWith("2")) return 2;
  if (token.endsWith("'")) return 3;
  return 1;
}

// Shortest token for `face` turned `amt` quarters (null if a no-op).
function tokenFor(face: string, amt: number): string | null {
  const a = ((amt % 4) + 4) % 4;
  if (a === 0) return null;
  return a === 1 ? face : a === 2 ? `${face}2` : `${face}'`;
}

// Expand a scramble into single quarter-turn tokens ("R U2 R'" -> R U U R').
export function initQueue(scramble: string): string[] {
  const out: string[] = [];
  for (const tok of scramble.trim().split(/\s+/).filter(Boolean)) {
    if (tok.endsWith("2")) out.push(tok[0], tok[0]);
    else out.push(tok);
  }
  return out;
}

// Feed one physical quarter-turn. Correct move (matches head) => pop it. Wrong move =>
// prepend its inverse (the user must undo it). Invariant: applyAlg(state, queue) == target.
// A wrong move can never equal the head, so no head-cancellation case arises here; a
// prepended correction is worked off by simply doing it (which hits the pop branch).
export function applyMove(queue: string[], move: string): QueueState {
  if (queue.length > 0 && queue[0] === move) {
    return { queue: queue.slice(1), deviated: false };
  }
  return { queue: [invertToken(move), ...queue], deviated: true };
}

// Collapse adjacent same-face runs for a compact display ("R R" -> "R2", "R R'" -> "").
export function simplifyForDisplay(queue: string[]): string[] {
  const out: string[] = [];
  for (const tok of queue) {
    const last = out[out.length - 1];
    if (last && last[0] === tok[0]) {
      const merged = tokenFor(tok[0], amount(last) + amount(tok));
      out.pop();
      if (merged != null) out.push(merged);
    } else {
      out.push(tok);
    }
  }
  return out;
}
