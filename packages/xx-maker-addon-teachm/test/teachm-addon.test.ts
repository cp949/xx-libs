// Teachm*Addon 세 클래스가 iframe에 보내는 명령과 수명 관리를 고정하는 특성화 테스트.
// iframe 객체의 start/stop/runCmd를 가짜로 바꿔 어떤 명령을 어떤 인자로 보내는지 본다.
// 실제 iframe 요소 생성은 teachm-iframe.test.ts가 맡고, 여기서는 config의 iframeUrl이 iframe까지 전달되는지만 확인한다.
// 원본 동작을 그대로 옮긴 코드이므로 어색해 보이는 동작도 바꾸지 않고 고정한다.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TeachmAudioAddon, TeachmImageAddon, TeachmPoseAddon } from '../src/index.js';

const URL_BASE = 'https://models.example.test/teachm/';

/** 세 애드온은 config 키와 iframe 이름만 다르다. 생성자 타입이 서로 달라 any로 다룬다. */
type AnyAddon = {
  iframe: {
    start: () => void;
    stop: () => void;
    runCmd: (cmd: string, args?: unknown[]) => Promise<unknown>;
  };
  onAddonDestroy: () => void;
  [method: string]: any;
};

const CASES = [
  {
    label: 'TeachmPoseAddon',
    Class: TeachmPoseAddon,
    configKey: 'teachmPose',
    name: 'CODINY_IFRAME_TEACHM_POSE',
    predicts: true,
  },
  {
    label: 'TeachmImageAddon',
    Class: TeachmImageAddon,
    configKey: 'teachmImage',
    name: 'CODINY_IFRAME_TEACHM_IMAGE',
    predicts: true,
  },
  {
    label: 'TeachmAudioAddon',
    Class: TeachmAudioAddon,
    configKey: 'teachmAudio',
    name: 'CODINY_IFRAME_TEACHM_AUDIO',
    predicts: false,
  },
] as const;

let addons: AnyAddon[] = [];

beforeEach(() => {
  // 소스가 console을 그대로 쓰므로 출력을 막는다.
  for (const method of ['debug', 'info', 'log', 'warn'] as const) {
    vi.spyOn(console, method).mockImplementation(() => {});
  }
});

afterEach(() => {
  for (const addon of addons) addon.onAddonDestroy();
  addons = [];
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe.each(CASES)('$label', ({ Class, configKey, name, predicts }) => {
  const make = (): AnyAddon => {
    const addon = new Class({
      [configKey]: { iframeUrl: URL_BASE },
    } as never) as unknown as AnyAddon;
    addons.push(addon);
    return addon;
  };

  /** iframe의 start/stop/runCmd를 가짜로 바꾼다. runCmd는 호출 기록을 남기고 result를 돌려준다. */
  const stub = (addon: AnyAddon, result: unknown = undefined) => {
    const { iframe } = addon;
    const start = vi.spyOn(iframe, 'start').mockImplementation(() => {});
    const stop = vi.spyOn(iframe, 'stop').mockImplementation(() => {});
    const runCmd = vi.spyOn(iframe, 'runCmd').mockResolvedValue(result);
    return { iframe, start, stop, runCmd };
  };

  it('config의 iframeUrl로 iframe을 시작한다', () => {
    const addon = make();

    void addon.loadModel('m');

    const frame = document.querySelector(`[id="${name}"]`);
    expect(frame?.getAttribute('src')).toBe(`${URL_BASE}?iframeToken=${name}`);
  });

  it('loadModel은 첫 호출에 iframe을 시작하고 응답 값은 버린다', async () => {
    const addon = make();
    const { start, runCmd } = stub(addon, '응답');

    const first = await addon.loadModel('m1');
    await addon.loadModel('m2');

    expect(first).toBeUndefined();
    expect(start).toHaveBeenCalledTimes(1);
    expect(runCmd.mock.calls).toEqual([
      ['loadModel', ['m1']],
      ['loadModel', ['m2']],
    ]);
  });

  it('hasModel은 응답 값을 그대로 돌려준다', async () => {
    const addon = make();
    const { start, runCmd } = stub(addon, true);

    expect(await addon.hasModel('m')).toBe(true);

    expect(start).toHaveBeenCalledTimes(1);
    expect(runCmd.mock.calls).toEqual([['hasModel', ['m']]]);
  });

  it('onAddonDestroy는 시작한 뒤에만 iframe을 멈추고 인스턴스를 버린다', async () => {
    const addon = make();
    const before = stub(addon);

    addon.onAddonDestroy();
    expect(before.stop).not.toHaveBeenCalled();
    expect(addon.iframe).toBe(before.iframe);

    await addon.loadModel('m');
    addon.onAddonDestroy();
    expect(before.stop).toHaveBeenCalledTimes(1);
    expect(addon.iframe).not.toBe(before.iframe);

    addon.onAddonDestroy();
    expect(before.stop).toHaveBeenCalledTimes(1);
  });

  if (predicts) {
    it('predict는 loadModel을 먼저 보낸 뒤 predict 결과를 돌려주고, 부를 때마다 loadModel을 다시 보낸다', async () => {
      const addon = make();
      const { runCmd } = stub(addon, { classLabel: 'A', score: 0.9 });

      const result = await addon.predict('m', 'data:image/png;base64,AA');
      await addon.predict('m', 'data:image/png;base64,BB');

      expect(result).toEqual({ classLabel: 'A', score: 0.9 });
      expect(runCmd.mock.calls).toEqual([
        ['loadModel', ['m']],
        ['predict', ['m', 'data:image/png;base64,AA']],
        ['loadModel', ['m']],
        ['predict', ['m', 'data:image/png;base64,BB']],
      ]);
    });

    it('getClassLabels는 loadModel을 먼저 보낸 뒤 라벨 목록을 돌려준다', async () => {
      const addon = make();
      const { runCmd } = stub(addon, ['A', 'B']);

      expect(await addon.getClassLabels('m')).toEqual(['A', 'B']);

      expect(runCmd.mock.calls).toEqual([
        ['loadModel', ['m']],
        ['getClassLabels', ['m']],
      ]);
    });
  } else {
    it('startListen과 wordLabels는 loadModel을 먼저 보낸 뒤 각 명령의 결과를 돌려준다', async () => {
      const addon = make();
      const { runCmd } = stub(addon, 'r');

      expect(await addon.startListen('m')).toBe('r');
      expect(await addon.wordLabels('m')).toBe('r');

      expect(runCmd.mock.calls).toEqual([
        ['loadModel', ['m']],
        ['startListen', ['m']],
        ['loadModel', ['m']],
        ['wordLabels', ['m']],
      ]);
    });

    it('stopListening은 시작하기 전에는 아무것도 보내지 않고 undefined를 돌려준다', async () => {
      const addon = make();
      const { start, runCmd } = stub(addon, 'r');

      expect(await addon.stopListening('m')).toBeUndefined();
      expect(start).not.toHaveBeenCalled();
      expect(runCmd).not.toHaveBeenCalled();

      await addon.loadModel('m');
      expect(await addon.stopListening('m')).toBe('r');
      expect(runCmd).toHaveBeenLastCalledWith('stopListening', ['m']);
    });
  }
});
