// 패키지 공개 API와 하드웨어 목록 계약을 고정하는 특성화 테스트.
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as api from '../src/index';
import { webSerialHardwareMap, webSerialHardwares } from '../src/index';
import { createFakeDevice } from './core-fakes';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('공개 API', () => {
  it('DelimiterParser, InterByteTimeoutParser, WebSerialDevice, 하드웨어 목록만 내보낸다', () => {
    expect(Object.keys(api).sort()).toEqual([
      'DelimiterParser',
      'InterByteTimeoutParser',
      'WebSerialDevice',
      'webSerialHardwareMap',
      'webSerialHardwares',
    ]);
  });
});

describe('webSerialHardwares', () => {
  it('지원 장치 5개를 정해진 순서로 담는다', () => {
    expect(webSerialHardwares.map((it) => it.hwId)).toEqual([
      'wiseXboard',
      'wiseXboardPremium',
      'exMarsCube',
      'saeonAltinoLite',
      'saeonAl',
    ]);
    expect(webSerialHardwares.every((it) => it.hwKind === 'serial')).toBe(true);
  });

  it('webSerialHardwareMap은 hwId로 같은 항목을 찾게 한다', () => {
    expect(Object.keys(webSerialHardwareMap)).toHaveLength(5);
    for (const hw of webSerialHardwares) {
      expect(webSerialHardwareMap[hw.hwId]).toBe(hw);
    }
  });

  it('createControl은 ctx.device로 Control을 만든다', async () => {
    for (const hw of webSerialHardwares) {
      const { device } = createFakeDevice();
      const control = hw.createControl({ device });
      expect(typeof control.observePacket).toBe('function');
    }

    // wiseXboard 계열은 만든 Control이 ctx.device에 쓰는지로 확인한다.
    const { device, write } = createFakeDevice();
    const control = webSerialHardwareMap.wiseXboardPremium.createControl({ device });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    await control.onBeforeClose({});
    expect(write).toHaveBeenCalled();
  });
});
