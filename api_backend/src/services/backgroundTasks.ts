/**
 * Fire-and-forget background work (logging, analytics, SR updates).
 * Yanıt döndükten sonra çalışır — latency'ye eklenmez.
 */

type Task = () => Promise<void> | void;

const queue: Task[] = [];
let draining = false;

async function drain() {
  if (draining) return;
  draining = true;
  while (queue.length > 0) {
    const task = queue.shift()!;
    try {
      await task();
    } catch (err) {
      console.warn(
        '[background]',
        err instanceof Error ? err.message : String(err),
      );
    }
  }
  draining = false;
}

/** Schedule work after response path (setImmediate). */
export function runInBackground(task: Task, label = 'job'): void {
  queue.push(async () => {
    const t0 = Date.now();
    await task();
    if (Date.now() - t0 > 5000) {
      console.warn(`[background] slow ${label}: ${Date.now() - t0}ms`);
    }
  });
  setImmediate(() => {
    void drain();
  });
}
