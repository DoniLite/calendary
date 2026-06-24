/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CALENDARY_WORKSPACE_ID?: string
  readonly VITE_CALENDARY_PUBLIC_SLUG?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
