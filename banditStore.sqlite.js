// src/ai/routing/banditStore.sqlite.js
import { BanditStore } from "./banditStore.js";

export class SQLiteBanditStore extends BanditStore {
  constructor(db) {
    super();
    this.db = db;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS bandit_state (
        provider TEXT NOT NULL,
        context TEXT NOT NULL,
        trials INTEGER NOT NULL,
        rewardSum REAL NOT NULL,
        alpha REAL NOT NULL,
        beta REAL NOT NULL,
        PRIMARY KEY (provider, context)
      );
    `);
  }

  async load(provider, context = "default") {
    const row = this.db
      .prepare(`
        SELECT trials, rewardSum, alpha, beta
        FROM bandit_state
        WHERE provider = ? AND context = ?
      `)
      .get(provider, context);

    return row || null;
  }

  async save(provider, context = "default", state) {
    this.db
      .prepare(`
        INSERT INTO bandit_state
          (provider, context, trials, rewardSum, alpha, beta)
        VALUES
          (@provider, @context, @trials, @rewardSum, @alpha, @beta)
        ON CONFLICT(provider, context) DO UPDATE SET
          trials = excluded.trials,
          rewardSum = excluded.rewardSum,
          alpha = excluded.alpha,
          beta = excluded.beta
      `)
      .run({
        provider,
        context,
        ...state
      });
  }

  async loadAll() {
    const rows = this.db
      .prepare(`
        SELECT provider, context, trials, rewardSum, alpha, beta
        FROM bandit_state
      `)
      .all();

    const out = {};
    for (const r of rows) {
      out[`${r.context}:${r.provider}`] = {
        trials: r.trials,
        rewardSum: r.rewardSum,
        alpha: r.alpha,
        beta: r.beta
      };
    }

    return out;
  }
}
