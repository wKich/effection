import { Operation } from '../operation';
import { createFuture } from '../future';
import { withLabels } from '../labels';

export function sleep(duration?: number): Operation<void> {
  return withLabels((scope) => {
    let { resolve, future } = createFuture<void>();

    if(duration != null) {
      let timeoutId = setTimeout(() => {
        resolve({ state: 'completed', value: undefined });
      }, duration);
      scope.consume(() => { clearTimeout(timeoutId) });
    }

    return future;
  }, { name: 'sleep', duration: (duration != null) ? duration : 'forever' });
}
