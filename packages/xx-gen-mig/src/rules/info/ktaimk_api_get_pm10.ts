import * as util from '../util';

export const ktaimk_api_get_pm10 = (block: any) => {
  util.updateBlockType(block, 'forecast_pm10_by_input');
  util.updateValueName(block, 'sido', 'CITY', true);
};
