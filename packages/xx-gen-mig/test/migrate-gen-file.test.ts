import { afterEach, describe, expect, it, vi } from 'vitest';
import { migrateGenFile } from '../src';

const OPTIONS = { legacyResourceBaseUrl: 'https://res.example.com/legacy' };
const migrate = (legacyGenObject: unknown) => migrateGenFile(legacyGenObject, OPTIONS);

const BLOCK_XML = '<xml><block type="text"></block></xml>';

const legacyObject = (objectId: string) => ({
  type: 'image',
  version: '2.4.6',
  originX: 'center',
  originY: 'center',
  left: 10,
  top: 20,
  width: 30,
  height: 40,
  fill: 'rgb(0,0,0)',
  scaleX: 1,
  scaleY: 1,
  flipX: false,
  flipY: false,
  visible: true,
  object_id: objectId,
  object_type: 'normal',
  type2: 'type1',
  object_max: '1',
  object_value: '객체',
  object_status: 'object',
  object_src: '../../uploads/object/a.png',
  object_save_file_name: '{a.png}',
});

// 장면 data 문자열을 만든다. 형식은 `블록XML&DeviedVar&jsonData=JSON`이다.
const sceneData = (xml: string, objects: unknown[] | string = []) => {
  const json = typeof objects === 'string' ? objects : JSON.stringify({ version: '', objects });
  return `${xml}&DeviedVar&jsonData=${json}`;
};

