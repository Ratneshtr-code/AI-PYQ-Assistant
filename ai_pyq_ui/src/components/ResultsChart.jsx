// src/components/ResultsChart.jsx
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function ResultsChart({ results }) {
    if (!results || results.length === 0) return null;

    // ✅ Count how many PYQs per exam
    const examCounts = results.reduce((acc, r) => {
        const exam = r.exam || "Unknown";
        acc[exam] = (acc[exam] || 0) + 1;
        return acc;
    }, {});

    const data = Object.entries(examCounts).map(([exam, count]) => ({
        name: exam,
        value: count,
    }));

    // If only 1 exam, skip chart (no comparison to show)
    if (data.length <= 1) return null;

    const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#00C49F", "#FFBB28"];

    return (
        <div className="max-w-xl mx-auto my-6 bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-3 text-center text-gray-800">
                📊 Topic Distribution Across Exams
            </h3>
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                            />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
