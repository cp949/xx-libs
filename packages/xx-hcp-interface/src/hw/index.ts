import { Hardware } from './types';

export * from './defaultSerialOptions';
export * from './types';

export interface IHwConnEnv {
  isChromeOS: boolean;
  isCodingpack: boolean;
  isMobile: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isDesktop: boolean;
  isWindows: boolean;
  isMacOs: boolean;
}

type HwFilterFn = (hw: Hardware) => boolean;

/**
 * Env 필터 함수 생성
 * @param connEnv
 * @returns
 */
export function createHwEnvFilterFn(connEnv: IHwConnEnv): HwFilterFn {
  if (connEnv.isCodingpack) {
    return (hw) => hw.supportKodinypack;
  }

  if (connEnv.isChromeOS) {
    return (hw) => hw.supportChromeOS;
  }

  if (connEnv.isAndroid) {
    return (hw) => hw.supportAndroid;
  }

  if (connEnv.isIOS) {
    return (hw) => hw.supportIOS;
  }

  return (hw) => hw.supportDesktop;
}

export function createHwFilterFn(connEnv: IHwConnEnv, filterFn?: HwFilterFn): HwFilterFn {
  const envFilterFn = createHwEnvFilterFn(connEnv);
  if (!filterFn) {
    return envFilterFn;
  }

  return (hw) => {
    return envFilterFn(hw) && filterFn(hw);
  };
}
