export type ChannelMap = {
  // File operations
  'select-file': { req: any; res: any };
  'read-file': { req: string; res: any };
  'save-file': { req: [string, any]; res: any };
  'init-app-data': { req: void; res: any };
  'get-platform-info': { req: void; res: any };
  
  // Database operations - Projects
  'db:create-project': { req: any; res: any };
  'db:get-project': { req: number; res: any };
  'db:get-all-projects': { req: void; res: any };
  'db:update-project': { req: [number, any]; res: any };
  'db:delete-project': { req: number; res: any };
  
  // Database operations - Analysis Records
  'db:create-analysis-record': { req: any; res: any };
  'db:get-analysis-records': { req: [number | undefined, string | undefined]; res: any };
  'db:delete-analysis-record': { req: number; res: any };
  
  // Database operations - Settings
  'db:get-setting': { req: string; res: any };
  'db:set-setting': { req: [string, string]; res: any };
  'db:get-all-settings': { req: void; res: any };
  
  // Database operations - Maintenance
  'db:get-stats': { req: void; res: any };
  'db:backup': { req: string; res: any };
  'db:vacuum': { req: void; res: any };
};

export type Channel = keyof ChannelMap;

export interface IPlatformStrategy {
  invoke<C extends Channel>(
    channel: C,
    payload: ChannelMap[C]['req']
  ): Promise<ChannelMap[C]['res']>;
}