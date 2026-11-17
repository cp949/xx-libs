export type SoundCateKey = 'HUMAN' | 'NATURE' | 'INSTRUMENT' | 'STUFF' | 'PIANO' | 'ETC';
export type ExApiResponseTypeKey = 'JSON' | 'XML';
export type ImageFormat = 'svg' | 'png' | 'jpg';

export type ObjectImageSpriteOptions = {
  spriteWidth: number;
  spriteHeight: number;
  frameTime: number;
};

export type ObjectImageOnOffOptions = {
  isOn: boolean;
};

// export type ObjectAnimationTypeKey = 'sprite' | 'sprite_multi' | 'onoff' | 'image'
export type ObjectAnimationTypeKey = 'sprite_multi' | 'onoff' | 'image';

export type MakerSound = {
  resId: string;
  title: string;
  soundUrl: string;
  durationMs: number;
};

/**
 * 사용자 정의 리스트
 */
export declare type UserDefinedList = {
  listId: string;
  listName: string;
  values: string[];
};

export declare type ObjectSignal = {
  signalId: string;
  signalName: string;
};
