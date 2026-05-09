import { API } from 'homebridge';
import { PropaneTankPlatform, PLUGIN_NAME, PLATFORM_NAME } from './platform';

export = (api: API): void => {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, PropaneTankPlatform);
};
