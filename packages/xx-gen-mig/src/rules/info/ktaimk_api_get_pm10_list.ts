import * as util from '../util';

export const ktaimk_api_get_pm10_list = (block: any) => {
  util.updateBlockType(block, 'forecast_pm10_by_dropdown');
  util.updateFieldName(block, 'sido', 'SIDO', true);
};
