import { validBoard, type Board, type Block } from "./model";

export const PUZZLE_VERSION = "v1";

// Frozen, solver-validated templates. Order and contents are part of v1's identity.
const TEMPLATES = [
  "X1,2,2H A3,2,2V B3,4,3H C2,0,2H D0,0,2V E3,1,2H F4,2,2V G1,5,2H H2,3,2V I5,0,3V",
  "X0,2,2H A3,4,3H B5,2,2V C3,5,3H D5,0,2V E1,4,2H F3,3,2H G0,1,2H H0,4,2V I3,1,2V J0,0,2H K0,3,2H L2,1,2V",
  "X0,2,2H A2,5,3H B3,0,2H C5,0,2V D1,3,2H E2,0,3V F5,2,2V G2,4,3H H3,1,2H I1,4,2V J3,2,2V",
  "X0,2,2H A1,4,2V B3,1,2V C2,4,3H D0,0,2V E1,3,2H F4,2,2V G0,4,2V H5,4,2V I5,0,2V J2,0,3V",
  "X1,2,2H A5,1,2V B1,0,3H C4,2,2V D2,4,3H E0,4,2V F4,0,2H G3,2,2V H0,2,2V I3,1,2H J1,4,2V",
  "X0,2,2H A0,4,2H B4,2,2V C2,0,3V D3,1,2H E0,3,2H F5,1,2V G2,5,3H H5,3,2V I0,5,2H J2,4,3H K3,2,2V",
  "X1,2,2H A0,1,2V B5,3,2V C4,1,3V D1,0,3H E3,3,2V F2,3,3V G4,0,2H H3,5,2H I0,3,2V J1,4,2V K1,1,2H L3,1,2V",
  "X1,2,2H A3,5,2H B5,2,2V C1,1,2H D0,2,3V E3,0,2V F4,4,2H G2,3,2V H4,1,2H I1,5,2H J3,3,2V K4,0,2H L0,0,2H",
] as const;

function parseTemplate(template: string): Board {
  return template.split(" ").map(part => {
    const match = /^([A-Z])(\d),(\d),([23])([HV])$/.exec(part);
    if (!match) throw new Error("Invalid SlipOut template");
    return { id: match[1], x: Number(match[2]), y: Number(match[3]), length: Number(match[4]) as 2 | 3,
      axis: match[5] as Block["axis"] };
  });
}

export type Puzzle = { id: string; date: string; number: number; blocks: Board; optimalMoves: number };
const OPTIMAL = [8, 9, 12, 11, 9, 13, 12, 9] as const;
const FIRST_DAY = Date.UTC(2026, 10, 13) / 86_400_000;

export function puzzleForDate(date: string): Puzzle {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date)
    throw new Error("Invalid UTC puzzle date");
  const day = Date.parse(`${date}T00:00:00Z`) / 86_400_000;
  const index = ((day % TEMPLATES.length) + TEMPLATES.length) % TEMPLATES.length;
  const blocks = parseTemplate(TEMPLATES[index]);
  if (!validBoard(blocks)) throw new Error("Invalid SlipOut board");
  return { id: `slipout-${PUZZLE_VERSION}-${date}`, date, number: Math.max(1, day - FIRST_DAY + 1), blocks,
    optimalMoves: OPTIMAL[index] };
}

export function todayUtc(now = Date.now()) { return new Date(now).toISOString().slice(0, 10); }
