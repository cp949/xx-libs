// FirmataHcpEmul(IHwEmul 래퍼)의 동작 계약을 고정하는 특성화 테스트.
// vitest의 node 환경에서 vi.fn 기반 가짜 IHwEmul로 실행한다. 실제 장치나 네트워크는 쓰지 않는다.
// 원본 동작을 그대로 옮긴 코드이므로 어색해 보이는 동작도 바꾸지 않고 고정한다.
import type { IHcpHwNotification, IHwEmul } from '@cp949/xx-hcp-interface';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { FirmataHcpEmul, FirmataManager } from '../src/index.js';

/** 비동기 연쇄(마이크로태스크)가 모두 끝나도록 한 틱 기다린다. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** 직접 풀어 줄 수 있는 Promise. */
function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** vi.fn 기반 가짜 IHwEmul과 알림 스트림을 만든다. */
function createFakeEmul() {
  const notification$ = new Subject<IHcpHwNotification>();
  const distinct$ = new Subject<IHcpHwNotification>();
  const runCmd = vi.fn<IHwEmul['runCmd']>(async () => undefined);
  const observeHwNotifications = vi.fn<IHwEmul['observeHwNotifications']>(() => notification$);
  const observeHwNotificationsDistinct = vi.fn<IHwEmul['observeHwNotificationsDistinct']>(
    () => distinct$,
  );
  const getLastPeriValue = vi.fn<IHwEmul['getLastPeriValue']>(async () => undefined);
  const emul: IHwEmul = {
    connect: vi.fn(async () => undefined),
    waitUntilConnected: vi.fn(async () => undefined),
    isConnected: vi.fn(() => true),
    observeHwNotifications,
    observeHwNotificationsDistinct,
    getLastPeriValue,
    runCmd,
    onEmulStart: vi.fn(async () => undefined),
    onEmulStop: vi.fn(async () => undefined),
    onEmulDestroyed: vi.fn(async () => undefined),
  };
  return {
    emul,
    runCmd,
    observeHwNotifications,
    observeHwNotificationsDistinct,
    getLastPeriValue,
    notification$,
    distinct$,
  };
}

const CTX = { routine: 'ctx' };

let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
  // 소스가 console을 그대로 쓰므로 출력을 막는다.
  vi.spyOn(console, 'debug').mockImplementation(() => {});
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * createPeripheral과 등록 상태.
 * PeripheralRegistry.add는 어디서도 호출되지 않는다. createPeripheral은 응답 뒤 updateActive만 부른다.
 * 그래서 생성 전과 생성 중에는 등록 상태가 없다.
 */
describe('createPeripheral', () => {
  it('firmata createPeripheral 명령을 보내고, 응답이 온 뒤에만 active로 등록한다', async () => {
    const { emul, runCmd } = createFakeEmul();
    const pending = deferred();
    runCmd.mockReturnValueOnce(pending.promise);
    const target = new FirmataHcpEmul(emul, new FirmataManager());
    const states: string[] = [];
    target.observePeriRegistered('led:1').subscribe((it) => states.push(it));

    const creating = target.createPeripheral(CTX, 'led:1', 'Led', { pin: 13 });
    await flush();

    expect(runCmd).toHaveBeenCalledWith(CTX, 'firmata', 'createPeripheral', 'led:1', 'Led', {
      pin: 13,
    });
    // 응답 전에는 pending도 없다. 상태가 아직 비어 있다.
    expect(states).toEqual([]);

    pending.resolve();
    await creating;
    expect(states).toEqual(['active']);
  });

  it('이미 등록된 periId는 emul.runCmd를 다시 부르지 않는다', async () => {
    const { emul, runCmd } = createFakeEmul();
    const target = new FirmataHcpEmul(emul, new FirmataManager());

    await target.createPeripheral(CTX, 'led:1', 'Led');
    await target.createPeripheral(CTX, 'led:1', 'Led');
    await target.createPeripheral(CTX, 'led:2', 'Led');

    const ids = runCmd.mock.calls.map((call) => call[3]);
    expect(ids).toEqual(['led:1', 'led:2']);
  });

  it('응답을 기다리는 동안 같은 periId를 다시 요청하면 명령이 두 번 나간다', async () => {
    const { emul, runCmd } = createFakeEmul();
    const pending = deferred();
    runCmd.mockReturnValue(pending.promise);
    const target = new FirmataHcpEmul(emul, new FirmataManager());

    const first = target.createPeripheral(CTX, 'led:1', 'Led');
    const second = target.createPeripheral(CTX, 'led:1', 'Led');
    pending.resolve();
    await Promise.all([first, second]);

    expect(runCmd).toHaveBeenCalledTimes(2);
  });

  it('emul.runCmd가 실패하면 그대로 던지고 등록하지 않아 다시 시도할 수 있다', async () => {
    const { emul, runCmd } = createFakeEmul();
    runCmd.mockRejectedValueOnce(new Error('생성 실패'));
    const target = new FirmataHcpEmul(emul, new FirmataManager());
    const states: string[] = [];
    target.observePeriRegistered('led:1').subscribe((it) => states.push(it));

    await expect(target.createPeripheral(CTX, 'led:1', 'Led')).rejects.toThrow('생성 실패');
    expect(states).toEqual([]);

    await target.createPeripheral(CTX, 'led:1', 'Led');
    expect(runCmd).toHaveBeenCalledTimes(2);
    expect(states).toEqual(['active']);
  });
});

