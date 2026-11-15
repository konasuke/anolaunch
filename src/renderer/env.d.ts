import type { Api } from '../shared/types';

// preload が公開する window.api の型
declare global {
  interface Window {
    api: Api;
  }
}

export {};
