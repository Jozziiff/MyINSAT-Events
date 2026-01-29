/**
 * Utility functions for handling image URLs
 */

import { environment } from '../../environments/environment';

const API_URL = environment.apiUrl;

/**
 * Resolves a potentially relative image URL to an absolute URL
 * @param url - The image URL (can be relative or absolute)
 * @returns The absolute URL or undefined if no URL provided
 */
export function resolveImageUrl(url?: string): string | undefined {
    if (!url) return undefined;

    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    return `${API_URL}${url}`;
}

/**
 * Gets the API base URL
 * @returns The API base URL
 */
export function getApiUrl(): string {
    return API_URL;
}
