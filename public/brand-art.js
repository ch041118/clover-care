// Public-source edition: the private calligraphy image is intentionally excluded.
export function brandArt(language = 'ko') {
  const english = language === 'en';
  const label = english ? 'Clover' : '클로버';
  return `<svg class="calligraphy calligraphy-${english ? 'en' : 'ko'}" viewBox="0 0 400 120" role="img" aria-label="${label}" focusable="false" xmlns="http://www.w3.org/2000/svg"><text x="200" y="85" text-anchor="middle" font-family="sans-serif" font-size="76" font-weight="700" fill="currentColor">${label}</text></svg>`;
}
