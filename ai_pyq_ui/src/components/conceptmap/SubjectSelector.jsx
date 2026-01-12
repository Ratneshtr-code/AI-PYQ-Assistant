// components/conceptmap/SubjectSelector.jsx
import { motion } from "framer-motion";

export default function SubjectSelector({ subjects, selectedSubject, onSelectSubject }) {
    return (
        <div className="h-full overflow-y-auto">
            <div className="p-4 space-y-2">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Subjects</h2>
                {subjects.map((subject, index) => (
                    <motion.button
                        key={subject.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => onSelectSubject(subject.id)}
                        className={`w-full text-left p-4 rounded-lg transition-all duration-200 ${
                            selectedSubject === subject.id
                                ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
                                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{subject.icon}</span>
                            <div className="flex-1">
                                <p className="font-semibold">{subject.name}</p>
                                {subject.description && (
                                    <p className={`text-xs mt-1 ${
                                        selectedSubject === subject.id
                                            ? "text-blue-100"
                                            : "text-gray-500"
                                    }`}>
                                        {subject.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}