describe('등록 대기', () => {
  it('callPeripheral은 생성 전에는 명령을 보내지 않고, 생성이 끝나면 인자를 그대로 넘기고 결과를 돌려준다', async () => {
    const { emul, runCmd } = createFakeEmul();
    const target = new FirmataHcpEmul(emul, new FirmataManager());
    runCmd.mockImplementation(async (_ctx, _hwId, cmd) =>
      cmd === 'callPeripheral' ? 'on-result' : undefined,
    );

    const calling = target.callPeripheral(CTX, 'led:1', true, 'on', 1, 'a');
    await flush();
    expect(runCmd).not.toHaveBeenCalled();

    await target.createPeripheral(CTX, 'led:1', 'Led');
    await expect(calling).resolves.toBe('on-result');

    expect(runCmd.mock.calls.map((call) => call[2])).toEqual([
      'createPeripheral',
      'callPeripheral',
    ]);
    expect(runCmd).toHaveBeenLastCalledWith(
      CTX,
      'firmata',
      'callPeripheral',
      'led:1',
      true,
      'on',
      1,
      'a',
    );
  });

  it('다른 periId를 생성해도 대기 중인 callPeripheral은 풀리지 않는다', async () => {
    const { emul, runCmd } = createFakeEmul();
    const target = new FirmataHcpEmul(emul, new FirmataManager());

    const calling = target.callPeripheral(CTX, 'led:1', false, 'on');
    await target.createPeripheral(CTX, 'led:2', 'Led');
    await flush();

    expect(runCmd.mock.calls.map((call) => call[2])).toEqual(['createPeripheral']);

    // 대기 중인 Promise가 테스트 뒤에 남지 않도록 마저 생성한다.
    await target.createPeripheral(CTX, 'led:1', 'Led');
    await calling;
  });

  it('이미 생성된 periId의 callPeripheral은 기다리지 않고 바로 보낸다', async () => {
    const { emul, runCmd } = createFakeEmul();
    const target = new FirmataHcpEmul(emul, new FirmataManager());
    await target.createPeripheral(CTX, 'led:1', 'Led');

    await target.callPeripheral(CTX, 'led:1', false, 'off');

    expect(runCmd).toHaveBeenLastCalledWith(
      CTX,
      'firmata',
      'callPeripheral',
      'led:1',
      false,
      'off',
    );
  });

  it('fieldValuePeripheral은 생성이 끝난 뒤에 명령을 보낸다', async () => {
    const { emul, runCmd } = createFakeEmul();
    const target = new FirmataHcpEmul(emul, new FirmataManager());
    runCmd.mockImplementation(async (_ctx, _hwId, cmd) =>
      cmd === 'fieldValuePeripheral' ? 42 : undefined,
    );

    const reading = target.fieldValuePeripheral(CTX, 'sensor:1', 'value');
    await flush();
    expect(runCmd).not.toHaveBeenCalled();

    await target.createPeripheral(CTX, 'sensor:1', 'Sensor');
    await expect(reading).resolves.toBe(42);
    expect(runCmd).toHaveBeenLastCalledWith(
      CTX,
      'firmata',
      'fieldValuePeripheral',
      'sensor:1',
      'value',
    );
  });

  it('getLastPeriValue는 생성이 끝난 뒤에 emul.getLastPeriValue에 위임한다', async () => {
    const { emul, getLastPeriValue } = createFakeEmul();
    getLastPeriValue.mockResolvedValue('last');
    const target = new FirmataHcpEmul(emul, new FirmataManager());

    const reading = target.getLastPeriValue(CTX, 'button:3', 'onChange', 'v');
    await flush();
    expect(getLastPeriValue).not.toHaveBeenCalled();

    await target.createPeripheral(CTX, 'button:3', 'Button');
    await expect(reading).resolves.toBe('last');
    expect(getLastPeriValue).toHaveBeenCalledWith(CTX, 'button:3', 'onChange', 'v');
  });
});

