// src/ExamDashboardPage.jsx
import Sidebar from "./components/Sidebar";
import { useState, useEffect } from "react";

export default function ExamDashboardPage() {
  const [exam, setExam] = useState("");
  const [examsList, setExamsList] = useState([]);

  useEffect(() => {
    // Fetch exam filters for sidebar
    const fetchExams = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/filters");
        const data = await res.json();
        setExamsList(data.exams || []);
      } catch (err) {
        console.error("Failed to fetch exams:", err);
      }
    };
    fetchExams();
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800">
      {/* 🧭 Sidebar */}
      <Sidebar exam={exam} setExam={setExam} examsList={examsList} />

      {/* 📊 Center Content */}
    <main className="flex-1 flex flex-col items-center justify-start p-8 md:pl-72 pt-12 transition-all duration-300">
        <div className="max-w-3xl w-full space-y-6 text-center mx-0 md:mx-auto px-4 md:px-0">
          <h1 className="text-3xl font-bold mb-4">📊 Exam Dashboard</h1>
          <p className="text-gray-500 text-lg">Coming Soon...</p>
        </div>
     </main>
    </div>
  );
}
