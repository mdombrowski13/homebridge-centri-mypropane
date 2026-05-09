import { Logger } from 'homebridge';
import { CentriResponse, PluginConfig } from './types';
export declare function fetchPropaneLevel(config: PluginConfig, log: Logger): Promise<CentriResponse>;
