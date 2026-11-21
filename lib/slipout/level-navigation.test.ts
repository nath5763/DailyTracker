import { describe, expect, it } from "vitest";
import {
  isCampaignLevelUnlocked,
  playCampaignLevel,
  recommendedCampaignLevel,
  selectCampaignDifficulty,
  showCampaignSelection,
  type CampaignNavigation
} from "./level-navigation";

const sequence = [{ number: 4 }, { number: 8 }, { number: 12 }];
const initial: CampaignNavigation = { view: "selection", difficulty: "easy", selectedLevel: 4 };

describe("SlipOut level navigation", () => {
  it("opens a selected level directly in gameplay", () => {
    expect(playCampaignLevel(initial, "medium", 8)).toEqual({
      view: "playing", difficulty: "medium", selectedLevel: 8
    });
  });

  it("returns to selection without forgetting the active level or difficulty", () => {
    const playing = playCampaignLevel(initial, "hard", 12);
    expect(showCampaignSelection(playing)).toEqual({
      view: "selection", difficulty: "hard", selectedLevel: 12
    });
  });

  it("changes the selection difficulty without replacing the active level", () => {
    expect(selectCampaignDifficulty(initial, "medium")).toEqual({
      view: "selection", difficulty: "medium", selectedLevel: 4
    });
  });

  it("uses completed prerequisites for unlocks and rejects locked levels", () => {
    expect(isCampaignLevelUnlocked(sequence, 4, [{ levelNumber: 0 }])).toBe(true);
    expect(isCampaignLevelUnlocked(sequence, 8, [{ levelNumber: 4 }])).toBe(true);
    expect(isCampaignLevelUnlocked(sequence, 12, [{ levelNumber: 4 }])).toBe(false);
    expect(isCampaignLevelUnlocked(sequence, 99, [{ levelNumber: 12 }])).toBe(false);
  });

  it("recommends the next unlocked unfinished level and replays the final level after completion", () => {
    expect(recommendedCampaignLevel(sequence, [])).toBeNull();
    expect(recommendedCampaignLevel(sequence, [{ levelNumber: 0 }])).toEqual({ number: 4 });
    expect(recommendedCampaignLevel(sequence, [{ levelNumber: 0 }, { levelNumber: 4 }])).toEqual({ number: 8 });
    expect(recommendedCampaignLevel(sequence, [
      { levelNumber: 0 }, { levelNumber: 4 }, { levelNumber: 8 }, { levelNumber: 12 }
    ])).toEqual({ number: 12 });
  });
});
