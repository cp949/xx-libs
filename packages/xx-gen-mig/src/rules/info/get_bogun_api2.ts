import * as util from '../util';
const CITIES = {
  '1100000000': '서울',
  '2600000000': '부산',
  '2700000000': '대구',
  '2800000000': '인천',
  '2900000000': '광주',
  '3000000000': '대전',
  '3100000000': '울산',
  '4100000000': '경기',
  '4200000000': '강원',
  '4300000000': '충북',
  '4400000000': '충남',
  '4500000000': '전북',
  '4600000000': '전남',
  '4700000000': '경북',
  '4800000000': '경남',
  '5000000000': '제주',
  '3600000000': '세종',
};

export const get_bogun_api2 = (block: any) => {
  util.updateBlockType(block, 'bogun_by_dropdown');
  util.updateFieldName(block, 'option', 'DAY', true);
  util.updateFieldName(block, 'option2', 'API_TYPE', true);
  const field = util.updateFieldName(block, 'option3', 'CITY', true);
  if (field) {
    const val = field['_'];
    field['_'] = (CITIES as Record<string, string | undefined>)[val] ?? '서울';
  }
};
