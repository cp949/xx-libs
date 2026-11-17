const bg = {
  type: 'image',
  version: '2.4.6',
  originX: 'center',
  originY: 'center',
  left: 279,
  top: 167,
  width: 558,
  height: 335,
  fill: 'rgb(0,0,0)',
  stroke: null,
  strokeWidth: 0,
  strokeDashArray: null,
  strokeLineCap: 'butt',
  strokeDashOffset: 0,
  strokeLineJoin: 'miter',
  strokeMiterLimit: 4,
  scaleX: 1,
  scaleY: 1,
  angle: 0,
  flipX: false,
  flipY: false,
  opacity: 1,
  shadow: null,
  visible: true,
  clipTo: null,
  backgroundColor: '',
  fillRule: 'nonzero',
  paintFirst: 'fill',
  globalCompositeOperation: 'source-over',
  transformMatrix: null,
  skewX: 0,
  skewY: 0,
  crossOrigin: '',
  cropX: 0,
  cropY: 0,
  src: 'https://example.com/uploads/background/object632_1.png',
  filters: [Array],
  object_id: 'object632_0',
  object_type: 'normal',
  type2: 'type1',
  object_max: '1',
  object_value: '햄버거집',
  object_src: '../../uploads/background/object632_1.png',
  object_status: 'bg',
  object_class: 'object632',
  object_real_file_name: '{햄버거집.png}',
  object_save_file_name: '{object632_1.png}',
  object_resizeWidth: 558,
  object_resizeHeight: 334,
  blockId: '',
  ratioVersion: 'normal',
};

const s1 = {
  type: 'image',
  version: '2.4.6',
  originX: 'center',
  originY: 'center',
  left: 279,
  top: 167,
  width: 80,
  height: 69,
  fill: 'rgb(0,0,0)',
  stroke: null,
  strokeWidth: 0,
  strokeDashArray: null,
  strokeLineCap: 'butt',
  strokeDashOffset: 0,
  strokeLineJoin: 'miter',
  strokeMiterLimit: 4,
  scaleX: 1,
  scaleY: 1,
  angle: 0,
  flipX: false,
  flipY: false,
  opacity: 1,
  shadow: null,
  visible: true,
  clipTo: null,
  backgroundColor: '',
  fillRule: 'nonzero',
  paintFirst: 'fill',
  globalCompositeOperation: 'source-over',
  transformMatrix: null,
  skewX: 0,
  skewY: 0,
  crossOrigin: '',
  cropX: 0,
  cropY: 0,
  src: 'https://example.com/block/images/object/type4/object1_1.png',
  filters: [],
  object_id: 'object1_0',
  object_type: 'auto',
  type2: 'type4',
  object_max: '4',
  object_value: '빨강블록',
  object_src: '../uploads/object/object1_1.png',
  object_status: 'object',
  object_class: 'object1',
  object_real_file_name: '{빨강블록_1.png,빨강블록_2.png,빨강블록_3.png,빨강블록_4.png}',
  object_save_file_name: '{object1_1.png,object1_2.png,object1_3.png,object1_4.png}',
  object_resizeWidth: 558,
  object_resizeHeight: 334,
  blockId: '',
  ratioVersion: 'normal',
};

export interface LegacyObject {
  type: string; // 'image',
  version: string; // '2.4.6',
  originX: string; // 'center',
  originY: string; // 'center',
  left: number; // 43.15,
  top: number; // 205.4,
  width: number; // 83,
  height: number; // 262,
  fill: string; // 'rgb(0,0,0)',
  scaleX: number; // 0.71,
  scaleY: number; // 0.71,
  angle?: number; // 0,
  flipX: boolean; // false,
  flipY: boolean; // false,
  // opacity: number  // 1,
  // shadow: null,
  visible: boolean; // true,
  // clipTo: null,
  // backgroundColor: '',
  // fillRule: 'nonzero',
  // paintFirst: 'fill',
  // globalCompositeOperation: 'source-over',
  // transformMatrix: null,
  //skewX: 0,
  //skewY: 0,
  //crossOrigin: '',
  //cropX: 0,
  //cropY: 0,
  src?: string; // 'https://example.com/uploads/object/object1022_1.png',
  //filters: [Array],
  object_id: string; // 'object1022_0',
  object_type?: string; // 'normal',
  type2: string; // 'type1',
  object_max: string; // '1',
  object_value: string; // '군인1',
  object_src?: string; // '../../uploads/object/object1022_1.png',
  object_status: 'object' | 'bg';
  // object_class: 'object1022',
  //object_real_file_name: '{빨강블록_1.png,빨강블록_2.png,빨강블록_3.png,빨강블록_4.png}',
  object_save_file_name: string; // '{object1_1.png,object1_2.png,object1_3.png,object1_4.png}',
  //object_resizeWidth: 558,
  //object_resizeHeight: 334,
  //blockId: '',
  //ratioVersion: 'normal'
}

export interface LegacyScene {
  scene: string;
  data: string; // xml
  // code: string
  sceneName: string;
  // sumnail: string
}

export interface LegacySound {
  sec: string; // ex) "1.3초"
  class: string; // ex) "sound_name"
  id: string; // ex) "sound6"
  value: string; // ex) "아스팔트 뛰는 소리"
  real_file_name: string; // ex) "sound6.mp3"
  save_file_name: string; // ex) "sound6.mp3"
}

export interface LegacyGenFile {
  sceneList: LegacyScene[];

  signalList: string[];
  listList: Array<{ listId: string; list: string[] }>;
  signalNameList: string[];
  listNameList: string[];

  myApiList: Array<{
    seq: number;
    user_id: string;
    end_point: string;
    api_keyvalue: string;
    api_name: string;
  }>;

  varList: Array<{ id: string; name: string; value: string; type: string }>;
  modelSeq: string | number; // 대부분 문자열로 되어 있지만, 숫자도 있다
  modelTextSeq: string | number; // 대부분 문자열로 되어 있지만, 숫자도 있다
}
