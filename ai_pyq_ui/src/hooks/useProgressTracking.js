// src/hooks/useProgressTracking.js
import { useState, useCallback, useRef } from "react";

const API_BASE_URL = "";

/**
 * Hook for tracking user's question-solving progress
 */
export function useProgressTracking() {
    const [solvedQuestionIds, setSolvedQuestionIds] = useState(new Set());
    const [progressData, setProgressData] = useState(null);
    const [loading, setLoading] = useState(false);
    const solvedCacheRef = useRef(new Set());

    /**
     * Track when user solves a question
     */
    const trackQuestion = useCallback(async (questionId, exam, subject, topic, source, isCorrect = null) => {
        try {
            const response = await fetch(`${API_BASE_URL}/roadmap/track-question`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    question_id: questionId,
                    exam: exam,
                    subject: subject,
                    topic: topic,
                    source: source, // "exam_mode", "topic_wise", "semantic_search"
                    is_correct: isCorrect
                })
            });

            if (response.ok) {
                // Update local cache
                const newSet = new Set(solvedQuestionIds);
                newSet.add(questionId);
                setSolvedQuestionIds(newSet);
                solvedCacheRef.current.add(questionId);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error tracking question:", error);
            return false;
        }
    }, [solvedQuestionIds]);

    /**
     * Batch check if questions are solved
     */
    const checkSolved = useCallback(async (questionIds) => {
        if (!questionIds || questionIds.length === 0) {
            return {};
        }

        try {
            const response = await fetch(`${API_BASE_URL}/roadmap/check-solved`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    question_ids: questionIds
                })
            });

            if (response.ok) {
                const data = await response.json();
                // Update local cache
                const newSet = new Set(solvedQuestionIds);
                Object.keys(data).forEach(qid => {
                    if (data[qid]) {
                        newSet.add(parseInt(qid));
                        solvedCacheRef.current.add(parseInt(qid));
                    }
                });
                setSolvedQuestionIds(newSet);
                return data;
            }
            return {};
        } catch (error) {
            console.error("Error checking solved status:", error);
            return {};
        }
    }, [solvedQuestionIds]);

    /**
     * Fetch progress for a specific exam
     */
    const fetchProgress = useCallback(async (exam, language = "en") => {
        if (!exam) {
            setProgressData(null);
            return;
        }

        setLoading(true);
        try {
            const langParam = language === "hi" ? "hi" : "en";
            const response = await fetch(`${API_BASE_URL}/roadmap/progress/${encodeURIComponent(exam)}?language=${langParam}`, {
                credentials: "include"
            });

            if (response.ok) {
                const data = await response.json();
                setProgressData(data);
                
                // Update solved question IDs cache
                if (data.solved_question_ids) {
                    const newSet = new Set(data.solved_question_ids);
                    setSolvedQuestionIds(newSet);
                    data.solved_question_ids.forEach(id => {
                        solvedCacheRef.current.add(id);
                    });
                }
                return data;
            } else {
                setProgressData(null);
                return null;
            }
        } catch (error) {
            console.error("Error fetching progress:", error);
            setProgressData(null);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Check if a question is solved (from cache)
     */
    const isSolved = useCallback((questionId) => {
        return solvedQuestionIds.has(questionId) || solvedCacheRef.current.has(questionId);
    }, [solvedQuestionIds]);

    /**
     * Clear progress data
     */
    const clearProgress = useCallback(() => {
        setProgressData(null);
        setSolvedQuestionIds(new Set());
        solvedCacheRef.current.clear();
    }, []);

    return {
        trackQuestion,
        checkSolved,
        fetchProgress,
        isSolved,
        clearProgress,
        progressData,
        solvedQuestionIds,
        loading
    };
}