const legacy = (overrides: Record<string, unknown> = {}) => ({
  sceneList: [{ scene: 's1', sceneName: '장면1', data: sceneData(BLOCK_XML) }],
  signalList: [],
  signalNameList: [],
  listList: [],
  listNameList: [],
  myApiList: [],
  varList: [],
  modelSeq: '1',
  modelTextSeq: '1',
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('migrateGenFile', () => {
  it('기본 필드를 변환한다', async () => {
    const result = await migrate(
      legacy({
        varList: [{ id: 'v1', name: '변수1', value: '10', type: 'number' }],
        signalList: ['sig1'],
        signalNameList: ['신호1'],
        listList: [{ listId: 'l1', list: ['a', 'b'] }],
        listNameList: ['리스트1'],
      }),
    );

    expect(result._version).toBe(2);
    expect(result._fourcc).toBe('aimk');
    expect(result.sharedVariables[0]).toEqual({
      varId: 'v1',
      varName: '변수1',
      defaultValue: '10',
    });
    expect(result.signals[0]).toEqual({ signalId: 'sig1', signalName: '신호1' });
    expect(result.userdefinedlists[0]).toEqual({
      listId: 'l1',
      listName: '리스트1',
      values: ['a', 'b'],
    });
  });

  it('장면이 없으면 빈 결과를 돌려준다', async () => {
    const result = await migrate(legacy({ sceneList: [] }));

    expect(result.scenes).toEqual([]);
    expect(result.sharedVariables).toEqual([]);
    expect(result.signals).toEqual([]);
    expect(result.userdefinedlists).toEqual([]);
  });

  it('장면 id와 이름을 유지한다', async () => {
    const result = await migrate(legacy());

    expect(result.scenes[0].sceneId).toBe('s1');
    expect(result.scenes[0].sceneName).toBe('장면1');
  });

  it('깨진 jsonData는 빈 객체 목록으로 처리한다', async () => {
    const result = await migrate(
      legacy({
        sceneList: [{ scene: 's1', sceneName: '장면1', data: sceneData(BLOCK_XML, '{깨진') }],
      }),
    );

    expect(result.scenes[0].objects).toEqual([]);
  });

  it('중복된 object_id는 하나만 남긴다', async () => {
    const result = await migrate(
      legacy({
        sceneList: [
          {
            scene: 's1',
            sceneName: '장면1',
            data: sceneData(BLOCK_XML, [legacyObject('o1'), legacyObject('o1')]),
          },
        ],
      }),
    );

    expect(result.scenes[0].objects).toHaveLength(1);
  });

  it('killdos_string_monitor 블록은 결과 XML에서 빠진다', async () => {
    const xml =
      '<xml><block type="text"></block><block type="killdos_string_monitor"></block></xml>';
    const result = await migrate(
      legacy({ sceneList: [{ scene: 's1', sceneName: '장면1', data: sceneData(xml) }] }),
    );

    expect(result.scenes[0].blockXml).not.toContain('killdos_string_monitor');
    expect(result.scenes[0].blockXml).toContain('type="text"');
  });

  it('블록 XML을 줄 단위로 정리해 그대로 다시 쓴다', async () => {
    const xml =
      '<xml xmlns="http://www.w3.org/1999/xhtml">\n' +
      '  <block type="text" id="a1" x="10"><field name="TEXT">a &amp; b &lt;c&gt;</field>' +
      '<next><block type="text" id="a2"></block></next></block>\n' +
      '  <block type="killdos_string_monitor" id="m"></block>\n' +
      '  <block type="text" id="a3"/>\n' +
      '</xml>';
    const result = await migrate(
      legacy({ sceneList: [{ scene: 's1', sceneName: '장면1', data: sceneData(xml) }] }),
    );

    expect(result.scenes[0].blockXml).toBe(
      [
        '<xml xmlns="http://www.w3.org/1999/xhtml">',
        '<block type="text" id="a1" x="10">',
        '<field name="TEXT">a &amp; b &lt;c&gt;</field>',
        '<next>',
        '<block type="text" id="a2"/>',
        '</next>',
        '</block>',
        '<block type="text" id="a3"/>',
        '</xml>',
      ].join('\n'),
    );
  });

  it('mecha_ 블록은 알 수 없는 블록 경고를 내지 않는다', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const xml = '<xml><block type="mecha_x"></block></xml>';
    await migrate(
      legacy({ sceneList: [{ scene: 's1', sceneName: '장면1', data: sceneData(xml) }] }),
    );

    expect(warn).not.toHaveBeenCalled();
  });
  describe('legacyResourceBaseUrl', () => {
    const sceneWith = (objects: unknown[], sounds: unknown[] = []) =>
      legacy({
        sceneList: [
          {
            scene: 's1',
            sceneName: '장면1',
            data:
              `${sceneData(BLOCK_XML, objects)}` + `&DeviedVar&soundData=${JSON.stringify(sounds)}`,
          },
        ],
      });

    it('상대 경로와 구 서버 URL을 기준 URL 아래 경로로 바꾼다', async () => {
      const kt = {
        ...legacyObject('o2'),
        object_src: 'https://old.example.com/block/images/object/type4/b.png',
        object_save_file_name: '{b.png}',
      };
      const old = {
        ...legacyObject('o3'),
        object_src: 'https://old.example.com/uploads/object/c.png',
        object_save_file_name: '{c.png}',
      };
      const result = await migrateGenFile(sceneWith([legacyObject('o1'), kt, old]), {
        ...OPTIONS,
        rewriteLegacyUrl: (url) =>
          url
            .replace(
              'https://old.example.com/block/images/',
              'https://res.example.com/legacy/images/',
            )
            .replace('https://old.example.com/uploads/', 'https://res.example.com/legacy/upload/'),
      });

      const urls = result.scenes[0].objects.map((it) => it.imageUrls[0]);
      expect(urls).toContain('https://res.example.com/legacy/upload/object/a.png');
      expect(urls).toContain('https://res.example.com/legacy/images/object/type4/b.png');
      expect(urls).toContain('https://res.example.com/legacy/upload/object/c.png');
    });

    it('data: URL은 rewriteLegacyUrl에 넘기지 않는다', async () => {
      const { object_src: _omit, ...rest } = legacyObject('o1');
      const dataObject = { ...rest, src: 'data:image/png;base64,AAAA' };
      const rewrite = vi.fn((url: string) => url);
      const result = await migrateGenFile(sceneWith([dataObject]), {
        ...OPTIONS,
        rewriteLegacyUrl: rewrite,
      });

      expect(result.scenes[0].objects[0].imageUrls[0]).toBe('data:image/png;base64,AAAA');
      expect(rewrite.mock.calls.some(([url]) => url.startsWith('data:'))).toBe(false);
    });

    it('소리 URL을 기준 URL 아래 경로로 만든다', async () => {
      const result = await migrate(sceneWith([], [{ id: 'snd1', value: '소리1', sec: '3초' }]));

      expect(result.scenes[0].sounds[0].soundUrl).toBe(
        'https://res.example.com/legacy/sound/snd1.mp3',
      );
    });

    it('기준 URL 끝의 슬래시는 무시한다', async () => {
      const result = await migrateGenFile(
        sceneWith([], [{ id: 'snd1', value: '소리1', sec: '3초' }]),
        {
          legacyResourceBaseUrl: 'https://res.example.com/legacy//',
        },
      );

      expect(result.scenes[0].sounds[0].soundUrl).toBe(
        'https://res.example.com/legacy/sound/snd1.mp3',
      );
    });

    it('기준 URL이 없거나 비어 있으면 오류를 던진다', async () => {
      await expect(
        migrateGenFile(legacy(), undefined as unknown as typeof OPTIONS),
      ).rejects.toThrow('legacyResourceBaseUrl is required');
      await expect(migrateGenFile(legacy(), { legacyResourceBaseUrl: ' ' })).rejects.toThrow(
        'legacyResourceBaseUrl is required',
      );
    });
  });

  // 아래 3건은 원본 gen-mig의 동작을 그대로 고정한다. 로직 변경은 이번 포팅 범위가 아니다.
  describe('알려진 제한 (원본 동작)', () => {
    const withScene = (data: string) =>
      legacy({ sceneList: [{ scene: 's1', sceneName: '장면1', data }] });

    it('블록이 없는 장면 XML은 오류를 던진다', async () => {
      await expect(migrate(withScene('<xml></xml>'))).rejects.toThrow();
    });

    it('objects가 없는 jsonData는 오류를 던진다', async () => {
      await expect(migrate(withScene(sceneData(BLOCK_XML, '{"version":"1"}')))).rejects.toThrow();
    });

    it('object_src와 src가 모두 없는 객체는 invalid url 오류를 던진다', async () => {
      const { object_src: _omit, ...noSrc } = legacyObject('o1');
      await expect(migrate(withScene(sceneData(BLOCK_XML, [noSrc])))).rejects.toThrow(
        'invalid url',
      );
    });
  });
});
