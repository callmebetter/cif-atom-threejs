User: 把刚刚的核心内容整理成文档，一套渲染代码同时适配desktop和web这才是重点
Kimi: # 一份代码跑 Desktop & Web  
## ── 安全、零侵入、可演进的通用渲染层方案

> 目标：同一套 React（或 Vue/Svelte...）渲染层代码，  
> 不经任何 `if (platform)` 判断，即可在 **Electron 桌面端** 与 **纯 Web 端** 同时运行；  
> 后续若新增 Tauri、Capacitor 等平台，仍保持**开闭原则**。

---

## 1. 总体架构（一眼看懂）

```
┌-------------------------┐
│  业务组件 / Hooks / Store │  ←─ 完全无平台代码
└----------┬--------------┘
           │ 调用
┌----------┴--------------┐
│   safeInvoke('channel',payload) │  ←─ 唯一入口（代理）
└----------┬--------------┘
           │ 运行期自动路由
┌----------┴-----------------------┐
│ 策略选择器 │ window.electronAPI ? ElectronStrategy : WebStrategy
└----------┬--------------┴----------------┐
           │                            │
┌----------┴---------┐         ┌---------┴--------┐
│ ElectronStrategy    │         │ WebStrategy       │
│ ipcRenderer.invoke  │         │ fetch(/api/...)   │
└---------------------┘         └--------------------┘
```

---

## 2. 目录模板（直接复制即可用）

```
src/
├─ platform/
│  ├─ types.ts         # 通道类型总表
│  ├─ sdk.ts           # 对外唯一 safeInvoke
│  └─ strategy/
│     ├─ index.ts      # 策略选择器
│     ├─ electron.ts   # Electron 实现
│     └─ web.ts        # Web 实现
├─ app/                # 页面、组件、Store
├─ preload.ts          # Electron preload（暴露 safeInvoke）
└─ index.tsx           # 通用渲染入口
```

---

## 3. 核心代码（TypeScript）

### 3.1 类型总表 ── 新增通道只改这里

```ts
// platform/types.ts
export type ChannelMap = {
  'app/getVersion': { req: void; res: string };
  'shell/openExternal': { req: string; res: void };
  'config/get': { req: string; res: any };
  // ↓ 以后加一行即可
};

export type Channel = keyof ChannelMap;

export interface IPlatformStrategy {
  invoke<C extends Channel>(
    channel: C,
    payload: ChannelMap[C]['req']
  ): Promise<ChannelMap[C]['res']>;
}
```

### 3.2 策略实现

```ts
// platform/strategy/electron.ts
import { IPlatformStrategy } from '../types';
export const electronStrategy: IPlatformStrategy = {
  async invoke(channel, payload) {
    return window.electronAPI.safeInvoke(channel, payload);
  },
};

// platform/strategy/web.ts
import { IPlatformStrategy } from '../types';
export const webStrategy: IPlatformStrategy = {
  async invoke(channel, payload) {
    const r = await fetch(`/api/${channel}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
};
```

### 3.3 策略选择器 & 代理入口

```ts
// platform/strategy/index.ts
import { IPlatformStrategy } from '../types';
import { electronStrategy } from './electron';
import { webStrategy } from './web';
export const getStrategy = (): IPlatformStrategy =>
  (window as any).electronAPI ? electronStrategy : webStrategy;

// platform/sdk.ts ── 业务唯一调用点
import { getStrategy } from './strategy';
import { Channel, ChannelMap } from './types';
export const safeInvoke = async <C extends Channel>(
  channel: C,
  payload: ChannelMap[C]['req']
): Promise<ChannelMap[C]['res']> => getStrategy().invoke(channel, payload);
```

---

## 4. 业务层零平台代码

```tsx
import { safeInvoke } from '@/platform/sdk';

export const Footer = () => {
  const [v, setV] = useState('');
  useEffect(() => {
    safeInvoke('app/getVersion', void 0).then(setV);
  }, []);
  return <div>App version: {v}</div>;
};
```

---

## 5. Electron 侧（主进程 + preload）

```ts
// preload.ts
import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('electronAPI', {
  safeInvoke: (ch: string, args: any) => ipcRenderer.invoke(ch, args),
});

// main.ts
import { ipcMain, shell, app } from 'electron';
const handlerMap = {
  'app/getVersion': () => app.getVersion(),
  'shell/openExternal': (url: string) => shell.openExternal(url),
};
Object.entries(handlerMap).forEach(([ch, fn]) => ipcMain.handle(ch, fn));
```

> 安全 checklist  
> ✔ `contextIsolation: true`  
> ✔ `nodeIntegration: false`  
> ✔ 白名单通道与 `ChannelMap` 自动对齐

---

## 6. Web 侧（Dev / Prod 均可）

- 开发：vite / cra 直接起本地服务  
- 生产：任意后端把 `/api/:channel` 路由到对应 handler 即可（Node、Go、Java...）

---

## 7. 构建 & 运行命令

```json
"scripts": {
  "dev": "vite",                 // Web 开发
  "build": "tsc && vite build",  // Web 产物
  "electron": "electron .",      // Electron 生产
  "electron:dev": "concurrently \"npm run dev\" \"wait-on tcp:5173 && electron .\""
}
```

- Electron 打包后加载 `dist/index.html`  
- Web 直接部署 `dist` 目录

---

## 8. 后续演进（再插新平台）

1. 新增 `platform/strategy/tauri.ts` 实现 `IPlatformStrategy`  
2. 在 `getStrategy()` 加一条分支  
3. 完成——**业务代码 0 改动**

---

## 9. 模式总结

| 模式 | 职责 | 本方案落地 |
|---|---|---|
| **策略模式** | 整链路算法可互换 | ElectronStrategy / WebStrategy |
| **代理模式** | 对业务隐藏真正的底层 | `safeInvoke` 唯一入口 |
| **适配器模式**（仅 Electron） | 把 `ipcRenderer` 转成统一形状 | `preload.ts` 已一次性完成 |

---

## 10. 一句话记住

> 把「平台差异」全部压到 **策略层**；  
> 业务层只认 **safeInvoke**；  
> 新增平台 **只加策略类**，渲染代码 **永远不改**。  

—— 这就是「一套渲染代码同时适配 Desktop & Web」的核心。
