export const OBJECT_PLAYER_WIDTH = 558;
export const OBJECT_PLAYER_HEIGHT = 335;
export const OBJECT_VISION_WIDTH = 558;
export const OBJECT_VISION_HEIGHT = 335;
export const DEFAULT_PIXEL_PER_MILLI = 600 / 1000;
export const DEFAULT_DEGREE_PER_MILLI = 180 / 1000;

const _fixNum = (x: number | undefined, defaultValue = 0) => {
  if (typeof x === 'undefined') return defaultValue;
  return Math.round(x * 10) / 10;
};

// 컴퓨터 좌표계와 사용자 좌표계 변환 유틸
export class ObjectPlayerAxis {
  /**
   * 사용자에게 표시할 centerX를 리턴한다
   * @param shape
   * @param x
   */
  static toUserX = (x: number | undefined) => {
    x = x ?? 0;
    const newX = x - OBJECT_PLAYER_WIDTH / 2;
    return _fixNum(newX);
  };

  /**
   * 사용자에게 표시할 centerY를 리턴한다
   * @param shape
   * @param y
   */
  static toUserY = (y: number | undefined) => {
    y = y ?? 0;
    const newY = OBJECT_PLAYER_HEIGHT / 2 - y;
    return _fixNum(newY);
  };

  static fromUserX = (cx: number) => {
    return _fixNum(cx + OBJECT_PLAYER_WIDTH / 2);
  };

  static fromUserY = (cy: number) => {
    return _fixNum(OBJECT_PLAYER_HEIGHT / 2 - cy);
  };
}
