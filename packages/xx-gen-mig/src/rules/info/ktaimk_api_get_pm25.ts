import * as util from '../util';

export const ktaimk_api_get_pm25 = (block: any) => {
  util.updateBlockType(block, 'forecast_pm25_by_input');
  util.updateValueName(block, 'sido', 'CITY', true);
};
