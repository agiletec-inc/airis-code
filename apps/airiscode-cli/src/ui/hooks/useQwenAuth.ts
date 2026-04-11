// Qwen OAuth removed - stub for compatibility
import { EventEmitter } from 'node:events';

export type DeviceAuthorizationData = {
  verification_uri_complete: string;
  user_code: string;
  expires_in: number;
};

export type QwenAuthState = 'idle' | 'authenticating' | 'authenticated' | 'error';

export const qwenOAuth2Events = new EventEmitter();
export const QwenOAuth2Event = {
  AuthUri: 'auth-uri',
  AuthProgress: 'auth-progress',
  AuthCancel: 'auth-cancel',
};

export function useQwenAuth(_config?: any) {
  return {
    isAuthenticating: false,
    deviceAuth: null as DeviceAuthorizationData | null,
    cancelAuth: () => {},
    qwenAuthState: 'idle' as QwenAuthState,
    cancelQwenAuth: () => {},
  };
}
