/// <reference types="node" />
declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL?: string;
    STORAGE_ENDPOINT?: string;
    STORAGE_BUCKET?: string;
    STORAGE_KEY?: string;
    STORAGE_SECRET?: string;
    PORT?: string;
  }
}

