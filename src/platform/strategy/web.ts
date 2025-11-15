import { IPlatformStrategy } from '../types';

export const webStrategy: IPlatformStrategy = {
  async invoke(channel, payload) {
    const response = await fetch(`/api/${channel}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error(await response.text());
    }
    
    return response.json();
  },
};