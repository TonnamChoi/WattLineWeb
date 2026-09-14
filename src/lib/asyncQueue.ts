// 여러 항목을 동시에 최대 N개까지만 처리하는 간단한 워커 풀.
// 대량 업로드 시 API에 요청이 한꺼번에 몰리는 것을 막기 위해 사용한다.
export async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let index = 0;

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index++];
      await worker(current);
    }
  });

  await Promise.all(runners);
}
