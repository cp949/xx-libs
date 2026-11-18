// const UNIT_YANG = 1e28; // 계산이 안됨
// const UNIT_JA = 1e24; // 계산이 안됨
const UNIT_HAE = 1e20;
const UNIT_KYUNG = 1e16;
const UNIT_JO = 1000000000000;
const UNIT_EOK = 100000000;
const UNIT_MAN = 10000;

const NUMBER_MAP: Record<string, string> = {
  영: '0',
  일: '1',
  이: '2',
  삼: '3',
  사: '4',
  오: '5',
  육: '6',
  칠: '7',
  팔: '8',
  구: '9',
};

const NUMBER_MAP2 = {
  하나: '1',
  둘: '2',
  셋: '3',
  넷: '4',
  다섯: '5',
  여섯: '6',
  일곱: '7',
  여덟: '8',
  아홉: '9',
  륙: '6',
};

function removeNonNumericWords(input: string) {
  let stringWithDots = input.replace(/점/g, '.');
  Object.entries(NUMBER_MAP2).forEach(([nm, value]) => {
    stringWithDots = stringWithDots.replace(new RegExp(nm, 'g'), value);
  });
  const numericWordsRegex = /[^\d십백천만억조경해일이삼사오육칠팔구영.]+/g;
  const cleanedString = stringWithDots.replace(numericWordsRegex, '');

  // Keep only the '.' at the very beginning of the sentence and remove the rest.
  const firstDotIndex = cleanedString.indexOf('.');
  if (firstDotIndex >= 0) {
    const leftPart = cleanedString.slice(0, firstDotIndex);
    const rightPart = cleanedString.slice(firstDotIndex + 1).replace(/\./g, '');
    return [leftPart, rightPart];
  } else {
    return [cleanedString, ''];
  }
}

function replaceKoreanNumbers(input: string) {
  return input
    .split('')
    .map((char) => NUMBER_MAP[char] || char)
    .join('');
}

function splitKoreanNumber(input: string) {
  const regex = /(?:(.*해)?(.*경)?(.*조)?(.*억)?(.*만)?(.*천)?(.*백)?(.*십)?(.*))?/;
  // /(?:(.*양)?(.*자)?(.*해)?(.*경)?(.*조)?(.*억)?(.*만)?(.*천)?(.*백)?(.*십)?(.*))?/;

  // Split the input string using regular expressions.
  const matches = input.match(regex)!.slice(1);

  // Return as an array after filtering out non-empty parts.
  return matches.filter((part) => part);
}

function convertKoreanNumber(input: string) {
  const units: Record<string, number> = { 천: 1000, 백: 100, 십: 10 };
  input = input.replace(/(?<!\d)(천|백|십)/g, '1$1');

  let result = 0;

  Object.keys(units).forEach((unit) => {
    const index = input.indexOf(unit);
    if (index !== -1) {
      let number = parseInt(input.substring(0, index), 10);
      result += number * units[unit];
      input = input.substring(index + 1);
    }
  });

  // If there are remaining numbers, add them to the result.
  if (input.length > 0) {
    result += parseInt(input, 10);
  }

  return result;
}

/**
 * Calculates the total sum of an array of Korean number strings.
 *
 * @param {string[]} list - An array of Korean number strings.
 * @returns {number} The total sum of the numbers in the array.
 */
function totalNumberAddition(list: string[]) {
  // console.log("totalNumberAddition=", list);
  let addition = 0;
  list.forEach((item) => {
    const lastChar = item[item.length - 1];
    // 자,양은 계산이 안됨
    switch (lastChar) {
      // case "양":
      //   addition +=
      //     item === "양"
      //       ? UNIT_YANG
      //       : convertKoreanNumber(item.slice(0, -1)) * UNIT_YANG;
      //   break;
      // case "자":
      //   addition +=
      //     item === "자"
      //       ? UNIT_JA
      //       : convertKoreanNumber(item.slice(0, -1)) * UNIT_JA;
      //   break;
      case '해':
        addition += item === '해' ? UNIT_HAE : convertKoreanNumber(item.slice(0, -1)) * UNIT_HAE;
        break;
      case '경':
        addition +=
          item === '경' ? UNIT_KYUNG : convertKoreanNumber(item.slice(0, -1)) * UNIT_KYUNG;
        break;
      case '조':
        addition += item === '조' ? UNIT_JO : convertKoreanNumber(item.slice(0, -1)) * UNIT_JO;
        break;
      case '억':
        addition += item === '억' ? UNIT_EOK : convertKoreanNumber(item.slice(0, -1)) * UNIT_EOK;
        break;
      case '만':
        addition += item === '만' ? UNIT_MAN : convertKoreanNumber(item.slice(0, -1)) * UNIT_MAN;
        break;
      default:
        addition += convertKoreanNumber(item);
    }
    // console.log("lastChar=", lastChar, 'addition=', addition);
  });
  return addition;
}

/**
 * Converts a Korean number string to its Arabic numeral equivalent.
 *
 * @param {any} input - The input to convert. If not a string, it will be converted to one.
 * @returns {number} The Arabic numeral equivalent of the input.
 */
export function koreanToNumber(input: string): number {
  if (typeof input !== 'string') {
    input = String(input);
  }
  input = input.trim();

  // check sign
  const sign = input.startsWith('-') || input.startsWith('마이너스') ? -1 : 1;
  input = input.replace(/\s*(플러스|마이너스|\+)\s*/, '');

  const [left, right] = removeNonNumericWords(input);
  if (left === '' && right === '') {
    return NaN;
  }
  try {
    const constants = totalNumberAddition(splitKoreanNumber(replaceKoreanNumbers(left)));

    const decimal = replaceKoreanNumbers(right);
    // 1e21 이상은 toString()이 지수 표기("1e+21")를 내서 소수부를 붙이면 NaN이 된다.
    // 이 크기에서는 소수부가 표현되지 않으므로 정수부만 쓴다.
    const result =
      constants >= 1e21 ? constants : Number(constants.toString() + '.' + decimal.toString());
    // -0이 아니라 0을 돌려준다.
    return sign < 0 && result !== 0 ? -result : result;
  } catch (ignore) {
    return NaN;
  }
}
