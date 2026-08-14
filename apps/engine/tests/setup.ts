import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement matchMedia — standard polyfill for components that
// check prefers-reduced-motion (BiosignatureSphere, BiosignatureConstellation).
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;
}
