import { describe, it, expect } from "vitest";
import { advanceTurn, MAX_TURNS } from "@/components/store/VialTurn";
import { QR_FACING_TURN } from "@/lib/vial-label";

const TAU = 2 * Math.PI;
const turned = (a: number) => ((-a % TAU) + TAU) % TAU;

describe("advanceTurn (the turning vial's automatic turn)", () => {
  it("pauses on the QR code exactly once per turn, for hundreds of turns (it used to freeze after ~6)", () => {
    let angle = 0, armed = true, pauses = 0, laps = 0, prev = 0;
    for (let i = 0; i < 60 * 60 * 30; i++) { // 30 minutes at 60 frames a second
      const s = advanceTurn(angle, 1 / 60, armed);
      angle = s.angle; armed = s.armed;
      if (s.atQr) { pauses++; expect(turned(angle)).toBeCloseTo(QR_FACING_TURN, 12); }
      const now = turned(angle);
      if (now < prev) laps++;
      prev = now;
      expect(Math.abs(angle)).toBeLessThan(TAU + 1e-9); // stays within one turn
    }
    expect(laps).toBeGreaterThan(100);
    expect(Math.abs(pauses - laps)).toBeLessThanOrEqual(1);
  });

  it("right after a pause, the next frames move on instead of pausing again", () => {
    let s = { angle: -QR_FACING_TURN, armed: false, atQr: false };
    for (let i = 0; i < 120; i++) { s = advanceTurn(s.angle, 1 / 60, s.armed); expect(s.atQr).toBe(false); }
    expect(turned(s.angle)).toBeGreaterThan(QR_FACING_TURN);
  });

  it("uneven frame times (a slow phone) still pause once a turn", () => {
    let angle = 0, armed = true, pauses = 0;
    for (let i = 0; i < 20000; i++) { const s = advanceTurn(angle, i % 7 === 0 ? 0.05 : 0.008, armed); angle = s.angle; armed = s.armed; if (s.atQr) pauses++; }
    expect(pauses).toBeGreaterThan(5);
  });

  it("reports each full turn as it comes round past the front, where the last of MAX_TURNS rests", () => {
    let angle = 0, armed = true, done = 0, frames = 0;
    while (done < MAX_TURNS && frames < 60 * 600) {
      const s = advanceTurn(angle, 1 / 60, armed); angle = s.angle; armed = s.armed; frames++;
      if (s.lapDone) { done++; expect(turned(angle)).toBeLessThan(0.02); } // just past the front
    }
    expect(done).toBe(MAX_TURNS);
    expect(MAX_TURNS).toBe(2); // two turns, then it rests (2026-10-18)
    const secs = frames / 60; // two turns at the email GIF's speed, about 6.6 s each (pauses not counted here)
    expect(secs).toBeGreaterThan(11);
    expect(secs).toBeLessThan(15);
  });
});
