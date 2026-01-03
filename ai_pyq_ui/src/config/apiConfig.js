// src/config/apiConfig.js
/**
 * Centralized API Configuration
 * 
 * This file manages the API base URL for both web and mobile (Capacitor) environments.
 * 
 * For local testing on mobile:
 * 1. Find your computer's local network IP (e.g., 192.168.1.100)
 *    - Windows: ipconfig (look for IPv4 Address)
 *    - Mac/Linux: ifconfig or ip addr
 * 2. Update LOCAL_NETWORK_IP below with your IP
 * 3. Ensure your phone and computer are on the same WiFi network
 * 4. Make sure your backend server allows connections from your network
 * 
 * For production:
 * - Set PRODUCTION_API_URL to your deployed backend URL
 */

// Configuration
// For WiFi network access, use your laptop's network IP (e.g., 192.168.29.238)
// For USB tethering, use 'localhost' or '127.0.0.1'
const LOCAL_NETWORK_IP = '192.168.29.238'; // UPDATE THIS: Use 'localhost' for USB tethering, or network IP for WiFi
const LOCAL_PORT = '8000';
const PRODUCTION_API_URL = ''; // Set this when deploying to production

// Detect if running in Capacitor (mobile app)
const isCapacitor = () => {
  return typeof window !== 'undefined' && 
         window.Capacitor !== undefined;
};

// Detect if running in development mode
const isDevelopment = () => {
  return import.meta.env.DEV || import.meta.env.MODE === 'development';
};

// Get API base URL based on environment
export const getApiBaseUrl = () => {
  // Production mode - use production URL if set
  if (!isDevelopment() && PRODUCTION_API_URL) {
    return PRODUCTION_API_URL;
  }

  // Mobile app (Capacitor) - use network IP
  if (isCapacitor()) {
    return `http://${LOCAL_NETWORK_IP}:${LOCAL_PORT}`;
  }

  // Web development - use empty string for Vite proxy
  // This allows Vite's proxy to handle the requests
  return '';
};

// Export the base URL
export const API_BASE_URL = getApiBaseUrl();

// Helper function to build full API URL
export const buildApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  if (API_BASE_URL) {
    return `${API_BASE_URL}/${cleanEndpoint}`;
  }
  
  // If base URL is empty (web dev with proxy), return relative URL
  return `/${cleanEndpoint}`;
};

// Export function to update network IP (useful for dynamic IP changes)
export const updateNetworkIP = (newIP) => {
  // This is a helper - in practice, you'd need to reload the app
  // For now, users should update LOCAL_NETWORK_IP in this file
  console.warn('To update network IP, please modify LOCAL_NETWORK_IP in apiConfig.js and rebuild the app');
};

// Log current configuration (for debugging)
if (isDevelopment()) {
  console.log('API Configuration:', {
    isCapacitor: isCapacitor(),
    isDevelopment: isDevelopment(),
    apiBaseUrl: API_BASE_URL,
    environment: isCapacitor() ? 'Mobile (Capacitor)' : 'Web'
  });
}


