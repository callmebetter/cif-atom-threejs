import { IPlatformStrategy } from '../types';
import { electronStrategy } from './electron';
import { webStrategy } from './web';

export const getStrategy = (): IPlatformStrategy => {
  return (window as any).electronAPI ? electronStrategy : webStrategy;
};