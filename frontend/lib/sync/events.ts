type QueueChangeListener = () => void;

const listeners = new Set<QueueChangeListener>();

/**
 * Notify subscribers that the sync queue changed.
 */
export function notifyQueueChanged(): void {
  for (const listener of listeners) listener();
}

/**
 * Subscribe to sync queue changes.
 *
 * @param listener callback invoked after the queue changes
 * @returns a function that removes the subscription
 */
export function subscribeQueueChanges(
  listener: QueueChangeListener,
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
