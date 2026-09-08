/**
 * Sérialise le refresh OAuth rotatif.
 * Mutex processus (même isolate) + lease Postgres (multi-instances).
 */

const LOCK_WAIT_MS = 25_000;
const RETRY_MS = 40;

export type ExclusiveLock = {
  runExclusive<T>(fn: () => Promise<T>): Promise<T>;
};

export type TokenLockRpc = {
  rpc(
    fn: string,
    args: { p_user_id: string },
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMemoryExclusiveLock(): ExclusiveLock {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    runExclusive<T>(fn: () => Promise<T>): Promise<T> {
      const run = tail.then(fn, fn);
      tail = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
  };
}

const processLocks = new Map<string, ExclusiveLock>();

export function processExclusiveLock(key: string): ExclusiveLock {
  let lock = processLocks.get(key);
  if (!lock) {
    lock = createMemoryExclusiveLock();
    processLocks.set(key, lock);
  }
  return lock;
}

/** Réinitialise les mutex processus — tests uniquement. */
export function resetProcessExclusiveLocks(): void {
  processLocks.clear();
}

export async function withPostgresTokenLease<T>(
  db: TokenLockRpc,
  userId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const deadline = Date.now() + LOCK_WAIT_MS;
  while (Date.now() < deadline) {
    const { data, error } = await db.rpc("einvoicing_lock_oauth_tokens", { p_user_id: userId });
    if (error) throw new Error(error.message);
    if (data === true) {
      try {
        return await fn();
      } finally {
        const unlocked = await db.rpc("einvoicing_unlock_oauth_tokens", { p_user_id: userId });
        if (unlocked.error) throw new Error(unlocked.error.message);
      }
    }
    await sleep(RETRY_MS);
  }
  throw new Error("Impossible d’obtenir le verrou des jetons PA (refresh concurrent).");
}

export function postgresAndProcessTokenLock(db: TokenLockRpc, userId: string): ExclusiveLock {
  const mem = processExclusiveLock(`einvoicing-tokens:${userId}`);
  return {
    runExclusive<T>(fn: () => Promise<T>): Promise<T> {
      return mem.runExclusive(() => withPostgresTokenLease(db, userId, fn));
    },
  };
}
