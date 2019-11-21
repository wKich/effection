/* global describe, beforeEach, it */
/* eslint require-yield: 0 */
/* eslint no-unreachable: 0 */

import expect from 'expect';

import { fork } from '../src/index';

describe('Async executon', () => {
  describe('with asynchronously executing children', () => {
    let execution, one, two, three;

    beforeEach(() => {
      execution = fork(function() {
        fork(function*() {
          yield cxt => one = cxt;
        });

        fork(function*() {
          yield cxt => two = cxt;
        });

        fork(function*() {
          yield cxt => three = cxt;
        });
      });
    });
    it('begins execution of each child immediately', () => {
      expect(one).toBeDefined();
      expect(two).toBeDefined();
      expect(three).toBeDefined();
    });

    it('consideres the execution to be completed, but waiting and blocking', () => {
      expect(execution.isWaiting).toEqual(true);
      expect(execution.isBlocking).toEqual(true);
    });

    describe('finishing two of the children', () => {
      beforeEach(() => {
        one.resume();
        two.resume();
      });

      it('considers them complete and non blocking', () => {
        expect(one.isCompleted).toEqual(true);
        expect(one.isBlocking).toEqual(false);

        expect(two.isCompleted).toEqual(true);
        expect(two.isBlocking).toEqual(false);
      });

      it('still considers the third child as running', () => {
        expect(three.isRunning).toEqual(true);
      });

      it('considers the top level execution to still be waiting', () => {
        expect(execution.isWaiting).toEqual(true);
      });

      describe('finishing the third and final child', () => {
        beforeEach(() => {
          three.resume();
        });
        it('considers the entire task no longer waiting', () => {
          expect(execution.isWaiting).toEqual(false);
          expect(execution.isBlocking).toEqual(false);
        });
      });
    });

    describe('halting the top level context', () => {
      beforeEach(() => {
        execution.halt();
      });

      it('halts all of the children', () => {
        expect(one.isHalted).toEqual(true);
        expect(two.isHalted).toEqual(true);
        expect(three.isHalted).toEqual(true);
      });
    });


    describe('halting one of the children', () => {
      beforeEach(() => {
        two.halt();
      });
      it('does not cancel anything else', () => {
        expect(execution.isWaiting).toEqual(true);
        expect(one.isRunning).toEqual(true);
        expect(three.isRunning).toEqual(true);
      });
    });

    describe('halting all of the children', () => {
      beforeEach(() => {
        one.halt();
        two.halt();
        three.halt();
      });

      it('completes the top-level execution', () => {
        expect(execution.isCompleted).toEqual(true);
      });
    });

    describe('throwing an error in one of the children', () => {
      let boom;
      beforeEach(() => {
        boom = new Error('boom!');
        one.throw(boom);
      });

      it('errors out the parent', () => {
        expect(execution.isErrored).toEqual(true);
        expect(execution.result).toEqual(boom);
      });

      it('has the error as its result', () => {
        expect(execution.result).toEqual(boom);
      });
    });

  });

  describe('with a mixture of synchronous and asynchronous executions', () => {
    let execution, one, two, sync, boom;
    beforeEach(() => {
      boom = new Error('boom!');
      execution = fork(function*() {
        fork(function*() { yield cxt => one = cxt; });
        fork(function*() { yield cxt => two = cxt; });
        yield function*() {
          yield cxt => sync = cxt;
        };
      });
      expect(one).toBeDefined();
      expect(two).toBeDefined();
      expect(sync).toBeDefined();
    });

    describe('finishing the synchronous execution', () => {
      beforeEach(() => {
        sync.resume();
      });

      it('is still waiting on the async execution', () => {
        expect(execution.isWaiting).toEqual(true);
      });

      describe('when the async portions complet', () => {
        beforeEach(() => {
          one.resume();
          two.resume();
        });
        it('makes the whole execution complete', () => {
          expect(execution.isCompleted).toEqual(true);
        });
      });
    });

    describe('finishing the async portion', () => {
      beforeEach(() => {
        one.resume();
        two.resume();
      });

      it('is still running as it waits on the sync portion', () => {
        expect(execution.isRunning).toEqual(true);
      });

      describe('. When the sync portion finally completes', () => {
        beforeEach(() => {
          sync.resume();
        });
        it('is a complete execution', () => {
          expect(execution.isCompleted).toEqual(true);
        });
      });
    });

    describe('halting the async portion', () => {
      beforeEach(() => {
        one.halt();
        two.halt();
      });

      it('is still running as it waits on the sync portion', () => {
        expect(execution.isRunning).toEqual(true);
      });

      describe('then finishing the sync portion', () => {
        beforeEach(() => {
          sync.resume();
        });
        it('completes the whole enchilada', () => {
          expect(execution.isCompleted).toEqual(true);
        });
      });
    });

    describe('throwing from within the synchronous task', () => {
      beforeEach(() => {
        sync.throw(boom);
      });

      it('errors out the top level execution', () => {
        expect(execution.isErrored).toEqual(true);
        expect(execution.result).toEqual(boom);
      });

      it('halts the async children', () => {
        expect(one.isHalted).toEqual(true);
        expect(two.isHalted).toEqual(true);
      });
    });

    describe('throwing from within one of the async tasks', () => {
      beforeEach(() => {
        one.throw(boom);
      });

      it('errors out the top level execution', () => {
        expect(execution.isErrored).toEqual(true);
        expect(execution.result).toEqual(boom);
      });

      it('halts the async children', () => {
        expect(two.isHalted).toEqual(true);
        expect(sync.isHalted).toEqual(true);
      });
    });

    describe('halting the top level execution', () => {
      beforeEach(() => {
        execution.halt();
      });

      it('does not throw an error', () => {
        expect(execution.result).toBeUndefined();
      });

      it('halts the execution, and all its children', () => {
        expect(execution.isHalted).toEqual(true);
        expect(one.isHalted).toEqual(true);
        expect(two.isHalted).toEqual(true);
        expect(sync.isHalted).toEqual(true);
      });
    });
  });

  describe('A parent that block, but also has an async child', () => {
    let parent, child;
    beforeEach(() => {
      parent = fork(function*() {
        fork(function*() { yield cxt => child = cxt; });
        yield x => x;
      });
    });

    it('starts out as running', () => {
      expect(parent.isRunning).toEqual(true);
    });

    describe('when the async child finishes', () => {
      beforeEach(() => {
        child.resume();
      });

      it('keeps the parent running because it is still yielding on its own', () => {
        expect(parent.isRunning).toEqual(true);
      });
    });

    describe('when the async child is halted', () => {
      beforeEach(() => {
        child.halt();
      });
      it('keeps the parent running because it is still yielding on its own', () => {
        expect(parent.isRunning).toEqual(true);
      });
      it('removes the child from the list of children', () => {
        expect(parent.children.has(child)).toEqual(false);
      });
    });
  });

  describe('the fork function', () => {
    let forkReturn, forkContext;
    beforeEach(() => {
      fork(function*() {
        forkReturn = fork(function*() {
          forkContext = this;
        });
      });
    });

    it('returns the forked child', () => {
      expect(forkReturn).toBeDefined();
      expect(forkReturn).toEqual(forkContext);
    });
  });

  describe('yielding on fork', () => {
    let root, child;
    beforeEach(() => {
      root = fork(function*() {
        child = fork(function*() {
          let number = yield;
          return number * 2;
        });
        let value = yield child;
        return value + 1;
      });
    });

    it('awaits the value from the child', async () => {
      child.resume(5);
      await expect(root).resolves.toBe(11);
    });

    it('throws if child is thrown', async () => {
      child.throw(new Error("boom"));
      await expect(root).rejects.toThrow("boom");
    });

    it('throws if child is halted', async () => {
      child.halt();
      await expect(root).rejects.toThrow("halt");
    });
  });
});