describe('runCmd 라우팅', () => {
  it('callPeripheral은 this.callPeripheral로 보내 등록을 기다린다', async () => {
    const { emul, runCmd } = createFakeEmul();
    const target = new FirmataHcpEmul(emul, new FirmataManager());

    const calling = target.runCmd(CTX, 'firmata', 'callPeripheral', 'led:1', true, 'on', 5);
    await flush();
    expect(runCmd).not.toHaveBeenCalled();

    await target.createPeripheral(CTX, 'led:1', 'Led');
    await calling;
    expect(runCmd).toHaveBeenLastCalledWith(
      CTX,
      'firmata',
      'callPeripheral',
      'led:1',
      true,
      'on',
      5,
    );
  });

  it('createPeripheral은 this.createPeripheral로 보내 같은 periId를 한 번만 생성한다', async () => {
    const { emul, runCmd } = createFakeEmul();
    const target = new FirmataHcpEmul(emul, new FirmataManager());

    await target.runCmd(CTX, 'firmata', 'createPeripheral', 'led:1', 'Led', { pin: 1 });
    await target.runCmd(CTX, 'firmata', 'createPeripheral', 'led:1', 'Led', { pin: 1 });

    expect(runCmd).toHaveBeenCalledTimes(1);
    expect(runCmd).toHaveBeenCalledWith(CTX, 'firmata', 'createPeripheral', 'led:1', 'Led', {
      pin: 1,
    });
  });

  it('fieldValuePeripheral은 this.fieldValuePeripheral로 보내 등록을 기다린다', async () => {
    const { emul, runCmd } = createFakeEmul();
    const target = new FirmataHcpEmul(emul, new FirmataManager());

    const reading = target.runCmd(CTX, 'firmata', 'fieldValuePeripheral', 'sensor:1', 'value');
    await flush();
    expect(runCmd).not.toHaveBeenCalled();

    await target.createPeripheral(CTX, 'sensor:1', 'Sensor');
    await reading;
    expect(runCmd).toHaveBeenLastCalledWith(
      CTX,
      'firmata',
      'fieldValuePeripheral',
      'sensor:1',
      'value',
    );
  });

  it('그 밖의 명령은 인자를 그대로 emul.runCmd에 넘기고 결과를 돌려준다', async () => {
    const { emul, runCmd } = createFakeEmul();
    runCmd.mockResolvedValue('result');
    const target = new FirmataHcpEmul(emul, new FirmataManager());

    await expect(target.runCmd(CTX, 'firmata', 'reset', 1, 'x')).resolves.toBe('result');

    expect(runCmd).toHaveBeenCalledWith(CTX, 'firmata', 'reset', 1, 'x');
    expect(warn).not.toHaveBeenCalled();
  });

  it('hwId가 firmata가 아니면 경고만 남기고 그대로 처리한다', async () => {
    const { emul, runCmd } = createFakeEmul();
    const target = new FirmataHcpEmul(emul, new FirmataManager());

    await target.runCmd(CTX, 'other', 'reset');
    expect(warn).toHaveBeenCalledWith('hwId is not firmata:', 'other');
    expect(runCmd).toHaveBeenLastCalledWith(CTX, 'other', 'reset');

    // 라우팅되는 명령은 hwId와 관계없이 'firmata'로 다시 보낸다.
    await target.runCmd(CTX, 'other', 'createPeripheral', 'led:1', 'Led');
    expect(runCmd).toHaveBeenLastCalledWith(
      CTX,
      'firmata',
      'createPeripheral',
      'led:1',
      'Led',
      undefined,
    );
  });
});

