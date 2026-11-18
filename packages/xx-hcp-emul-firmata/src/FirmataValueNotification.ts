import { IHcpHwNotification } from '@cp949/xx-hcp-interface';

export interface FirmataValueNotification extends IHcpHwNotification {
  type: 'firmata-value';
}
