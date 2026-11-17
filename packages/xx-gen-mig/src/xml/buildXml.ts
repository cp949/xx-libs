// xml2js(MIT)의 빌더 중 이 패키지가 쓰는 부분만 옮긴 파일이다. 라이선스 전문은 LICENSE-xml2js에 있다.
//
// 옮긴 범위:
// - 옵션: 루트 이름 `xml`, XML 선언 없음(headless), 줄 단위 출력(들여쓰기 없음)
// - 빠진 것: rootName, xmldec, doctype, cdata 옵션
//
// 입력 객체의 모양은 parseXml의 결과와 같다. `$`는 속성, `_`는 텍스트다.
import xmlbuilder from 'xmlbuilder';

const hasOwn = (obj: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(obj, key);

// 입력 객체와 xmlbuilder 요소는 모양이 문서마다 달라 any로 둔다.
/* eslint-disable @typescript-eslint/no-explicit-any */
const render = (element: any, obj: any): any => {
  if (typeof obj !== 'object') {
    element.txt(obj);
  } else if (Array.isArray(obj)) {
    for (const index in obj) {
      if (!hasOwn(obj, index)) continue;
      const child = obj[index];
      for (const key in child) {
        element = render(element.ele(key), child[key]).up();
      }
    }
  } else {
    for (const key in obj) {
      if (!hasOwn(obj, key)) continue;
      let child = obj[key];
      if (key === '$') {
        if (typeof child === 'object') {
          for (const attr in child) {
            element = element.att(attr, child[attr]);
          }
        }
      } else if (key === '_') {
        element = element.txt(child);
      } else if (Array.isArray(child)) {
        for (const index in child) {
          if (!hasOwn(child, index)) continue;
          const entry = child[index];
          if (typeof entry === 'string') {
            element = element.ele(key, entry).up();
          } else {
            element = render(element.ele(key), entry).up();
          }
        }
      } else if (typeof child === 'object') {
        element = render(element.ele(key), child).up();
      } else {
        if (child == null) child = '';
        element = element.ele(key, child.toString()).up();
      }
    }
  }
  return element;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * 객체를 `<xml>` 루트의 XML 문자열로 바꾼다.
 *
 * - XML 선언은 쓰지 않는다.
 * - 요소마다 줄을 바꾸고 들여쓰지 않는다.
 * - 값이 `null`이거나 `undefined`인 자식은 빈 요소가 된다.
 *
 * @param rootObj `<xml>` 안에 들어갈 내용. `$`는 속성, `_`는 텍스트다.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const buildXml = (rootObj: any): string => {
  const rootElement = xmlbuilder.create('xml', { headless: true });
  return render(rootElement, rootObj).end({ pretty: true, indent: '' });
};
