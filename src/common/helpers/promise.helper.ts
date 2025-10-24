/**
 * Function to run promises with a concurrency limit.
 * @param items - Process items
 * @param limit - Maximum concurrent promises
 * @param worker - Function to process each item, returns a Promise
 */
export async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let currentIndex = 0;
  const executing: Promise<void>[] = [];

  async function enqueue(): Promise<void> {
    if (currentIndex >= items.length) return;

    const index = currentIndex++;
    const item = items[index];

    const p = worker(item, index).finally(() => {
      executing.splice(executing.indexOf(p), 1);
    });

    executing.push(p);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }

    return enqueue();
  }

  await enqueue();
  await Promise.allSettled(executing);
}
