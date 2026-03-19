/// <reference types="vite/client" />

import type { CleanerAPI } from "../shared/types";

declare global {
  interface Window {
    cleanerAPI: CleanerAPI;
  }
}

export {};
