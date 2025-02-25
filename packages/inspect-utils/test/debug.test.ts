import { describe, it, beforeEach } from '@effection/mocha';
import expect from 'expect'

import { sleep } from '@effection/core';
import { Slice } from '@effection/atom';
import { inspect, InspectTree } from '../src/index';

describe("inspect()", () => {
  it('returns a slice of the task tree', function*(world) {
    let task = world.spawn();

    let tree: Slice<InspectTree> = yield inspect(task);

    let child = task.spawn(function*(scope) {
      scope.spawn();
      scope.spawn(function*() { /* no op */});
      yield sleep();
    }, { labels: { name: 'root' } });

    yield sleep(10);

    let result = tree.get().children[child.id];

    expect(result.id).toEqual(child.id);
    expect(result.state).toEqual('running');

    let children = Object.values(result.children);
    expect(children.length).toEqual(2);

    expect(children[0].state).toEqual('running');
    expect(children[1].state).toEqual('completed');
  });
});
