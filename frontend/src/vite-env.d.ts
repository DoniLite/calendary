/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CALENDARY_WORKSPACE_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
