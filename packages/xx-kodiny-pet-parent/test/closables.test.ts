// Closables의 정리 계약을 고정하는 특성화 테스트.
// vitest의 jsdom 환경에서 실행한다. IframeIo의 stop이 이 클래스에 의존한다.
import { describe, expect, it, vi } from 'vitest';
import { Closables } from '../src/util/closables.js';

describe('Closables', () => {
  it('close는 등록한 함수를 모두 실행하고 비운다', () => {
    const a = vi.fn();
    const b = vi.fn();
    const closables = Closables.create(a, b);
    expect(closables.count).toBe(2);

    closables.close();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(closables.count).toBe(0);

    closables.close();
    expect(a).toHaveBeenCalledTimes(1);
  });

  it('remove한 함수는 close에서 실행하지 않는다', () => {
    const a = vi.fn();
    const closables = Closables.create(a);
    closables.remove(a);
    closables.close();
    expect(a).not.toHaveBeenCalled();
  });

  it('close는 closeTrigger$ 구독자에게 알리고, 다음 접근에는 새 Subject를 만든다', () => {
    const closables = new Closables();
    const first = closables.closeTrigger$;
    const onClose = vi.fn();
    first.subscribe(onClose);

    closables.close();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(closables.closeTrigger$).not.toBe(first);
  });

  it('addWindowListener로 등록한 리스너는 close에서 해제된다', () => {
    const listener = vi.fn();
    const closables = Closables.createWindowListener('resize', listener);

    window.dispatchEvent(new Event('resize'));
    expect(listener).toHaveBeenCalledTimes(1);

    closables.close();
    window.dispatchEvent(new Event('resize'));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
