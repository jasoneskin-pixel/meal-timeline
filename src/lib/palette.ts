export const DISH_COLORS = [
  "#e4572e", // tomato
  "#f3a712", // saffron
  "#2a9d8f", // teal
  "#6a4c93", // plum
  "#1d6fb8", // blue
  "#8ab17d", // sage
  "#d6336c", // berry
  "#8d6346", // cocoa
  "#3d5a80", // slate
  "#c9a227", // mustard
];

export const FOOD_EMOJI = [
  "🍗", "🥩", "🍖", "🐟", "🦐", "🍝", "🍚", "🥔", "🥕", "🥦",
  "🥗", "🌽", "🍞", "🥖", "🧀", "🥚", "🍲", "🥘", "🍛", "🫕",
  "🥧", "🍰", "🎂", "🍪", "🍮", "🥫", "🧄", "🧅", "🍄", "🫘",
  "🍋", "🍎", "🫐", "🍷", "🍹", "☕", "🦃", "🌮", "🍕", "🥟",
];

export function pickUnusedColor(used: string[]): string {
  const free = DISH_COLORS.find((c) => !used.includes(c));
  return free ?? DISH_COLORS[used.length % DISH_COLORS.length];
}
