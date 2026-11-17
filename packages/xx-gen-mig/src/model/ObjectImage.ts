import {
  ImageFormat,
  ObjectAnimationTypeKey,
  ObjectImageOnOffOptions,
  ObjectImageSpriteOptions,
} from './common-types';

export interface ObjectImage {
  objectId: string;
  objectName: string;
  animationType: ObjectAnimationTypeKey;
  imageFormat: ImageFormat;
  imageUrls: string[]; // or dataUrls
  isBackground: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  scaleX: number;
  scaleY: number;
  flipX: boolean;
  flipY: boolean;
  visible: boolean;
  selectable: boolean;

  spriteOptions?: ObjectImageSpriteOptions;
  onOffOptions?: ObjectImageOnOffOptions;
}
