/**
 * Centralised configuration for the frontend application.
 * All environment-dependent values live here — no hardcoded URLs in components.
 */
export const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000';
export const API_KEY = import.meta.env?.VITE_API_KEY || '';
export const APP_NAME = "Enterprise Knowledge Auditor";
export const APP_VERSION = "2.1.0";
