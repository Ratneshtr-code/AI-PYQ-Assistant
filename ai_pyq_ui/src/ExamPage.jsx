// src/ExamPage.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { buildApiUrl } from "./config/apiConfig";
import Sidebar from "./components/Sidebar";
import NotificationWindow from "./components/NotificationWindow";
import { useLanguage } from "./contexts/LanguageContext";
import { useMobileDetection } from "./utils/useMobileDetection";

export default function ExamPage() {
    const { examName } = useParams();
    const navigate = useNavigate();
    const { language } = useLanguage();
    const isMobile = useMobileDetection();
    const [examsList, setExamsList] = useState([]);
    const [primarySidebarCollapsed, setPrimarySidebarCollapsed] = useState(false);
    
    const decodedExamName = examName ? decodeURIComponent(examName) : "";

    useEffect(() => {
        // Fetch exam filters to validate exam exists
        const fetchExams = async () => {
            try {
                const url = buildApiUrl("filters");
                const res = await fetch(url, {
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    setExamsList(data.exams || []);
                }
            } catch (err) {
                console.error("Error fetching exams:", err);
            }
        };
        fetchExams();
    }, []);

    const handleCardClick = (route) => {
        navigate(`/home/${encodeURIComponent(decodedExamName)}/${route}`);
    };

    const featureCards = [
        {
            id: "info",
            title: language === "hi" ? "जानकारी" : "Info",
            description: language === "hi" 
                ? "परीक्षा की विस्तृत जानकारी, पाठ्यक्रम और पैटर्न देखें" 
                : "View detailed exam information, syllabus, and pattern",
            icon: "ℹ️",
            route: "info",
            gradient: "from-blue-50/50 to-indigo-50/50"
        },
        {
            id: "roadmap",
            title: language === "hi" ? "रोडमैप" : "RoadMap",
            description: language === "hi"
                ? "अपनी तैयारी के लिए व्यक्तिगत रोडमैप और रणनीति देखें"
                : "View personalized roadmap and strategy for your preparation",
            icon: "🗺️",
            route: "roadmap",
            gradient: "from-purple-50/50 to-pink-50/50"
        },
        {
            id: "my-progress",
            title: language === "hi" ? "मेरी प्रगति" : "My Progress",
            description: language === "hi"
                ? "अपनी प्रगति को ट्रैक करें और अपने प्रदर्शन का विश्लेषण करें"
                : "Track your progress and analyze your performance",
            icon: "📈",
            route: "my-progress",
            gradient: "from-green-50/50 to-emerald-50/50"
        },
        {
            id: "subject-distribution",
            title: language === "hi" ? "विषय वितरण" : "Subject Distribution",
            description: language === "hi"
                ? "इस परीक्षा में विषयों के वितरण पैटर्न का विश्लेषण करें"
                : "Analyze subject distribution patterns for this exam",
            icon: "📊",
            route: "subject-distribution",
            gradient: "from-cyan-50/50 to-blue-50/50"
        },
        {
            id: "topic-distribution",
            title: language === "hi" ? "टॉपिक वितरण" : "Topic Distribution",
            description: language === "hi"
                ? "विषय-वार टॉपिक वितरण देखें और महत्वपूर्ण क्षेत्रों की पहचान करें"
                : "View topic distribution by subject and identify important areas",
            icon: "📚",
            route: "topic-distribution",
            gradient: "from-indigo-50/50 to-purple-50/50"
        },
        {
            id: "hottest-topics",
            title: language === "hi" ? "सबसे गर्म विषय" : "Hottest Topics",
            description: language === "hi"
                ? "इस परीक्षा के लिए सबसे अधिक पूछे जाने वाले विषयों की खोज करें"
                : "Discover the most frequently asked topics for this exam",
            icon: "🔥",
            route: "hottest-topics",
            gradient: "from-orange-50/50 to-red-50/50"
        },
        {
            id: "pyq",
            title: "PYQ",
            description: language === "hi"
                ? "पिछले वर्ष के प्रश्न पत्रों का अभ्यास करें"
                : "Practice previous year question papers",
            icon: "📝",
            route: "pyq",
            gradient: "from-yellow-50/50 to-amber-50/50"
        },
        {
            id: "mock",
            title: language === "hi" ? "मॉक" : "Mock",
            description: language === "hi"
                ? "मॉक टेस्ट लें और अपनी तैयारी का मूल्यांकन करें"
                : "Take mock tests and evaluate your preparation",
            icon: "✍️",
            route: "mock",
            gradient: "from-teal-50/50 to-cyan-50/50"
        },
        {
            id: "subject-test",
            title: language === "hi" ? "विषय-वार टेस्ट" : "Subject Test",
            description: language === "hi"
                ? "विषय-वार अभ्यास टेस्ट लें और अपने कमजोर क्षेत्रों पर काम करें"
                : "Take subject-wise practice tests and work on weak areas",
            icon: "📚",
            route: "subject-test",
            gradient: "from-pink-50/50 to-rose-50/50"
        },
        {
            id: "my-tests",
            title: language === "hi" ? "मेरे टेस्ट" : "My Tests",
            description: language === "hi"
                ? "आपके द्वारा पूर्ण किए गए सभी टेस्ट और उनके परिणाम देखें"
                : "View all your completed tests and their results",
            icon: "✅",
            route: "my-tests",
            gradient: "from-violet-50/50 to-purple-50/50"
        }
    ];

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-800">
            {/* Primary Sidebar */}
            <Sidebar 
                exam={decodedExamName} 
                setExam={() => {}} 
                examsList={examsList}
                onOpenSecondarySidebar={() => {}}
                onCollapseChange={(isCollapsed) => {
                    setPrimarySidebarCollapsed(isCollapsed);
                }}
            />

            {/* Main Content */}
            <main
                className={`flex-1 flex flex-col transition-all duration-300 min-h-screen ${
                    primarySidebarCollapsed ? "md:ml-16" : "md:ml-64"
                }`}
            >
                {/* Content Area */}
                <div className="w-full max-w-7xl mx-auto px-2 md:px-4 lg:px-8 py-4 md:py-6 lg:py-8 space-y-4">
                    {/* Header with Back Button */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mb-6 flex items-start justify-between"
                    >
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate("/home")}
                                className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors shadow-sm"
                                title="Back to Home"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-1xl md:text-3xl font-bold text-gray-900">
                                    {decodedExamName || "Exam"}
                                </h1>
                            </div>
                        </div>
                    </motion.div>

                    {/* Notification Window */}
                    {decodedExamName && (
                        <NotificationWindow examName={decodedExamName} />
                    )}

                    {/* Premium Cards Grid - Desktop: 5 columns (2 rows), Mobile: 2 columns */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6 md:mb-8 max-w-7xl mx-auto">
                        {featureCards.map((card, index) => (
                            <motion.div
                                key={card.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05, duration: 0.3 }}
                                onClick={() => handleCardClick(card.route)}
                                className="group relative bg-white rounded-xl shadow-lg hover:shadow-2xl border border-gray-200 hover:border-indigo-300 cursor-pointer transition-all duration-300 overflow-hidden p-4 md:p-5 flex flex-col h-full"
                                whileHover={{ scale: 1.02 }}
                                title={card.description}
                            >
                                {/* Gradient Overlay */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                                
                                {/* Content */}
                                <div className="relative z-10 flex flex-col flex-1">
                                    <div className="text-4xl md:text-5xl mb-3 md:mb-4">{card.icon}</div>
                                    <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 md:mb-3">
                                        {card.title}
                                    </h3>
                                    <p className="text-xs md:text-sm text-gray-600 leading-relaxed mb-3 md:mb-4 flex-1 line-clamp-3">
                                        {card.description}
                                    </p>
                                    
                                    {/* Arrow Indicator */}
                                    <div className="mt-auto pt-2 flex items-center text-indigo-600 font-medium text-xs md:text-sm group-hover:translate-x-1 transition-transform duration-300">
                                        <span>{language === "hi" ? "अन्वेषण करें" : "Explore"}</span>
                                        <svg className="w-3 h-3 md:w-4 md:h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}

