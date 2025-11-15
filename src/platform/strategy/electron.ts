import { IPlatformStrategy } from '../types';

export const electronStrategy: IPlatformStrategy = {
  async invoke(channel, payload) {
    return window.electronAPI.invoke(channel, payload);
  },
};