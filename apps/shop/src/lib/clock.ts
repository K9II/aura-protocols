// The current time for Server Components and server data. A component body
// can't call Date.now() directly without tripping the react-hooks/purity lint
// rule; tests mock this module to freeze the clock.
export const currentMs = (): number => Date.now();
