export type ChannelMap = {
  // File operations
  'select-file': { req: unknown; res: unknown };
  'read-file': { req: string; res: unknown };
  'save-file': { req: [string, unknown]; res: unknown };
  'init-app-data': { req: void; res: unknown };
  'get-platform-info': { req: void; res: unknown };
  
  // Database operations - Projects
  'db:create-project': { req: unknown; res: unknown };
  'db:get-project': { req: number; res: unknown };
  'db:get-all-projects': { req: void; res: unknown };
  'db:update-project': { req: [number, unknown]; res: unknown };
  'db:delete-project': { req: number; res: unknown };
  
  // Database operations - Analysis Records
  'db:create-analysis-record': { req: unknown; res: unknown };
  'db:get-analysis-records': { req: [number | undefined, string | undefined]; res: unknown };
  'db:delete-analysis-record': { req: number; res: unknown };
  
  // Database operations - Settings
  'db:get-setting': { req: string; res: unknown };
  'db:set-setting': { req: [string, string]; res: unknown };
  'db:get-all-settings': { req: void; res: unknown };
  
  // Database operations - Maintenance
  'db:get-stats': { req: void; res: unknown };
  'db:backup': { req: string; res: unknown };
  'db:vacuum': { req: void; res: unknown };
};

export type Channel = keyof ChannelMap;

export interface IPlatformStrategy {
  invoke<C extends Channel>(
    channel: C,
    payload: ChannelMap[C]['req']
  ): Promise<ChannelMap[C]['res']>;
}