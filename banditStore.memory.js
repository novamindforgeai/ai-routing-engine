import { BanditStore } from "./banditStore.js";

export class MemoryBanditStore extends BanditStore {
  constructor() {
    super();
    this.state = {};
  }

  key(p, c) {
    return `${c}:${p}`;
  }

  async load(p, c) {
    return this.state[this.key(p, c)] || null;
  }

  async save(p, c, s) {
    this.state[this.key(p, c)] = { ...s };
  }

  async loadAll() {
    return { ...this.state };
  }
}
