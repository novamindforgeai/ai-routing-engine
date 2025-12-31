// src/ai/routing/banditStore.redis.js
import { BanditStore } from "./banditStore.js";

export class RedisBanditStore extends BanditStore {
  constructor(redisClient, options = {}) {
    super();
    this.redis = redisClient;
    this.prefix = options.prefix || "bandit:";
  }

  _key(provider, context = "default") {
    return `${this.prefix}${context}:${provider}`;
  }

  async load(provider, context = "default") {
    const raw = await this.redis.get(this._key(provider, context));
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async save(provider, context = "default", state) {
    await this.redis.set(
      this._key(provider, context),
      JSON.stringify(state)
    );
  }

  async loadAll() {
    const keys = await this.redis.keys(`${this.prefix}*`);
    const out = {};

    for (const k of keys) {
      const raw = await this.redis.get(k);
      if (!raw) continue;

      try {
        const [, ctx, provider] = k.split(":");
        out[`${ctx}:${provider}`] = JSON.parse(raw);
      } catch {}
    }

    return out;
  }
}
