export const WEB_UI_AUDIENCE = 'vector-web-ui';
export const VSCODE_AUDIENCE = 'vector-vscode';
export const FUMADOCS_WEB_AUDIENCE = 'fumadocs-web';
export const SUPABASE_SSH_WEB_AUDIENCE = 'supabase-ssh-web';
export const SUPABASE_SSH_SSH_AUDIENCE = 'supabase-ssh-ssh';

export const ALLOWED_BRIDGE_AUDIENCES = [
  WEB_UI_AUDIENCE,
  VSCODE_AUDIENCE,
  FUMADOCS_WEB_AUDIENCE,
  SUPABASE_SSH_WEB_AUDIENCE,
  SUPABASE_SSH_SSH_AUDIENCE,
] as const;
