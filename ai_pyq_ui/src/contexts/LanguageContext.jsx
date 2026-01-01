// src/contexts/LanguageContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { getUserData, authenticatedFetch } from "../utils/auth";

const LanguageContext = createContext();

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
};

export const LanguageProvider = ({ children }) => {
    const [language, setLanguageState] = useState("en"); // "en" or "hi"
    const [loading, setLoading] = useState(true);

    // Initialize language from user data or localStorage
    useEffect(() => {
        const initializeLanguage = async () => {
            try {
                // First check user data in localStorage
                const userData = getUserData();
                if (userData?.preferred_language) {
                    const lang = userData.preferred_language.toLowerCase();
                    if (lang === "hi" || lang === "hindi") {
                        setLanguageState("hi");
                    } else {
                        setLanguageState("en");
                    }
                    setLoading(false);
                    return;
                }

                // If no user data, check localStorage
                const storedLanguage = localStorage.getItem("language");
                if (storedLanguage && (storedLanguage === "hi" || storedLanguage === "hindi")) {
                    setLanguageState("hi");
                } else {
                    setLanguageState("en");
                }
                setLoading(false);
            } catch (error) {
                console.error("Error initializing language:", error);
                setLanguageState("en");
                setLoading(false);
            }
        };

        initializeLanguage();
    }, []);

    // Update language and save to user account
    const setLanguage = async (newLanguage) => {
        // Validate language
        const lang = newLanguage.toLowerCase();
        const validLang = (lang === "hi" || lang === "hindi") ? "hi" : "en";
        
        setLanguageState(validLang);
        localStorage.setItem("language", validLang);

        // Update user account if logged in
        try {
            const userData = getUserData();
            if (userData) {
                const response = await authenticatedFetch("/auth/profile/update", {
                    method: "PUT",
                    body: JSON.stringify({ preferred_language: validLang }),
                });

                if (response.ok) {
                    const updatedUser = await response.json();
                    // Update localStorage with new user data
                    const updatedUserData = { ...userData, preferred_language: validLang };
                    localStorage.setItem("userData", JSON.stringify(updatedUserData));
                    console.log("Language preference saved to account");
                } else {
                    console.warn("Failed to save language preference to account");
                }
            }
        } catch (error) {
            console.error("Error saving language preference:", error);
        }
    };

    // Listen for user login/logout events to sync language
    useEffect(() => {
        const handleUserChange = () => {
            const userData = getUserData();
            if (userData?.preferred_language) {
                const lang = userData.preferred_language.toLowerCase();
                const validLang = (lang === "hi" || lang === "hindi") ? "hi" : "en";
                setLanguageState(validLang);
                localStorage.setItem("language", validLang);
            }
        };

        window.addEventListener("userLoggedIn", handleUserChange);
        window.addEventListener("userLoggedOut", handleUserChange);

        return () => {
            window.removeEventListener("userLoggedIn", handleUserChange);
            window.removeEventListener("userLoggedOut", handleUserChange);
        };
    }, []);

    const value = {
        language,
        setLanguage,
        loading,
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

