// chalk@5는 ESM 전용이라 jest(CJS)에서 로드되지 않는다. 테스트에선 색 없이 원문을 돌려주는 스텁으로 대체.
const passthrough: any = new Proxy((text: unknown) => String(text), {
  get: () => passthrough,
});

export default passthrough;
