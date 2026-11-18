import type { IMakerConfig } from './config-types';

export interface IMakerAddon {
  // addonId: string;
  // propertyName: string;
  onAddonInit?: (args?: any) => void;
  onAddonDestroy?: () => void;
}

export interface IMakerAddonConfig {
  addonId: string;
  propertyName?: string;
  addon: new (config: IMakerConfig) => IMakerAddon;
}
