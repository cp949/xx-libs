// iframe 안쪽(child) 통신 계약을 고정하는 특성화 테스트.
// vitest의 jsdom 환경에서 실행한다. jsdom은 `window.parent === window`이므로 부모로 가는 메시지는
// `window.parent.postMessage` 감시로 확인하고, 부모가 보낸 명령은 window의 message 이벤트로 흉내 낸다.
// 원본 동작을 그대로 옮긴 코드이므로 어색해 보이는 동작도 바꾸지 않고 고정한다.
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import {
  KodinyPet,
  EventEmitter,
  SendToParentImpl,
  type IPetContext,
  type PetCommandEventMap,
} from '../src/index.js';
import { IframeCommandReceiver } from '../src/IframeCommandReceiver.js';

const TOKEN = 'token-1';

/** 부모가 iframe으로 보낸 것처럼 message 이벤트를 발생시킨다. */
const fromParent = (data: unknown): void => {
  window.dispatchEvent(new MessageEvent('message', { data }));
};

let toParentSpy: MockInstance<Window['postMessage']>;

beforeEach(() => {
  toParentSpy = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
  // logger는 console을 그대로 쓰므로 출력을 막는다.
  vi.spyOn(console, 'debug').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SendToParentImpl', () => {
  it('cmd와 event를 iframeToken을 붙여 부모 window로 보낸다', () => {
    const toParent = new SendToParentImpl(TOKEN);

    toParent.cmd.success({ requestId: 1, value: 'v' });
    toParent.cmd.error({ requestId: 2, errorCode: 'E1', message: 'm' });
    toParent.event.emit('hello', 1, 'a');

    expect(toParentSpy.mock.calls).toEqual([
      [{ type: 'cmd', success: true, requestId: 1, value: 'v', iframeToken: TOKEN }, '*'],
      [
        {
          type: 'cmd',
          success: false,
          requestId: 2,
          errorCode: 'E1',
          message: 'm',
          iframeToken: TOKEN,
        },
        '*',
      ],
      [{ type: 'event', eventKey: 'hello', args: [1, 'a'], iframeToken: TOKEN }, '*'],
    ]);
  });
});

describe('IframeCommandReceiver', () => {
  const setup = () => {
    const events = new EventEmitter<PetCommandEventMap>();
    const receiver = new IframeCommandReceiver(events);
    const onCommand = vi.fn();
    receiver.registerOnCmdReceive(onCommand);
    receiver.startListen();
    return { receiver, onCommand };
  };

  it('type과 cmd가 문자열인 메시지만 command 이벤트로 전달한다', () => {
    const { receiver, onCommand } = setup();

    fromParent({ type: 'cmd', cmd: 'play', args: [1] });
    fromParent({ type: 'cmd' });
    fromParent({ cmd: 'play' });
    fromParent(null);
    fromParent('text');
    expect(onCommand).toHaveBeenCalledTimes(1);
    expect(onCommand).toHaveBeenCalledWith({ type: 'cmd', cmd: 'play', args: [1] });
    receiver.stopListen();
  });

  it('source에 devtools가 들어 있는 메시지는 무시한다', () => {
    const { receiver, onCommand } = setup();

    fromParent({ source: 'react-devtools-content-script', type: 'cmd', cmd: 'play' });
    expect(onCommand).not.toHaveBeenCalled();
    receiver.stopListen();
  });

  it('stopListen 뒤에는 전달하지 않는다', () => {
    const { receiver, onCommand } = setup();

    receiver.stopListen();
    fromParent({ type: 'cmd', cmd: 'play' });
    expect(onCommand).not.toHaveBeenCalled();
  });
});

