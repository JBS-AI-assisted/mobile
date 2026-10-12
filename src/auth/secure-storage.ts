import * as SecureStore from 'expo-secure-store';

import type { SecureStorage } from './token-store';

/** Tokens live only here (Keychain / Keystore). Never AsyncStorage, never logs. */
export const secureStorage: SecureStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  deleteItem: (key) => SecureStore.deleteItemAsync(key),
};
