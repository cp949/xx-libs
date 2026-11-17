import { SoundCateKey } from './common-types';

/**
 * @interface MakerSoundResource 메이커 사운드 리소스
 */
export type MakerSoundResource = {
  resId: string;
  title: string;
  soundUrl: string;
  cate: SoundCateKey;
  durationMs: number;
  changeTimestamp: number;
  sortNumber: number;
};
