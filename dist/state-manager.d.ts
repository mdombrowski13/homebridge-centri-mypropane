import { CentriResponse, PluginConfig, PropaneState } from './types';
export declare class StateManager {
    private state;
    hasChanged(response: CentriResponse): boolean;
    update(response: CentriResponse, config: PluginConfig): PropaneState;
    getCurrent(): PropaneState | null;
}
