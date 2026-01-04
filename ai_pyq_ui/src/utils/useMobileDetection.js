// src/utils/useMobileDetection.js
import { useState, useEffect } from "react";

/**
 * Custom hook to detect if the current viewport is mobile
 * Uses 768px as the breakpoint (Tailwind's 'md' breakpoint)
 * @returns {boolean} isMobile - true if viewport width < 768px
 */
export const useMobileDetection = () => {
    const [isMobile, setIsMobile] = useState(() => {
        // Check if window is available (SSR safety)
        if (typeof window === "undefined") return false;
        return window.innerWidth < 768;
    });

    useEffect(() => {
        // Handler to update state on window resize
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        // Add event listener
        window.addEventListener("resize", handleResize);

        // Also check on mount in case of hydration mismatch
        handleResize();

        // Cleanup
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return isMobile;
};

