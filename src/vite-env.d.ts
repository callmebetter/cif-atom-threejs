/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'utif' {
  export function decode(buffer: ArrayBuffer[]): any[]
  export function decodeImage(buffer: ArrayBuffer): void
  export function encode(ifs: any[]): ArrayBuffer
  export function toRGBA(ifs: any[]): Uint8Array
  export function toRGBA8(ifs: any[]): Uint8Array
  export const MIME: { [key: string]: string }
}