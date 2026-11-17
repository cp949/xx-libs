import { ObjectPlayerAxis } from '../model';
import {
  ImageFormat,
  ObjectAnimationTypeKey,
  ObjectImageOnOffOptions,
  ObjectImageSpriteOptions,
} from '../model/common-types';
import { LegacyObject } from '../model/LegacyGenFile';
import { ObjectImage } from '../model/ObjectImage';
import { LegacyResourceUrls } from './resource-urls';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getUrlPathElement = (path: string): string => {
  const idx = path.lastIndexOf('/');
  if (idx < 0) return path;
  return path.substring(idx + 1);
};

const fixUrl = (path: string | null | undefined, urls: LegacyResourceUrls): string | undefined => {
  if (!path) return undefined;
  if (path.length <= 0) return undefined;
  if (path === 'undefined' || path === 'null') return undefined;

  let prefix = path;
  if (prefix.startsWith('../../uploads/')) {
    prefix = prefix.replace('../../uploads/', urls.upload);
  }

  while (prefix.startsWith('../')) {
    prefix = prefix.replace('../', '');
  }

  if (prefix.startsWith('uploads/')) {
    prefix = prefix.replace('uploads/', urls.upload);
  }

  // data: URL은 호출자 함수에 넘기지 않는다.
  return prefix.startsWith('data:') ? prefix : urls.rewrite(prefix);
};

const splitUrlPathElement = (path: string, urls: LegacyResourceUrls): [string, string] => {
  const idx = path.lastIndexOf('/');
  if (idx < 0) {
    throw new Error('invalid url');
  }
  const prefix = fixUrl(path.substring(0, idx), urls);
  if (!prefix) throw new Error('invalid url:' + path);
  const lastPath = path.substring(idx + 1);
  return [prefix, lastPath];
};

const splitFileNames = (str: string): string[] => {
  // '{object1_1.png,object1_2.png,object1_3.png,object1_4.png}'
  return str
    .replace('{', '')
    .replace('}', '')
    .split(',')
    .map((it) => it.trim());
};

export const convertLegacyObject = (obj: LegacyObject, urls: LegacyResourceUrls): ObjectImage => {
  let animationType: ObjectAnimationTypeKey = 'image';
  let spriteOptions: ObjectImageSpriteOptions | undefined = undefined;
  let onOffOptions: ObjectImageOnOffOptions | undefined = undefined;
  const isBackground = obj.object_status === 'bg';
  if (obj.object_type === 'auto') {
    animationType = 'sprite_multi';
    spriteOptions = {
      frameTime: isBackground ? 500 : 250,
      spriteWidth: obj.width,
      spriteHeight: obj.height,
    };
  } else if (obj.object_type === 'normal' || obj.object_type === 'svg') {
    animationType = 'image';
  } else if (obj.object_type === 'bool') {
    animationType = 'onoff';
    onOffOptions = {
      isOn: false,
    };
  } else {
    animationType = 'image';
    if (typeof obj.object_type !== 'undefined' && obj.object_type !== 'undefined') {
      console.log('unknown object_type:', obj.object_type);
    }
    // log.debug('unknown object_type:', obj.object_type)
    // throw new Error('unknown object_type:' + obj.object_type)
  }

  const objRecord = obj as unknown as Record<string, unknown>;
  for (const p in objRecord) {
    if (typeof objRecord[p] === 'string' && objRecord[p] === 'undefined') {
      objRecord[p] = undefined;
    }
  }

  // log.debug(obj)
  let imageFormat: ImageFormat = 'png';

  const imageUrls: string[] = [];

  obj.object_src = fixUrl(obj.object_src, urls);
  obj.src = fixUrl(obj.src, urls);

  const imageCount = +(obj['object_max'] ?? 1);
  const [urlPrefix] = splitUrlPathElement(obj.object_src ?? obj.src ?? '', urls);
  const image_src = obj.src ?? obj.object_src ?? '';
  if (image_src.startsWith('data:')) {
    if (image_src.startsWith('data:image/png;')) imageFormat = 'png';
    else if (image_src.startsWith('data:image/jpeg;')) imageFormat = 'jpg';
    else if (image_src.startsWith('data:image/jpg;')) imageFormat = 'jpg';
    else if (image_src.startsWith('data:image/svg+xml;')) imageFormat = 'svg';
    imageUrls.push(image_src);
  } else {
    if (image_src.endsWith('.svg')) imageFormat = 'svg';
    else if (image_src.endsWith('.jpg') || image_src.endsWith('.jpeg')) imageFormat = 'jpg';
    else if (image_src.endsWith('.png')) imageFormat = 'png';
  }

  const fileNames = splitFileNames((obj['object_save_file_name'] ?? '') as string);
  for (let i = imageUrls.length; i < imageCount; i++) {
    imageUrls.push(urlPrefix + '/' + fileNames[i]);
  }

  return {
    objectId: obj.object_id, // object1022_0
    objectName: obj.object_value, // 군인1
    animationType,
    imageFormat,
    imageUrls,
    isBackground,
    x: isBackground ? 0 : ObjectPlayerAxis.toUserX(obj.left),
    y: isBackground ? 0 : ObjectPlayerAxis.toUserY(obj.top),
    width: obj.width,
    height: obj.height,
    angle: obj.angle ?? 0,
    scaleX: isBackground ? 1 : obj.scaleX,
    scaleY: isBackground ? 1 : obj.scaleY,
    flipX: obj.flipX,
    flipY: obj.flipY,
    visible: obj.visible,
    selectable: true,
    spriteOptions,
    onOffOptions,
  } as ObjectImage;
};
