# Pi Web-UI Auth Bridge

This project now exposes a same-domain auth bridge so `pi web-ui` can reuse Barbot account login without maintaining a second account system.

## Endpoints

- `GET /api/auth/session`
  - Returns `{ authenticated, user }` from Better Auth cookie session.
- `GET /api/extension/token?aud=vector-web-ui`
  - Returns a signed bearer token for web-ui usage.
- `GET /api/extension/user-info`
  - Requires `Authorization: Bearer <token>`.
  - Accepts token audience: `vector-web-ui` and `vector-vscode`.

## Client Helper

Use [`src/shared/lib/web-ui-auth-bridge.ts`](../../src/shared/lib/web-ui-auth-bridge.ts):

- `getWebUiSession()`
- `getWebUiAccessToken()`
- `getWebUiUserInfo(token)`
- `redirectToWebUiSignIn(callbackPath?)`
- `signOutFromWebUi(callbackPath?)`

## Notes

- Existing VS Code extension flow remains compatible.
- Extension auth UI now explicitly requests `aud=vector-vscode`.
