import type { Operation } from '../operation';
import { withLabels } from '../labels';
import { createFuture } from '../future';

export function race<T>(operations: Operation<T>[]): Operation<T> {
  return withLabels((scope) => {
    let { future, resolve } = createFuture<T>();
    for (let operation of operations) {
      if(scope.state === 'running') {
        scope.spawn(function*() {
          try {
            let value = yield operation;
            resolve({ state: 'completed', value });
          } catch (error) {
            resolve({ state: 'errored', error });
          }
        });
      }
    }
    return future;
  }, { name: 'race', count: operations.length });
}
