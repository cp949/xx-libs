// xml2js(MIT)의 파서 중 이 패키지가 쓰는 부분만 옮긴 파일이다. 라이선스 전문은 LICENSE-xml2js에 있다.
//
// 옮긴 범위:
// - 옵션: 기본값(explicitArray, explicitRoot, attrkey `$`, charkey `_`, strict, trim 없음)
// - 빠진 것: 비동기 청크 처리, 이벤트 객체, 프로세서, xmlns, explicitChildren 등 쓰지 않는 옵션
//
// 결과 객체의 모양(`$`는 속성, `_`는 텍스트, 자식은 항상 배열)은 mig-blockxml과 rules가 기대한다.
import sax from 'sax';

const ATTR_KEY = '$';
const CHAR_KEY = '_';
const NAME_KEY = '#name';

const hasOwn = (obj: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(obj, key);

// 요소 이름이나 속성 이름이 `__proto__`여도 프로토타입을 바꾸지 않고 자기 속성으로 둔다.
const defineProperty = (obj: object, key: string, value: unknown): void => {
  const descriptor = Object.create(null);
  descriptor.value = value;
  descriptor.writable = true;
  descriptor.enumerable = true;
  descriptor.configurable = true;
  Object.defineProperty(obj, key, descriptor);
};

const isEmpty = (thing: unknown): boolean =>
  typeof thing === 'object' && thing != null && Object.keys(thing).length === 0;

// 파서가 만드는 객체는 문서마다 모양이 달라 any로 둔다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type XmlNode = Record<string, any>;

// 같은 이름의 자식은 배열로 모은다. 값은 항상 배열에 담긴다.
const assignOrPush = (obj: XmlNode, key: string, newValue: unknown): void => {
  if (!hasOwn(obj, key)) {
    defineProperty(obj, key, [newValue]);
    return;
  }
  if (!(obj[key] instanceof Array)) {
    defineProperty(obj, key, [obj[key]]);
  }
  obj[key].push(newValue);
};

type Outcome = { error: unknown } | { value: unknown };

/**
 * XML 문자열을 객체로 바꾼다.
 *
 * - 결과는 `{ 루트이름: 루트내용 }`이다.
 * - 빈 문자열이나 공백만 있는 문자열, 루트가 없는 문서는 `null`을 돌려준다.
 * - 첫 번째 오류에서 던진다. 루트가 닫힌 뒤에 나오는 내용은 무시한다.
 * - 요소 사이의 공백 텍스트는 버리고, 요소가 공백만 가지면 그 공백을 값으로 둔다.
 *
 * @param xml 파싱할 XML 문자열. 앞의 BOM은 지운다.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseXml = (xml: string): any => {
  const str = String(xml);
  if (str.trim() === '') return null;
  const text = str[0] === '﻿' ? str.substring(1) : str;

  // 먼저 일어난 사건(오류 또는 루트 닫힘)이 결과를 정한다.
  let outcome: Outcome | undefined;
  const settle = (value: Outcome): void => {
    if (!outcome) outcome = value;
  };

  const parser = sax.parser(true, { trim: false, normalize: false, xmlns: false });
  const stack: XmlNode[] = [];

  parser.onerror = (error) => {
    parser.resume();
    settle({ error });
  };

  parser.onend = () => {
    settle({ value: null });
  };

  parser.onopentag = (node) => {
    if (outcome) return;
    const obj: XmlNode = {};
    obj[CHAR_KEY] = '';
    const attributes = node.attributes as Record<string, string>;
    for (const key in attributes) {
      if (!hasOwn(attributes, key)) continue;
      if (!(ATTR_KEY in obj)) obj[ATTR_KEY] = {};
      defineProperty(obj[ATTR_KEY], key, attributes[key]);
    }
    obj[NAME_KEY] = node.name;
    stack.push(obj);
  };

  const ontext = (value: string): XmlNode | undefined => {
    if (outcome) return undefined;
    const s = stack[stack.length - 1];
    if (s) s[CHAR_KEY] += value;
    return s;
  };

  parser.ontext = (value) => {
    ontext(value);
  };

  parser.oncdata = (value) => {
    const s = ontext(value);
    if (s) s.cdata = true;
  };

  parser.onclosetag = () => {
    if (outcome) return;
    let obj: unknown = stack.pop() as XmlNode;
    let node = obj as XmlNode;
    const nodeName = node[NAME_KEY];
    delete node[NAME_KEY];

    // CDATA는 공백만 있어도 텍스트로 남긴다.
    let cdata = false;
    if (node.cdata === true) {
      cdata = true;
      delete node.cdata;
    }

    const s = stack[stack.length - 1];
    let emptyStr: string | undefined;
    if (node[CHAR_KEY].match(/^\s*$/) && !cdata) {
      emptyStr = node[CHAR_KEY];
      delete node[CHAR_KEY];
    } else if (Object.keys(node).length === 1 && CHAR_KEY in node) {
      // 텍스트만 있으면 객체 대신 문자열로 둔다.
      obj = node[CHAR_KEY];
    }

    // 속성도 자식도 없는 요소는 공백 텍스트(없으면 빈 문자열)다.
    if (isEmpty(obj)) obj = emptyStr;

    if (stack.length > 0) {
      assignOrPush(s, nodeName, obj);
      return;
    }

    node = {};
    defineProperty(node, nodeName, obj);
    settle({ value: node });
  };

  try {
    parser.write(text).close();
  } catch (error) {
    settle({ error });
  }

  const result = outcome ?? { value: null };
  if ('error' in result) throw result.error;
  return result.value;
};
