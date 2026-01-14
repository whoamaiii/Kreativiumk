/**
 * Platform Detection Utilities
 *
 * Provides helper functions to detect whether the app is running
 * as a native mobile app (via Capacitor) or as a web PWA.
 */

import { Capacitor } from '@capacitor/core';

/**
 * Check if the app is running as a native app (Android/iOS via Capacitor)
 * @returns true if running in Capacitor native container
 */
export const isNative = (): boolean => {
    return Capacitor.isNativePlatform();
};

/**
 * Check if the app is running on Android
 * @returns true if running on Android (native)
 */
export const isAndroid = (): boolean => {
    return Capacitor.getPlatform() === 'android';
};

/**
 * Check if the app is running on iOS
 * @returns true if running on iOS (native)
 */
export const isIOS = (): boolean => {
    return Capacitor.getPlatform() === 'ios';
};

/**
 * Check if the app is running as a web app (PWA or browser)
 * @returns true if running in a web browser
 */
export const isWeb = (): boolean => {
    return Capacitor.getPlatform() === 'web';
};

/**
 * Get the current platform name
 * @returns 'android' | 'ios' | 'web'
 */
export const getPlatform = (): string => {
    return Capacitor.getPlatform();
};
