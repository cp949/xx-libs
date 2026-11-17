import { describe, expect, it } from 'vitest';
import { buildXml, parseXml } from '../src/xml';

// 기대값은 포팅 전 xml2js의 실제 출력이다. 옵션은 mig-blockxml이 쓰던 값이다.
// - 파서: includeWhiteChars: true, 나머지 기본값
// - 빌더: rootName 'xml', headless: true, renderOpts { pretty: true, indent: '' }

describe('parseXml', () => {
  const ok: [string, string, unknown][] = [
    [
      '속성과 텍스트',
      '<xml><block type="t" id="1"><field name="X">hi</field></block></xml>',
      { xml: { block: [{ $: { type: 't', id: '1' }, field: [{ _: 'hi', $: { name: 'X' } }] }] } },
    ],
    [
      '같은 이름 자식은 배열',
      '<xml><block type="a"/><block type="b"/></xml>',
      { xml: { block: [{ $: { type: 'a' } }, { $: { type: 'b' } }] } },
    ],
    [
      '요소 사이 들여쓰기는 버린다',
      '<xml>\n  <block type="a">\n    <next>\n      <block type="b"/>\n    </next>\n  </block>\n</xml>',
      { xml: { block: [{ $: { type: 'a' }, next: [{ block: [{ $: { type: 'b' } }] }] }] } },
    ],
    ['빈 요소', '<a><b/><c></c></a>', { a: { b: [''], c: [''] } }],
    ['공백만 있는 요소', '<a><b>  </b></a>', { a: { b: ['  '] } }],
    ['텍스트 앞뒤 공백 유지', '<a><b> x  y </b></a>', { a: { b: [' x  y '] } }],
    ['혼합 콘텐츠', '<a>x<b/>y</a>', { a: { _: 'xy', b: [''] } }],
    ['엔티티', '<a><b>&amp;&lt;&gt;&quot;&apos;&#x41;&#66;</b></a>', { a: { b: ['&<>"\'AB'] } }],
    ['CDATA', '<a><b><![CDATA[ <z> & ]]></b></a>', { a: { b: [' <z> & '] } }],
    ['공백만 있는 CDATA', '<a><b><![CDATA[ ]]></b></a>', { a: { b: [' '] } }],
    ['속성 엔티티', '<a><b v="&lt;&amp;&quot;"/></a>', { a: { b: [{ $: { v: '<&"' } }] } }],
    [
      'xmlns 속성',
      '<xml xmlns="http://www.w3.org/1999/xhtml"><block type="a"/></xml>',
      { xml: { $: { xmlns: 'http://www.w3.org/1999/xhtml' }, block: [{ $: { type: 'a' } }] } },
    ],
    ['BOM', '﻿<a><b>x</b></a>', { a: { b: ['x'] } }],
    ['빈 문자열', '', null],
    ['공백 문자열', ' \n ', null],
    [
      '선언 주석 처리명령 doctype',
      '<?xml version="1.0"?><!-- c --><!DOCTYPE a><a><b/></a>',
      { a: { b: [''] } },
    ],
    ['루트 뒤 쓰레기', '<a/>x', { a: '' }],
    ['루트가 둘', '<a/><b/>', { a: '' }],
    ['루트 없는 선언만', '<?xml version="1.0"?>', null],
    ['중복 속성', '<a b="1" b="2"/>', { a: { $: { b: '1' } } }],
  ];

  it.each(ok)('%s', (_name, xml, expected) => {
    expect(parseXml(xml)).toEqual(expected);
  });

  const errors: [string, string, string][] = [
    ['짝이 안 맞는 태그', '<xml><a></xml>', 'Unexpected close tag\nLine: 0\nColumn: 14\nChar: >'],
    ['닫히지 않은 루트', '<a><b/>', 'Unclosed root tag\nLine: 0\nColumn: 7\nChar: '],
    ['루트 앞 텍스트', 'abc<a/>', 'Non-whitespace before first tag.\nLine: 0\nColumn: 1\nChar: a'],
    ['속성 따옴표 없음', '<a b=1/>', 'Unquoted attribute value\nLine: 0\nColumn: 6\nChar: 1'],
  ];

  it.each(errors)('오류: %s', (_name, xml, message) => {
    expect(() => parseXml(xml)).toThrow(message);
  });

  it('요소 이름이 __proto__여도 프로토타입을 바꾸지 않고 자기 속성으로 둔다', () => {
    const result = parseXml('<a><__proto__ x="1"/></a>');

    expect(Object.prototype.hasOwnProperty.call(result.a, '__proto__')).toBe(true);
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });
});

describe('buildXml', () => {
  const cases: [string, unknown, string][] = [
    [
      '속성과 텍스트',
      { $: { type: 't', id: '1' }, field: [{ $: { name: 'X' }, _: 'hi' }] },
      '<xml type="t" id="1">\n<field name="X">hi</field>\n</xml>',
    ],
    ['문자열 배열', { a: ['x', 'y'] }, '<xml>\n<a>x</a>\n<a>y</a>\n</xml>'],
    [
      '객체 배열',
      {
        block: [
          { $: { type: 'a' } },
          { $: { type: 'b' }, next: [{ block: [{ $: { type: 'c' } }] }] },
        ],
      },
      '<xml>\n<block type="a"/>\n<block type="b">\n<next>\n<block type="c"/>\n</next>\n</block>\n</xml>',
    ],
    [
      '이스케이프',
      { $: { v: '<&">' }, _: 'a<b&c>d' },
      '<xml v="&lt;&amp;&quot;>">a&lt;b&amp;c&gt;d</xml>',
    ],
    [
      '숫자 불리언 null',
      { n: 3, b: false, z: null },
      '<xml>\n<n>3</n>\n<b>false</b>\n<z/>\n</xml>',
    ],
    ['빈 문자열 값', { a: '', b: [''] }, '<xml>\n<a/>\n<b/>\n</xml>'],
    ['중첩 객체', { a: { b: { c: 'x' } } }, '<xml>\n<a>\n<b>\n<c>x</c>\n</b>\n</a>\n</xml>'],
    ['배열 안의 배열', { a: [[{ b: 'x' }]] }, '<xml>\n<a>\n<b>x</b>\n</a>\n</xml>'],
    ['속성이 객체가 아님', { $: 'x', a: 'y' }, '<xml>\n<a>y</a>\n</xml>'],
  ];

  it.each(cases)('%s', (_name, obj, expected) => {
    expect(buildXml(obj)).toBe(expected);
  });
});
