import { MakerSound } from './model/common-types';
import { ignoreBlocks, rules } from './rules';
import { MigContext } from './rules/util';
import { buildXml, parseXml } from './xml';

const xmlTextToObject = (xml: string): any => {
  const obj = parseXml(xml);
  return obj['xml'];
};

// 블록의 `type` 속성을 읽는다. 블록이 문자열이거나 속성이 없으면 undefined다.
const getBlockType = (block: any): string | undefined => block?.$?.type;

const getChildren = (block: any) => {
  if (typeof block === 'string') return [];
  return Object.keys(block).filter((it) => it !== '$' && it !== '_' && it !== 'field');
};

const isIgnore = (block: any, tagName: string): boolean => {
  const type = getBlockType(block);
  if (!type) return true;
  if (tagName === 'block') {
    return ignoreBlocks.has(type) || `${type}`.startsWith('mecha_');
  }
  return false;
};

const parseBlock = (block: any, tagName: string, context: MigContext) => {
  // log.debug(`parseBlock(${tagName})`, block)
  if (tagName !== 'next') {
    const type = getBlockType(block) as string;
    const ruleFunc = (
      rules as Record<string, ((block: any, context: MigContext) => void) | undefined>
    )[type];
    if (ruleFunc) {
      ruleFunc(block, context);
    } else {
      if (!isIgnore(block, tagName)) console.warn(`cannot find ${tagName} type=${type}`);
    }
  }
  getChildren(block).forEach((childKey) => {
    const arr = block[childKey];
    // log.debug('childKey=' + childKey, block[childKey])
    if (Array.isArray(arr)) {
      arr.forEach((el) => parseBlock(el, childKey, context));
    } else {
      parseBlock(block[childKey], childKey, context);
    }
  });
};

export const migBlockXml = async (blockXml: string, sounds: MakerSound[]): Promise<string> => {
  const migContext: MigContext = {
    soundUrls: sounds.reduce(
      (acc, cur) => {
        acc[cur.resId] = cur.soundUrl;
        return acc;
      },
      {} as Record<string, string>,
    ),
  };

  const root = xmlTextToObject(blockXml);
  //    console.log('root', root)
  if (Array.isArray(root['block'])) {
    root['block'].forEach((el, i) => {
      const type = getBlockType(el);
      if (type === 'killdos_string_monitor') {
        delete root['block'][i];
      } else {
        // log.debug('root child=', el)
        parseBlock(el, 'block', migContext);
      }
    });
  } else {
    parseBlock(root['block'], 'block', migContext);
  }

  return buildXml(root);
};
