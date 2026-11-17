import * as util from '../util';

const CITIES = {
  '60,127': 'SEOUL',
  '98,76': 'BUSAN',
  '89,90': 'DAEGU',
  '55,124': 'INCHEON',
  '58,74': 'KWANGJU',
  '67,100': 'DAEJEON',
  '102,84': 'ULSAN',
  '60,120': 'GYEONGGI',
  '73,134': 'GANGWON',
  '69,107': 'CHUNGBUK',
  '68,100': 'CHUNGNAM',
  '63,89': 'JEOLLABUK',
  '51,67': 'JEOLLANAM',
  '89,91': 'GYEONGBUK',
  '91,77': 'GYEONGNAM',
  '52,38': 'JEJU',
  '66,103': 'SEJONG',
};

export const ktaimk_api_get_weather = (block: any) => {
  util.updateBlockType(block, 'forecast_weather_by_dropdown');
  util.updateFieldName(block, 'weatherOption', 'KIND', true);
  const field = util.updateFieldName(block, 'weatherArea', 'CITY', true);
  if (field) {
    const val = field['_'];
    const city = (CITIES as Record<string, string | undefined>)[val] ?? 'SEOUL';
    field['_'] = city;
  }
};