describe('KodinyPet', () => {
  /** init에서 값을 기록하고, 명령 두 개를 가진 실행기. */
  class Runner {
    static created: Runner[] = [];

    constructor(readonly context: IPetContext) {
      Runner.created.push(this);
    }

    init = async () => {};
    start = async () => {};
    stop = async () => {};
    destroy = async () => {};
    echo = async (value: string) => value;
    fail = async () => {
      throw new Error('boom');
    };
  }

  let pet: KodinyPet;

  beforeEach(() => {
    Runner.created = [];
    pet = new KodinyPet({ iframeToken: TOKEN, commandRunnerClass: Runner });
  });

  afterEach(async () => {
    await pet.stop();
  });

  it('start는 부모에게 __iframe-state starting, ready 순서로 알리고 stateChanged started를 낸다', async () => {
    const states: string[] = [];
    pet.notifyEvents.on('stateChanged', (s) => states.push(s));

    await pet.start();

    const eventKeys = toParentSpy.mock.calls.map(([frame]) => [frame.eventKey, frame.args]);
    expect(eventKeys).toEqual([
      ['__iframe-state', ['starting']],
      ['__iframe-state', ['ready']],
    ]);
    expect(states).toEqual(['started']);
  });

  it('부모가 보낸 명령은 실행기의 같은 이름 메서드를 호출하고 성공 응답을 돌려준다', async () => {
    await pet.start();
    toParentSpy.mockClear();

    fromParent({ type: 'cmd', requestId: 7, cmd: 'echo', args: ['hi'] });
    await vi.waitFor(() => expect(toParentSpy).toHaveBeenCalled());
    expect(toParentSpy).toHaveBeenCalledWith(
      { type: 'cmd', success: true, requestId: 7, value: 'hi', iframeToken: TOKEN },
      '*',
    );
  });

  it('명령이 던지면 errorCode unknown과 message를 담은 실패 응답을 돌려준다', async () => {
    await pet.start();
    toParentSpy.mockClear();

    fromParent({ type: 'cmd', requestId: 8, cmd: 'fail' });
    await vi.waitFor(() => expect(toParentSpy).toHaveBeenCalled());
    expect(toParentSpy).toHaveBeenCalledWith(
      {
        type: 'cmd',
        success: false,
        requestId: 8,
        errorCode: 'unknown',
        message: 'boom',
        iframeToken: TOKEN,
      },
      '*',
    );
  });

  it('실행기에 없는 명령은 응답하지 않는다', async () => {
    await pet.start();
    toParentSpy.mockClear();

    fromParent({ type: 'cmd', requestId: 9, cmd: 'nothing' });
    // 비동기 처리가 끝날 시간을 준 뒤에도 아무것도 보내지 않아야 한다.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(toParentSpy).not.toHaveBeenCalled();
  });

  it('stop은 stopping, stopped 순서로 알리고 실행기 stop을 호출한다', async () => {
    await pet.start();
    const runner = Runner.created[0]!;
    const stopSpy = vi.spyOn(runner, 'stop');
    const states: string[] = [];
    pet.notifyEvents.on('stateChanged', (s) => states.push(s));

    await pet.stop();
    expect(states).toEqual(['stopping', 'stopped']);
    expect(stopSpy).toHaveBeenCalledTimes(1);
  });

  // 회귀 테스트: PetAgent.stop이 실행기를 비운 뒤에 정리 체인이 돌아 destroy가 호출되지 않던 결함.
  it('stop은 실행기 destroy를 호출하고 부모에게 __iframe-state stopped를 보낸다', async () => {
    await pet.start();
    const runner = Runner.created[0]!;
    const destroySpy = vi.spyOn(runner, 'destroy');
    toParentSpy.mockClear();

    await pet.stop();
    expect(destroySpy).toHaveBeenCalledTimes(1);
    expect(toParentSpy.mock.calls.map(([frame]) => [frame.eventKey, frame.args])).toEqual([
      ['__iframe-state', ['stopped']],
    ]);
  });

  // 회귀 테스트: KodinyPet.stop이 정리 체인을 기다리지 않고 리스너를 지워 이벤트가 도착하지 않던 결함.
  it('stop이 끝나기 전에 실행기 정지 이벤트가 구독자에게 도착한다', async () => {
    await pet.start();
    const events: string[] = [];
    pet.notifyEvents.on('commandRunnerDestroyed', () => events.push('destroyed'));
    pet.notifyEvents.on('commandRunnerStateChanged', (p) => events.push(`changed:${p.state}`));
    pet.notifyEvents.on('commandRunnerStopped', () => events.push('stopped'));

    await pet.stop();
    expect(events).toEqual(['destroyed', 'changed:stopped', 'stopped']);
  });

  it('실행기 stop이 던져도 destroy와 정지 이벤트는 이어진다', async () => {
    await pet.start();
    const runner = Runner.created[0]!;
    vi.spyOn(runner, 'stop').mockRejectedValue(new Error('stop failed'));
    const destroySpy = vi.spyOn(runner, 'destroy');
    const onStopped = vi.fn();
    pet.notifyEvents.on('commandRunnerStopped', onStopped);

    await pet.stop();
    expect(destroySpy).toHaveBeenCalledTimes(1);
    expect(onStopped).toHaveBeenCalledTimes(1);
  });
});
