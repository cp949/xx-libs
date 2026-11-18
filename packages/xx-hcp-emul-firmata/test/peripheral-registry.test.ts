// PeripheralRegistry의 상태 전이와 관찰 계약을 고정하는 특성화 테스트.
// vitest의 node 환경에서 실행한다. 이 클래스는 패키지 index에서 내보내지 않으므로 src에서 직접 불러온다.
import { describe, expect, it } from 'vitest';
import { PeripheralRegistry } from '../src/PeripheralRegistry.js';

describe('PeripheralRegistry', () => {
  it('등록하기 전에는 exists, isActive, isPending이 모두 false다', () => {
    const registry = new PeripheralRegistry();

    expect(registry.exists('led:1')).toBe(false);
    expect(registry.isActive('led:1')).toBe(false);
    expect(registry.isPending('led:1')).toBe(false);
  });

  it('add는 pending으로 등록하고 이미 있는 키의 상태는 바꾸지 않는다', () => {
    const registry = new PeripheralRegistry();

    registry.add('led:1');
    expect(registry.isPending('led:1')).toBe(true);
    expect(registry.exists('led:1')).toBe(true);

    registry.updateActive('led:1');
    registry.add('led:1');
    expect(registry.isActive('led:1')).toBe(true);
  });

  it('updateActive는 등록 없이 호출해도 active로 만든다', () => {
    const registry = new PeripheralRegistry();

    registry.updateActive('led:1');

    expect(registry.isActive('led:1')).toBe(true);
    expect(registry.isPending('led:1')).toBe(false);
  });

  it('observePeriState는 키가 등록된 뒤부터 상태 변화만 중복 없이 내보낸다', () => {
    const registry = new PeripheralRegistry();
    const states: string[] = [];
    registry.observePeriState('led:1').subscribe((it) => states.push(it));

    registry.updateActive('led:2');
    expect(states).toEqual([]);

    registry.add('led:1');
    registry.add('led:1');
    registry.updateActive('led:1');
    registry.updateActive('led:1');
    registry.updateActive('led:2');

    expect(states).toEqual(['pending', 'active']);
  });

  it('observePeriState는 이미 등록된 키라면 구독하는 즉시 현재 상태를 내보낸다', () => {
    const registry = new PeripheralRegistry();
    registry.updateActive('led:1');
    const states: string[] = [];

    registry.observePeriState('led:1').subscribe((it) => states.push(it));

    expect(states).toEqual(['active']);
  });

  it('observeActive는 pending을 false, active를 true로 바꿔 내보낸다', () => {
    const registry = new PeripheralRegistry();
    const flags: boolean[] = [];
    registry.observeActive('led:1').subscribe((it) => flags.push(it));

    registry.add('led:1');
    registry.updateActive('led:1');

    expect(flags).toEqual([false, true]);
  });
});
