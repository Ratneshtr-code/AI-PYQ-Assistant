// src/components/ResultsChart.jsx
import { useMemo } from "react";
import { useMobileDetection } from "../utils/useMobileDetection";

export default function ResultsChart({ results, onExamClick, selectedExam }) {
    const isMobile = useMobileDetection();
    
    if (!results || results.length === 0) return null;

    // Optimize: Use useMemo to prevent recalculation on every render
    const { sortedData, COLORS } = useMemo(() => {
        const examCounts = results.reduce((acc, r) => {
            const exam = r.exam || "Unknown";
            acc[exam] = (acc[exam] || 0) + 1;
            return acc;
        }, {});

        const data = Object.entries(examCounts).map(([exam, count]) => ({
            name: exam,
            value: count,
        }));

        if (data.length <= 1) return { sortedData: [], COLORS: [] };

        const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#00C49F", "#FFBB28"];
        const sortedData = [...data].sort((a, b) => b.value - a.value);
        
        return { sortedData, COLORS };
    }, [results]);

    if (sortedData.length <= 1) return null;
    
    return (
        <div className={`w-full bg-white border border-gray-200 rounded-2xl shadow-sm ${isMobile ? 'p-4' : 'p-6'} relative`}>
            {selectedExam && (
                <button
                    onClick={() => onExamClick && onExamClick("")}
                    className={`${isMobile ? 'static mb-3 w-full justify-center' : 'absolute top-3 right-3'} flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md transition-all duration-200 active:scale-95`}
                    title="Clear filter"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Clear</span>
                </button>
            )}
            <div className={`flex flex-wrap gap-3 ${isMobile ? 'justify-center' : 'justify-start'} ${isMobile && selectedExam ? '' : ''}`}>
                {sortedData.map((entry, index) => {
                    const isSelected = selectedExam === entry.name;
                    return (
                        <button
                            key={entry.name}
                            onClick={() => onExamClick && onExamClick(entry.name)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border shadow-sm transition-all duration-200 ${
                                isSelected 
                                    ? 'bg-blue-50 border-blue-400 shadow-md scale-105' 
                                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300 hover:shadow-md active:scale-95'
                            }`}
                        >
                            <div 
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className={`text-sm font-medium ${
                                isSelected ? 'text-blue-700' : 'text-gray-700'
                            }`}>
                                {entry.name}: <span className={`font-bold ${
                                    isSelected ? 'text-blue-900' : 'text-gray-900'
                                }`}>{entry.value}</span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
