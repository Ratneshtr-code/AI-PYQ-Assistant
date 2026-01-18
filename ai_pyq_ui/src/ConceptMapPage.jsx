// src/ConceptMapPage.jsx
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { buildApiUrl } from "./config/apiConfig";
import SubjectSelector from "./components/conceptmap/SubjectSelector";
import TopicList from "./components/conceptmap/TopicList";
import ContentRenderer from "./components/conceptmap/ContentRenderer";
import LearningPath from "./components/conceptmap/LearningPath";
import TopicNavBar from "./components/conceptmap/TopicNavBar";
import UserMenuDropdown from "./components/UserMenuDropdown";
import FeedbackModal from "./components/FeedbackModal";
import { useMobileDetection } from "./utils/useMobileDetection";

export default function ConceptMapPage() {
    const isMobile = useMobileDetection();
    const navigate = useNavigate();
    const location = useLocation();
    const { subjectId, topicId } = useParams();
    const [subjects, setSubjects] = useState([]);
    const [topics, setTopics] = useState([]);
    const [organizedTopics, setOrganizedTopics] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [loadingSubjects, setLoadingSubjects] = useState(true);
    const [loadingTopics, setLoadingTopics] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [roadmapExists, setRoadmapExists] = useState(true);
    const [checkingRoadmap, setCheckingRoadmap] = useState(false);
    const [roadmap, setRoadmap] = useState(null);
    
    // User panel state
    const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem("isLoggedIn") === "true");
    const [userName, setUserName] = useState(
        (() => {
            try {
                const data = localStorage.getItem("userData");
                const userData = data ? JSON.parse(data) : null;
                return userData?.full_name || userData?.username || localStorage.getItem("userName") || "User";
            } catch {
                return localStorage.getItem("userName") || "User";
            }
        })()
    );
    const [userInitials, setUserInitials] = useState(() => {
        const name = (() => {
            try {
                const data = localStorage.getItem("userData");
                const userData = data ? JSON.parse(data) : null;
                return userData?.full_name || userData?.username || localStorage.getItem("userName") || "User";
            } catch {
                return localStorage.getItem("userName") || "User";
            }
        })();
        const names = name.split(" ");
        return names.length > 1 
            ? (names[0][0] + names[1][0]).toUpperCase()
            : name.substring(0, 2).toUpperCase();
    });
    const [subscriptionPlan, setSubscriptionPlan] = useState(
        (() => {
            try {
                const data = localStorage.getItem("userData");
                const userData = data ? JSON.parse(data) : null;
                return userData?.subscription_plan === "premium" ? "Premium" : "Free";
            } catch {
                return "Free";
            }
        })()
    );
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const userMenuButtonRef = useRef(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [activeTab, setActiveTab] = useState("content");

    // Check if we're on a learning-path route
    const isLearningPathRoute = location.pathname.includes('/learning-path');
    const currentSubjectId = subjectId || selectedSubject;

    // Load topic from URL when topicId is present
    useEffect(() => {
        if (topicId && selectedSubject && topics.length > 0) {
            const topic = topics.find(t => t.id === topicId);
            if (topic) {
                // Fetch full topic details
                const fetchTopicDetails = async () => {
                    try {
                        const url = buildApiUrl(`conceptmap/topic/${topic.id}?subject=${selectedSubject}`);
                        const res = await fetch(url, {
                            credentials: "include",
                            headers: {
                                "Content-Type": "application/json",
                                "Accept": "application/json",
                            },
                        });

                        if (res.ok) {
                            const fullTopic = await res.json();
                            setSelectedTopic(fullTopic);
                        } else {
                            setSelectedTopic(topic); // Fallback to basic topic info
                        }
                    } catch (err) {
                        console.error("Error fetching topic details:", err);
                        setSelectedTopic(topic); // Fallback to basic topic info
                    }
                };
                fetchTopicDetails();
            }
        } else if (!topicId) {
            // No topicId in URL - clear selected topic
            setSelectedTopic(null);
        }
    }, [topicId, selectedSubject, topics]);

    // Update activeTab based on route
    useEffect(() => {
        if (isLearningPathRoute) {
            setActiveTab("learning-path");
        } else if (topicId && selectedTopic) {
            // Topic is selected from URL - show content
            setActiveTab("content");
        } else if (!topicId && !isLearningPathRoute && selectedSubject) {
            // Coming from subject page - show learning path
            setActiveTab("learning-path");
        }
    }, [isLearningPathRoute, topicId, selectedTopic, selectedSubject]);

    // Check if roadmap exists for the subject
    useEffect(() => {
        if (isLearningPathRoute && currentSubjectId) {
            setCheckingRoadmap(true);
            const checkRoadmap = async () => {
                try {
                    const url = buildApiUrl(`conceptmap/roadmap/${currentSubjectId}`);
                    const res = await fetch(url, {
                        credentials: "include",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json",
                        },
                    });
                    setRoadmapExists(res.ok);
                } catch (err) {
                    console.error("Error checking roadmap:", err);
                    setRoadmapExists(false);
                } finally {
                    setCheckingRoadmap(false);
                }
            };
            checkRoadmap();
        }
    }, [isLearningPathRoute, currentSubjectId]);

    // Fetch subjects on mount
    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const url = buildApiUrl("conceptmap/subjects");
                const res = await fetch(url, {
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                });

                if (!res.ok) {
                    console.error("Failed to fetch subjects");
                    return;
                }

                const data = await res.json();
                setSubjects(data.subjects || []);
            } catch (err) {
                console.error("Error fetching subjects:", err);
            } finally {
                setLoadingSubjects(false);
            }
        };

        fetchSubjects();
    }, []);

    // Auto-select subject from URL or default to Geography
    useEffect(() => {
        if (subjects.length > 0 && !selectedSubject) {
            if (subjectId) {
                // Use subject from URL
                const subject = subjects.find(sub => sub.id === subjectId);
                if (subject) {
                    setSelectedSubject(subject.id);
                    // If coming from subject page (no topicId, no learning-path), redirect to learning-path
                    if (!topicId && !isLearningPathRoute) {
                        navigate(`/conceptmap/subjects/${subjectId}/learning-path`, { replace: true });
                    }
                }
            } else {
                // Default to Geography
                const geographySubject = subjects.find(
                    sub => sub.id?.toLowerCase() === 'geography' || sub.name?.toLowerCase() === 'geography'
                );
                if (geographySubject) {
                    setSelectedSubject(geographySubject.id);
                }
            }
        }
    }, [subjects, selectedSubject, subjectId, topicId, isLearningPathRoute, navigate]);

    // Fetch roadmap and topics when subject is selected
    useEffect(() => {
        if (!selectedSubject) {
            setTopics([]);
            setOrganizedTopics([]);
            setSelectedTopic(null);
            setRoadmap(null);
            return;
        }

        const fetchRoadmapAndTopics = async () => {
            setLoadingTopics(true);
            try {
                // Fetch topics
                const topicsUrl = buildApiUrl(`conceptmap/topics/${selectedSubject}`);
                const topicsRes = await fetch(topicsUrl, {
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                });

                if (!topicsRes.ok) {
                    console.error("Failed to fetch topics");
                    setTopics([]);
                    setOrganizedTopics([]);
                    return;
                }

                const topicsData = await topicsRes.json();
                const allTopics = topicsData.topics || [];
                setTopics(allTopics);

                // Try to fetch roadmap to organize topics
                try {
                    const roadmapUrl = buildApiUrl(`conceptmap/roadmap/${selectedSubject}`);
                    const roadmapRes = await fetch(roadmapUrl, {
                        credentials: "include",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json",
                        },
                    });

                    if (roadmapRes.ok) {
                        const roadmapData = await roadmapRes.json();
                        setRoadmap(roadmapData);

                        // Organize topics by roadmap chapters
                        if (roadmapData.topics && roadmapData.topics.length > 0) {
                            const organized = [];
                            
                            roadmapData.topics.forEach((chapter) => {
                                // Find topics that belong to this chapter
                                const chapterTopics = [];
                                
                                chapter.subTopics.forEach((subTopic) => {
                                    const topic = allTopics.find(t => t.id === subTopic.id);
                                    if (topic) {
                                        chapterTopics.push(topic);
                                    }
                                });

                                if (chapterTopics.length > 0) {
                                    organized.push({
                                        chapterTitle: chapter.mainTopic,
                                        chapterId: chapter.id,
                                        topics: chapterTopics
                                    });
                                }
                            });

                            // Add any remaining topics that weren't in the roadmap
                            const roadmapTopicIds = new Set(
                                roadmapData.topics.flatMap(ch => ch.subTopics.map(st => st.id))
                            );
                            const remainingTopics = allTopics.filter(t => !roadmapTopicIds.has(t.id));
                            
                            if (remainingTopics.length > 0) {
                                organized.push({
                                    chapterTitle: "Other Topics",
                                    chapterId: "other",
                                    topics: remainingTopics
                                });
                            }

                            setOrganizedTopics(organized);
                        } else {
                            // No roadmap structure, use flat list
                            setOrganizedTopics([{
                                chapterTitle: "All Topics",
                                chapterId: "all",
                                topics: allTopics
                            }]);
                        }
                    } else {
                        // No roadmap available, use flat list
                        setOrganizedTopics([{
                            chapterTitle: "All Topics",
                            chapterId: "all",
                            topics: allTopics
                        }]);
                    }
                } catch (roadmapErr) {
                    console.error("Error fetching roadmap:", roadmapErr);
                    // Use flat list if roadmap fetch fails
                    setOrganizedTopics([{
                        chapterTitle: "All Topics",
                        chapterId: "all",
                        topics: allTopics
                    }]);
                }
            } catch (err) {
                console.error("Error fetching topics:", err);
                setTopics([]);
                setOrganizedTopics([]);
            } finally {
                setLoadingTopics(false);
            }
        };

        fetchRoadmapAndTopics();
    }, [selectedSubject]);

    // User state management
    useEffect(() => {
        const updateUserState = async () => {
            if (isLoggingOut) return;
            
            let isLoggedInLocal = localStorage.getItem("isLoggedIn") === "true";
            
            if (!isLoggedInLocal && !isLoggingOut) {
                try {
                    const response = await fetch("/auth/me", {
                        method: "GET",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                    });
                    
                    if (response.ok) {
                        const userData = await response.json();
                        localStorage.setItem("userData", JSON.stringify(userData));
                        localStorage.setItem("isLoggedIn", "true");
                        localStorage.setItem("userName", userData.full_name || userData.username || "User");
                        isLoggedInLocal = true;
                        window.dispatchEvent(new Event("userLoggedIn"));
                    }
                } catch (error) {
                    console.error("Error checking session:", error);
                }
            }
            
            setIsLoggedIn(isLoggedInLocal);
            
            if (!isLoggedInLocal) {
                setSubscriptionPlan("Free");
                setUserName("User");
                setUserInitials("U");
                return;
            }
            
            const userDataStr = localStorage.getItem("userData");
            if (userDataStr) {
                try {
                    const cachedUserData = JSON.parse(userDataStr);
                    setSubscriptionPlan(cachedUserData.subscription_plan === "premium" ? "Premium" : "Free");
                    const savedName = cachedUserData.full_name || cachedUserData.username || "User";
                    setUserName(savedName);
                    const names = savedName.split(" ");
                    const initials = names.length > 1 
                        ? (names[0][0] + names[1][0]).toUpperCase()
                        : savedName.substring(0, 2).toUpperCase();
                    setUserInitials(initials);
                } catch (parseErr) {
                    console.error("Error parsing cached user data:", parseErr);
                }
            }
        };

        updateUserState();

        const handleStorageChange = (e) => {
            if (e.key === "isLoggedIn" || e.key === "hasPremium" || e.key === "userName" || e.key === "userData") {
                updateUserState();
            }
        };

        const handleCustomEvent = () => {
            if (!isLoggingOut) {
                updateUserState();
            }
        };

        window.addEventListener("storage", handleStorageChange);
        window.addEventListener("premiumStatusChanged", handleCustomEvent);
        window.addEventListener("userLoggedIn", handleCustomEvent);
        window.addEventListener("userLoggedOut", handleCustomEvent);
        window.addEventListener("userProfileUpdated", handleCustomEvent);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("premiumStatusChanged", handleCustomEvent);
            window.removeEventListener("userLoggedIn", handleCustomEvent);
            window.removeEventListener("userLoggedOut", handleCustomEvent);
            window.removeEventListener("userProfileUpdated", handleCustomEvent);
        };
    }, [isLoggingOut]);

    const handleSignOut = async () => {
        setIsLoggingOut(true);
        
        try {
            await fetch("/auth/logout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
            });
        } catch (error) {
            console.error("Logout API error:", error);
        }
        
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("userName");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("hasPremium");
        localStorage.removeItem("userData");
        
        setIsLoggedIn(false);
        setUserName("User");
        setUserInitials("U");
        setSubscriptionPlan("Free");
        
        window.dispatchEvent(new Event("premiumStatusChanged"));
        window.dispatchEvent(new Event("userLoggedOut"));
        
        navigate("/", { replace: true });
        
        setTimeout(() => {
            setIsLoggingOut(false);
        }, 1000);
    };


    const handleSubjectSelect = (subjectId) => {
        setSelectedSubject(subjectId);
        setSelectedTopic(null);
    };

    const handleTopicSelect = async (topic) => {
        // Navigate to topic route - this will trigger content view
        if (selectedSubject) {
            navigate(`/conceptmap/subjects/${selectedSubject}/topics/${topic.id}`);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-blue-50 overflow-hidden">
            {/* Top Bar with Home Navigation */}
            <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 shadow-sm z-10 flex-shrink-0">
                <div className="flex items-center justify-between px-4 md:px-6 py-3">
                    {/* Home Navigation Button */}
                    <motion.button
                        onClick={() => navigate("/home")}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors group"
                        title="Back to Home"
                    >
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow">
                            <span className="text-white font-bold text-sm">AI</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-700 hidden md:block group-hover:text-gray-900 transition-colors">
                            AI PYQ Assistant
                        </span>
                    </motion.button>

                    {/* Page Title - Clickable to go to Subject page */}
                    <motion.button
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={() => navigate("/conceptmap/subjects")}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1 text-center cursor-pointer hover:opacity-80 transition-opacity"
                        title="Back to Subjects"
                    >
                        <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            🗺️ ConceptMap
                        </h1>
                        <p className="text-xs md:text-sm text-gray-600 hidden md:block">
                            Static content learning platform for concept exploration
                        </p>
                    </motion.button>

                    {/* Right Side: Topic Navigation Bar (Desktop) or Mobile Menu Toggle */}
                    <div className="hidden md:flex items-center min-w-[180px] justify-end">
                        {selectedSubject && (
                            <TopicNavBar
                                activeTab={activeTab}
                                onTabChange={(tab) => {
                                    if (tab === "learning-path") {
                                        navigate(`/conceptmap/subjects/${selectedSubject}/learning-path`);
                                    } else if (tab === "content" && selectedTopic) {
                                        // Navigate to topic content
                                        navigate(`/conceptmap/subjects/${selectedSubject}/topics/${selectedTopic.id}`);
                                    }
                                }}
                                onLearningPathClick={() => {
                                    navigate(`/conceptmap/subjects/${selectedSubject}/learning-path`);
                                }}
                                showLearningPath={roadmapExists}
                                currentTopic={selectedTopic}
                            />
                        )}
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                        className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        aria-label="Toggle menu"
                    >
                        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile Topic Navigation Bar - Below Header */}
            {selectedSubject && (
                <div className="md:hidden bg-white border-b border-gray-200/50 shadow-sm">
                    <div className="px-4 py-2">
                        <TopicNavBar
                            activeTab={activeTab}
                            onTabChange={(tab) => {
                                if (tab === "learning-path") {
                                    navigate(`/conceptmap/subjects/${selectedSubject}/learning-path`);
                                } else if (tab === "content" && selectedTopic) {
                                    // Navigate to topic content
                                    navigate(`/conceptmap/subjects/${selectedSubject}/topics/${selectedTopic.id}`);
                                }
                            }}
                            onLearningPathClick={() => {
                                navigate(`/conceptmap/subjects/${selectedSubject}/learning-path`);
                            }}
                            showLearningPath={roadmapExists}
                            currentTopic={selectedTopic}
                        />
                    </div>
                </div>
            )}

            {/* Mobile Sidebar Backdrop */}
            {mobileSidebarOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setMobileSidebarOpen(false)}
                    className="md:hidden fixed inset-0 bg-black/50 z-40"
                />
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Slim Unified Sidebar */}
                <motion.aside
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ 
                        x: 0, 
                        opacity: 1,
                        ...(isMobile && {
                            x: mobileSidebarOpen ? 0 : -280
                        })
                    }}
                    transition={{ duration: 0.3 }}
                    className={`bg-white/95 backdrop-blur-sm border-r border-gray-200/50 shadow-xl flex flex-col transition-all duration-300 h-full overflow-hidden ${
                        sidebarCollapsed && !isMobile ? "w-16" : "w-[280px]"
                    } ${isMobile ? "fixed left-0 top-0 h-full z-50" : "flex-shrink-0"}`}
                >
                    {/* Mobile Close Button */}
                    {isMobile && (
                        <button
                            onClick={() => setMobileSidebarOpen(false)}
                            className="md:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-colors z-20"
                            aria-label="Close menu"
                        >
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}

                    {/* Desktop Collapse Toggle Button */}
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="hidden md:flex absolute -right-3 top-4 w-6 h-6 bg-white border border-gray-200 rounded-full shadow-md items-center justify-center hover:bg-gray-50 transition-colors z-20"
                        title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        <svg
                            className={`w-4 h-4 text-gray-600 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    {/* Subjects Section */}
                    <div className="pt-12 md:pt-0 relative flex-shrink-0" style={{ zIndex: 10 }}>
                        {loadingSubjects ? (
                            <div className="h-full flex items-center justify-center p-4">
                                <div className="text-center">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                                    <p className="text-gray-600 text-sm">Loading subjects...</p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-3 relative">
                                <SubjectSelector
                                    subjects={subjects}
                                    selectedSubject={selectedSubject}
                                    onSelectSubject={(id) => {
                                        handleSubjectSelect(id);
                                        if (isMobile) setMobileSidebarOpen(false);
                                    }}
                                    isCollapsed={sidebarCollapsed && !isMobile}
                                />
                            </div>
                        )}
                    </div>

                    {/* Topics Section - Appears immediately below Subjects, scrollable */}
                    <div className="flex-1 overflow-y-auto relative min-h-0" style={{ zIndex: 1 }}>
                        <TopicList
                            topics={topics}
                            organizedTopics={organizedTopics}
                            selectedTopic={selectedTopic}
                            onSelectTopic={(topic) => {
                                handleTopicSelect(topic);
                                if (isMobile) setMobileSidebarOpen(false);
                            }}
                            loading={loadingTopics}
                            isCollapsed={sidebarCollapsed && !isMobile}
                        />
                    </div>

                    {/* User Panel - Fixed at bottom */}
                    <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50/50 relative flex-shrink-0">
                        {isLoggedIn ? (
                            <div className="mt-4 relative">
                                <button
                                    ref={userMenuButtonRef}
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                    className={`w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                                        sidebarCollapsed && !isMobile ? "justify-center" : ""
                                    }`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                                        {userInitials}
                                    </div>
                                    {(!sidebarCollapsed || isMobile) && (
                                        <>
                                            <div className="flex-1 min-w-0 text-left">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {userName}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {subscriptionPlan === "Premium" ? "Premium" : "Free"}
                                                </p>
                                            </div>
                                            <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </>
                                    )}
                                </button>
                                
                                {/* User Menu Dropdown */}
                                <UserMenuDropdown
                                    isOpen={isUserMenuOpen}
                                    onClose={() => setIsUserMenuOpen(false)}
                                    toggleButtonRef={userMenuButtonRef}
                                    onSignOut={handleSignOut}
                                    userName={userName}
                                    userInitials={userInitials}
                                    subscriptionPlan={subscriptionPlan}
                                    isCollapsed={sidebarCollapsed && !isMobile}
                                    onOpenFeedback={() => setIsFeedbackModalOpen(true)}
                                />
                            </div>
                        ) : (
                            <div className="mt-4">
                                {sidebarCollapsed && !isMobile ? (
                                    <button
                                        onClick={() => navigate("/login")}
                                        className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center mx-auto transition-colors"
                                        title="Sign In"
                                    >
                                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </button>
                                ) : (
                                    <>
                                        <p className="text-xs text-gray-600 mb-3 text-center">
                                            Sign in to unlock insights
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => navigate("/login")}
                                                className="flex-1 py-2 px-3 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                                            >
                                                Sign In
                                            </button>
                                            <button
                                                onClick={() => navigate("/signup")}
                                                className="flex-1 py-2 px-3 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                                            >
                                                Sign Up
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </motion.aside>
                
                {/* Feedback Modal */}
                <FeedbackModal 
                    isOpen={isFeedbackModalOpen} 
                    onClose={() => setIsFeedbackModalOpen(false)} 
                />

                {/* Main Content Area - Full Width */}
                <div className="flex-1 flex flex-col overflow-y-auto bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
                    {/* Learning Path View - Show when on learning-path route OR when no topic selected and coming from subject page */}
                    {((isLearningPathRoute || (!topicId && !selectedTopic && selectedSubject)) && currentSubjectId) ? (
                        checkingRoadmap ? (
                            <div className="flex-1 flex items-center justify-center p-4 md:p-8 min-h-full">
                                <div className="text-center">
                                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
                                    <p className="text-gray-600">Loading...</p>
                                </div>
                            </div>
                        ) : roadmapExists ? (
                            <div className="flex-1 flex flex-col min-h-full">
                                <div className="flex-1 min-h-0 rounded-lg overflow-hidden shadow-xl border border-gray-200/50 bg-white m-4">
                                    <LearningPath
                                        subject={currentSubjectId}
                                        onTopicSelect={handleTopicSelect}
                                        currentTopicId={topicId}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center p-4 md:p-8">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="text-center max-w-md"
                                >
                                    <div className="text-5xl md:text-7xl mb-4 md:mb-6">🗺️</div>
                                    <h3 className="text-xl md:text-2xl font-semibold text-gray-700 mb-2 md:mb-3">
                                        Coming Soon
                                    </h3>
                                    <p className="text-gray-500 text-sm md:text-lg">
                                        The learning path for this subject is being prepared. Please check back later.
                                    </p>
                                    <motion.button
                                        onClick={() => navigate("/conceptmap/subjects")}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all"
                                    >
                                        Back to Subjects
                                    </motion.button>
                                </motion.div>
                            </div>
                        )
                    ) : selectedTopic ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4 }}
                            className="flex-1 flex flex-col overflow-hidden"
                        >
                            {/* Content Renderer - Full Height */}
                            <div className="flex-1 min-h-0 rounded-lg overflow-hidden shadow-xl border border-gray-200/50 bg-white m-4">
                                <ContentRenderer 
                                    topic={selectedTopic} 
                                    selectedSubject={selectedSubject}
                                    onTopicSelect={handleTopicSelect}
                                    activeTab={activeTab}
                                    onTabChange={setActiveTab}
                                />
                            </div>
                        </motion.div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-4 md:p-8">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="text-center max-w-md"
                            >
                                <div className="text-5xl md:text-7xl mb-4 md:mb-6 animate-pulse">🗺️</div>
                                <h3 className="text-xl md:text-2xl font-semibold text-gray-700 mb-2 md:mb-3">
                                    Select a Topic
                                </h3>
                                <p className="text-gray-500 text-sm md:text-lg">
                                    {isMobile ? "Tap the menu to get started" : "Choose a subject and topic to view the static content"}
                                </p>
                                {isMobile && (
                                    <button
                                        onClick={() => setMobileSidebarOpen(true)}
                                        className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all"
                                    >
                                        Open Menu
                                    </button>
                                )}
                            </motion.div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

