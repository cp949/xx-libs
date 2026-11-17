import * as util from '../util';

export const ktaimk_api_get_pm25_list = (block: any) => {
  util.updateBlockType(block, 'forecast_pm25_by_dropdown');
  util.updateFieldName(block, 'sido', 'SIDO', true);
};
