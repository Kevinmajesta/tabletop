export const randomId = (source = crypto) =>
  source.randomUUID?.() ?? Array.from(source.getRandomValues(new Uint32Array(4))).join("-");
