// Types for the variables Vite exposes on import.meta.env (see .env)
interface ImportMetaEnv {
  readonly VITE_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
