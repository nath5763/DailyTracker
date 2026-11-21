export type CampaignDifficulty = "easy" | "medium" | "hard";
export type CampaignView = "selection" | "playing";
export type CampaignNavigation = {
  view: CampaignView;
  difficulty: CampaignDifficulty;
  selectedLevel: number;
};

type CampaignLevel = { number: number };
type CampaignProgress = { levelNumber: number };

export function isCampaignLevelUnlocked(
  sequence: CampaignLevel[],
  levelNumber: number,
  progress: CampaignProgress[]
): boolean {
  const index = sequence.findIndex(level => level.number === levelNumber);
  if (index < 0) return false;
  const prerequisite = index === 0 ? 0 : sequence[index - 1].number;
  return progress.some(item => item.levelNumber === levelNumber || item.levelNumber === prerequisite);
}

export function recommendedCampaignLevel(
  sequence: CampaignLevel[],
  progress: CampaignProgress[]
): CampaignLevel | null {
  const completed = new Set(progress.map(item => item.levelNumber));
  const next = sequence.find(level => !completed.has(level.number) &&
    isCampaignLevelUnlocked(sequence, level.number, progress));
  return next ?? (sequence.length > 0 && sequence.every(level => completed.has(level.number))
    ? sequence[sequence.length - 1]
    : null);
}

export function showCampaignSelection(navigation: CampaignNavigation): CampaignNavigation {
  return { ...navigation, view: "selection" };
}

export function selectCampaignDifficulty(
  navigation: CampaignNavigation,
  difficulty: CampaignDifficulty
): CampaignNavigation {
  return { ...navigation, difficulty };
}

export function playCampaignLevel(
  navigation: CampaignNavigation,
  difficulty: CampaignDifficulty,
  selectedLevel: number
): CampaignNavigation {
  return { view: "playing", difficulty, selectedLevel };
}
