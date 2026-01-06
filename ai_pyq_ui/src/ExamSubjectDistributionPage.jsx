// src/ExamSubjectDistributionPage.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { buildApiUrl } from "./config/apiConfig";
import Sidebar from "./components/Sidebar";
import FilterBar from "./components/FilterBar";
import { useLanguage } from "./contexts/LanguageContext";
import { useMobileDetection } from "./utils/useMobileDetection";

export default function ExamSubjectDistributionPage() {
    const { examName } = useParams();
    const navigate = useNavigate();
    const { language } = useLanguage();
    const isMobile = useMobileDetection();
    const [examsList, setExamsList] = useState([]);
    const [subjectData, setSubjectData] = useState([]);
    const [availableYears, setAvailableYears] = useState([]);
    const [yearFrom, setYearFrom] = useState(null);
    const [yearTo, setYearTo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [primarySidebarCollapsed, setPrimarySidebarCollapsed] = useState(false);
    const [filterPaneExpanded, setFilterPaneExpanded] = useState(false);
    
    const decodedExamName = examName ? decodeURIComponent(examName) : "";
    const subjectChartRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
        // Fetch exam filters
        const fetchExams = async () => {
            try {
                const res = await fetch(buildApiUrl("filters"));
                const data = await res.json();
                setExamsList(data.exams || []);
            } catch (err) {
                console.error("Failed to fetch exams:", err);
            }
        };
        fetchExams();

        // Fetch available years
        const fetchYears = async () => {
            try {
                const url = buildApiUrl("dashboard/filters");
                const res = await fetch(url, {
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.years && data.years.length > 0) {
                        setAvailableYears(data.years);
                        if (!yearFrom && data.years[0]) {
                            setYearFrom(data.years[0]);
                        }
                        if (!yearTo && data.years[data.years.length - 1]) {
                            setYearTo(data.years[data.years.length - 1]);
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching years:", err);
            }
        };
        fetchYears();
    }, []);

    // Detect mobile and container width
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            const initialWidth = window.innerWidth - 64;
            setContainerWidth(initialWidth > 0 ? initialWidth : window.innerWidth);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Update container width when chart ref is available
    useEffect(() => {
        const updateWidth = () => {
            if (subjectChartRef.current) {
                const rect = subjectChartRef.current.getBoundingClientRect();
                const width = rect.width || subjectChartRef.current.offsetWidth || subjectChartRef.current.clientWidth;
                if (width > 0) {
                    setContainerWidth(width);
                } else {
                    const fallbackWidth = window.innerWidth - 64;
                    setContainerWidth(fallbackWidth);
                }
            } else {
                const fallbackWidth = window.innerWidth - 64;
                setContainerWidth(fallbackWidth);
            }
        };
        updateWidth();
        const timer1 = setTimeout(updateWidth, 50);
        const timer2 = setTimeout(updateWidth, 200);
        window.addEventListener('resize', updateWidth);
        return () => {
            window.removeEventListener('resize', updateWidth);
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, [subjectData.length]);

    // Fetch subject weightage
    useEffect(() => {
        if (!decodedExamName) {
            setSubjectData([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const langParam = language === "hi" ? "hi" : "en";
        let url = `${buildApiUrl("dashboard/subject-weightage")}?exam=${encodeURIComponent(decodedExamName)}&language=${langParam}`;
        if (yearFrom) {
            url += `&year_from=${yearFrom}`;
        }
        if (yearTo) {
            url += `&year_to=${yearTo}`;
        }

        fetch(url)
            .then((res) => res.json())
            .then((result) => {
                if (result.subjects && result.subjects.length > 0) {
                    setSubjectData(result.subjects);
                } else {
                    setSubjectData([]);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching subject weightage:", err);
                setError("Failed to load subject data");
                setLoading(false);
            });
    }, [decodedExamName, yearFrom, yearTo, language]);

    const colorPalette = [
        "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
        "#06b6d4", "#f97316", "#ec4899", "#14b8a6", "#6366f1",
        "#84cc16", "#f43f5e"
    ];

    const getSubjectColor = (index) => {
        return colorPalette[index % colorPalette.length];
    };

    const subjectHeight = subjectData.length > 0 ? Math.max(300, subjectData.length * 45) : 300;

    const handleFilterPaneToggle = () => {
        setFilterPaneExpanded(prev => !prev);
    };

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
                {/* Filter Bar */}
                <div className="w-full relative z-10">
                    <FilterBar
                        exam={decodedExamName}
                        setExam={() => {}}
                        examsList={examsList}
                        yearFrom={yearFrom}
                        setYearFrom={setYearFrom}
                        yearTo={yearTo}
                        setYearTo={setYearTo}
                        availableYears={availableYears}
                        showSubject={false}
                        showExam={false}
                        isMobile={isMobile}
                        isExpanded={filterPaneExpanded}
                        onToggleExpand={handleFilterPaneToggle}
                    />
                </div>

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
                                onClick={() => navigate(`/home/${encodeURIComponent(decodedExamName)}`)}
                                className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors shadow-sm"
                                title="Back to Exam Page"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                                    {decodedExamName} {language === "hi" ? "विषय वितरण" : "Subject Distribution"}
                                </h1>
                                <p className="text-xs md:text-sm text-gray-600">
                                    {language === "hi"
                                        ? "विषयों का वितरण देखें"
                                        : "View subject distribution"}
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Subject Distribution Chart */}
                    {!decodedExamName ? (
                        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                            <p className="text-gray-500 text-center py-8">
                                {language === "hi" ? "कृपया एक परीक्षा चुनें" : "Please select an exam"}
                            </p>
                        </div>
                    ) : loading ? (
                        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                            <div className="flex items-center justify-center py-12">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="bg-white rounded-2xl shadow-lg p-6 border border-red-200">
                            <p className="text-red-500 text-center py-8">{error}</p>
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border border-gray-200"
                            style={{ minHeight: `${subjectHeight + 120}px`, width: '100%' }}
                        >
                            <div className="mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-1">
                                    {language === "hi" ? "विषय वितरण" : "Subject Distribution"}
                                </h3>
                                <p className="text-xs text-gray-500 mb-1">
                                    {language === "hi" ? "PYQ की संख्या के आधार पर" : "Based on number of PYQs"}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {yearFrom && yearTo ? `(${yearFrom}–${yearTo})` : ''}
                                </p>
                            </div>

                            {subjectData.length > 0 ? (
                                <div
                                    ref={subjectChartRef}
                                    style={{
                                        width: '100%',
                                        height: `${subjectHeight}px`,
                                        minHeight: `${subjectHeight}px`,
                                        minWidth: '100%',
                                        position: 'relative',
                                        overflow: 'visible'
                                    }}
                                >
                                    {containerWidth > 0 ? (
                                        <ResponsiveContainer
                                            width={isMobile ? containerWidth : "100%"}
                                            height={subjectHeight}
                                            minHeight={300}
                                        >
                                            <BarChart
                                                data={subjectData}
                                                layout="vertical"
                                                margin={{ top: 10, right: 60, left: 0, bottom: 10 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis
                                                    type="number"
                                                    domain={[0, "dataMax"]}
                                                    tick={{ fontSize: 12 }}
                                                    hide={true}
                                                />
                                                <YAxis
                                                    type="category"
                                                    dataKey="name"
                                                    width={160}
                                                    tick={{ fontSize: 12 }}
                                                    interval={0}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    domain={[0, 'dataMax']}
                                                    padding={{ top: 0, bottom: 0 }}
                                                />
                                                <Tooltip
                                                    formatter={(value, name, props) => {
                                                        if (name === "percentage") {
                                                            const count = props.payload.count || Math.round((value / 100) * (props.payload.total || 100));
                                                            return `${count} PYQs`;
                                                        }
                                                        return value;
                                                    }}
                                                    contentStyle={{
                                                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                                                        border: "1px solid #e5e7eb",
                                                        borderRadius: "8px",
                                                    }}
                                                />
                                                <Bar
                                                    dataKey="percentage"
                                                    radius={[0, 8, 8, 0]}
                                                    barSize={28}
                                                >
                                                    {subjectData.map((entry, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={getSubjectColor(index)}
                                                        />
                                                    ))}
                                                    <LabelList
                                                        content={(props) => {
                                                            const { x, y, width, payload } = props;
                                                            if (!payload || !width) return null;
                                                            const count = payload.count || Math.round((payload.percentage / 100) * (payload.total || 100));
                                                            return (
                                                                <text
                                                                    x={x + width + 8}
                                                                    y={y + 14}
                                                                    fill="#6b7280"
                                                                    fontSize={11}
                                                                    textAnchor="start"
                                                                >
                                                                    {count}
                                                                </text>
                                                            );
                                                        }}
                                                    />
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ width: '100%', height: `${subjectHeight}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <p className="text-gray-500">Loading chart...</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-8">
                                    {language === "hi" ? "कोई विषय डेटा उपलब्ध नहीं है" : "No subject data available"}
                                </p>
                            )}
                        </motion.div>
                    )}
                </div>
            </main>
        </div>
    );
}

