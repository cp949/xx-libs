import { MakerSound } from '../model';
import { LegacySound } from '../model/LegacyGenFile';
import { LegacyResourceUrls } from './resource-urls';

export const convertLegacySound = (sound: LegacySound, urls: LegacyResourceUrls): MakerSound => {
  return {
    resId: sound.id,
    title: sound.value,
    soundUrl: `${urls.sound}${sound.id}.mp3`,
    durationMs: +sound.sec.replace('초', '') * 1000,
  } as MakerSound;
};
