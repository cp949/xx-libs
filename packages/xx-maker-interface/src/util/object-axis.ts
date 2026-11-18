export const OBJECT_STAGE_WIDTH = 558;
export const OBJECT_STAGE_HEIGHT = 335;

export const OBJECT_STAGE_SIZE = {
  width: OBJECT_STAGE_WIDTH,
  height: OBJECT_STAGE_HEIGHT,
};

// export const OBJECT_VISION_WIDTH = 558
// export const OBJECT_VISION_HEIGHT = 335
// export const DEFAULT_PIXEL_PER_MILLI = 600 / 1000
// export const DEFAULT_DEGREE_PER_MILLI = 180 / 1000

const _fixNum = (x: number | undefined, defaultValue = 0) => {
  if (typeof x === 'undefined') return defaultValue;
  return Math.round(x * 10) / 10;
};

// 컴퓨터 좌표계와 사용자 좌표계 변환 유틸
// export class ObjectAxis {
//   /**
//    * 사용자에게 표시할 centerX를 리턴한다
//    */
//   static toUserX = (x: number | undefined) => {
//     const newX = (x ?? 0) - OBJECT_STAGE_WIDTH / 2;
//     return _fixNum(newX);
//   };

//   /**
//    * 사용자에게 표시할 centerY를 리턴한다
//    */
//   static toUserY = (y: number | undefined) => {
//     const newY = OBJECT_STAGE_HEIGHT / 2 - (y ?? 0);
//     return _fixNum(newY);
//   };

//   static fromUserX = (cx: number) => {
//     return _fixNum(cx + OBJECT_STAGE_WIDTH / 2);
//   };

//   static fromUserY = (cy: number) => {
//     return _fixNum(OBJECT_STAGE_HEIGHT / 2 - cy);
//   };
// }

/**
 * 사용자에게 표시할 centerX를 리턴한다
 */
export const toUserX = (x: number | undefined) => {
  const newX = (x ?? 0) - OBJECT_STAGE_WIDTH / 2;
  return _fixNum(newX);
};

/**
 * 사용자에게 표시할 centerY를 리턴한다
 */
export const toUserY = (y: number | undefined) => {
  const newY = OBJECT_STAGE_HEIGHT / 2 - (y ?? 0);
  return _fixNum(newY);
};

export const fromUserX = (cx: number) => {
  return _fixNum(cx + OBJECT_STAGE_WIDTH / 2);
};

export const fromUserY = (cy: number) => {
  return _fixNum(OBJECT_STAGE_HEIGHT / 2 - cy);
};
