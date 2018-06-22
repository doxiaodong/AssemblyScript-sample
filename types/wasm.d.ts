type WASM = typeof import('../@assembly');

declare module '@assembly' {
  const m: (...args: any[]) => Promise<WASM>;
  export = m;
}