describe('ensureHwNotifications와 plot', () => {
  it('active가 된 뒤 observe 명령을 한 번 보내고 끝난다', async () => {
    const { emul, runCmd } = createFakeEmul();
    const target = new FirmataHcpEmul(emul, new FirmataManager());
    let done = false;

    const ensuring = target.ensureHwNotifications(CTX, 'button:3', 'onChange', 100).then(() => {
      done = true;
    });
    await flush();
    expect(runCmd).not.toHaveBeenCalled();
    expect(done).toBe(false);

    await target.createPeripheral(CTX, 'button:3', 'Button');
    await ensuring;

    expect(runCmd).toHaveBeenLastCalledWith(CTX, 'firmata', 'observe', 'button:3', 'onChange', 100);
    expect(runCmd.mock.calls.filter((call) => call[2] === 'observe')).toHaveLength(1);
  });

  it('plot은 ensureHwNotifications를 기다리지 않고 FirmataManager.plot만 기다린다', async () => {
    const { emul, runCmd } = createFakeEmul();
    const closing = deferred();
    const manager = { plot: vi.fn(() => closing.promise) };
    const target = new FirmataHcpEmul(emul, manager);
    let done = false;

    const plotting = target.plot(CTX, 'sensor:1', 'onChange', 50).then(() => {
      done = true;
    });
    await flush();

    // 센서가 아직 등록되지 않아 observe는 못 갔지만 manager.plot은 이미 불렸다. interval은 넘기지 않는다.
    expect(manager.plot).toHaveBeenCalledWith(CTX, 'sensor:1', 'onChange');
    expect(runCmd).not.toHaveBeenCalled();
    expect(done).toBe(false);

    closing.resolve();
    await plotting;
    expect(done).toBe(true);
    // ensure는 plot이 끝난 뒤에도 등록을 기다리는 구독으로 남아 있고, 등록되면 observe를 보낸다.
    await target.createPeripheral(CTX, 'sensor:1', 'Sensor');
    await flush();
    expect(runCmd).toHaveBeenLastCalledWith(CTX, 'firmata', 'observe', 'sensor:1', 'onChange', 50);
  });
});

/**
 * observeHwNotifications와 observeHwNotificationsDistinct는 구조가 같다.
 * 구독만으로는 아무 명령도 보내지 않고, active가 되면 observe 명령을 보낸 뒤 emul 스트림을 구독한다.
 * type이 firmata-value이고 kind가 있는 알림만 통과한다.
 */
describe.each([
  {
    name: 'observeHwNotifications',
    stream: 'notification$' as const,
    spy: 'observeHwNotifications' as const,
    subscribe: (target: FirmataHcpEmul) =>
      target.observeHwNotifications(CTX, 'firmata-value', 'button:3', 100, 'onChange'),
    emulArgs: [CTX, 'firmata-value', 'button:3', 100, 'onChange'],
  },
  {
    name: 'observeHwNotificationsDistinct',
    stream: 'distinct$' as const,
    spy: 'observeHwNotificationsDistinct' as const,
    subscribe: (target: FirmataHcpEmul) =>
      target.observeHwNotificationsDistinct(CTX, 'firmata-value', 'button:3', 'onChange', 'press'),
    emulArgs: [CTX, 'firmata-value', 'button:3', 'onChange', 'press'],
  },
])('$name', ({ stream, spy, subscribe, emulArgs }) => {
  it('active가 되고 observe 명령이 끝난 뒤에야 emul 스트림을 구독한다', async () => {
    const fake = createFakeEmul();
    const observing = deferred();
    const target = new FirmataHcpEmul(fake.emul, new FirmataManager());
    const received: unknown[] = [];

    const subscription = subscribe(target).subscribe((it) => received.push(it));
    await flush();
    expect(fake.runCmd).not.toHaveBeenCalled();
    expect(fake[spy]).not.toHaveBeenCalled();

    fake.runCmd.mockImplementation(async (_ctx, _hwId, cmd) =>
      cmd === 'observe' ? observing.promise : undefined,
    );
    await target.createPeripheral(CTX, 'button:3', 'Button');
    await flush();
    // observe 명령은 interval 없이 (periId, eventName)만 보낸다.
    expect(fake.runCmd).toHaveBeenLastCalledWith(CTX, 'firmata', 'observe', 'button:3', 'onChange');
    expect(fake[spy]).not.toHaveBeenCalled();

    observing.resolve();
    await flush();
    expect(fake[spy]).toHaveBeenCalledWith(...emulArgs);
    expect(received).toEqual([]);
    subscription.unsubscribe();
  });

  it('type이 firmata-value이고 kind가 있는 알림만 내보낸다', async () => {
    const fake = createFakeEmul();
    const target = new FirmataHcpEmul(fake.emul, new FirmataManager());
    const received: unknown[] = [];
    const subscription = subscribe(target).subscribe((it) => received.push(it));
    await target.createPeripheral(CTX, 'button:3', 'Button');
    await flush();

    const valid = { type: 'firmata-value', kind: 'button', periId: 'button:3', value: 1 };
    const noKind = { type: 'firmata-value', periId: 'button:3', value: 1 };
    const otherType = { type: 'hcp-value', kind: 'button', periId: 'button:3', value: 1 };
    const emit = (it: unknown) => fake[stream].next(it as IHcpHwNotification);
    emit(valid);
    emit(otherType);
    emit(noKind);
    emit(null);

    expect(received).toEqual([valid]);
    // kind가 없는 firmata-value만 경고한다. 다른 type과 null은 조용히 버린다.
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('unknown firmata-value notification:', noKind);
    subscription.unsubscribe();
  });
});
