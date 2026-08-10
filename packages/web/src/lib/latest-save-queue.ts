type QueueWaiter<Result> = {
  resolve: (result: Result) => void;
  reject: (error: unknown) => void;
};

type PendingSave<Value, Result> = {
  value: Value;
  waiters: QueueWaiter<Result>[];
};

/**
 * Serializes saves and coalesces edits made while a request is running.
 * Every waiter for a coalesced save resolves with the result of the newest value.
 */
export class LatestSaveQueue<Value, Result> {
  private active = false;
  private pending: PendingSave<Value, Result> | null = null;

  constructor(private readonly save: (value: Value) => Promise<Result>) {}

  enqueue(value: Value): Promise<Result> {
    const result = new Promise<Result>((resolve, reject) => {
      const waiter = { resolve, reject };
      if (this.pending) {
        this.pending.value = value;
        this.pending.waiters.push(waiter);
      } else {
        this.pending = { value, waiters: [waiter] };
      }
    });

    void this.drain();
    return result;
  }

  private async drain() {
    if (this.active) return;
    this.active = true;

    try {
      while (this.pending) {
        const current = this.pending;
        this.pending = null;

        try {
          const result = await this.save(current.value);
          for (const waiter of current.waiters) waiter.resolve(result);
        } catch (error) {
          for (const waiter of current.waiters) waiter.reject(error);
        }
      }
    } finally {
      this.active = false;
      // An enqueue can happen after the loop condition and before active resets.
      if (this.pending) void this.drain();
    }
  }
}
