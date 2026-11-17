import * as util from '../util';

export const ktaimk_api_get_weather2 = (block: any) => {
  util.updateBlockType(block, 'forecast_weather_by_input');
  util.updateFieldName(block, 'weatherOption', 'KIND', true);
  util.updateValueName(block, 'value', 'CITY', true);
};
