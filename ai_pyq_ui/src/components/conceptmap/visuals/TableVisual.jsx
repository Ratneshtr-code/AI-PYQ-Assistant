// components/conceptmap/visuals/TableVisual.jsx
import { useState, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function TableVisual({ topicData }) {
    const [expandedRow, setExpandedRow] = useState(null);
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState("asc");
    const [filterCategory, setFilterCategory] = useState("all");

    if (!topicData || !topicData.data) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">No table data available</p>
            </div>
        );
    }

    const { data } = topicData;
    const columns = data.columns || [];
    const rows = data.rows || [];
    const categories = data.categories || [];

    // Filter rows by category
    let filteredRows = filterCategory === "all" 
        ? rows 
        : rows.filter(row => row.category === filterCategory);

    // Sort rows
    if (sortColumn) {
        filteredRows = [...filteredRows].sort((a, b) => {
            const aVal = a[sortColumn] || "";
            const bVal = b[sortColumn] || "";
            
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
            }
            
            return sortDirection === "asc" 
                ? aVal.toString().localeCompare(bVal.toString())
                : bVal.toString().localeCompare(aVal.toString());
        });
    }

    const handleSort = (columnKey) => {
        if (sortColumn === columnKey) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortColumn(columnKey);
            setSortDirection("asc");
        }
    };

    const getCategoryColor = (category) => {
        const colors = {
            political: "bg-red-50 border-red-200",
            economic: "bg-orange-50 border-orange-200",
            social: "bg-blue-50 border-blue-200",
            administrative: "bg-purple-50 border-purple-200",
            educational: "bg-green-50 border-green-200",
        };
        return colors[category] || "bg-gray-50 border-gray-200";
    };

    // Check if any row has details - if yes, show Details column
    const hasDetailsColumn = rows.some(row => row.details);

    return (
        <div className="w-full h-full bg-gradient-to-br from-gray-50 to-blue-50 overflow-auto">
            <div className="p-6 md:p-8">
                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">{topicData.title}</h2>
                    {topicData.description && (
                        <p className="text-gray-600">{topicData.description}</p>
                    )}
                </div>

                {/* Filters */}
                {categories.length > 0 && (
                    <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Filter by Category</h3>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setFilterCategory("all")}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    filterCategory === "all"
                                        ? "bg-blue-500 text-white"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                            >
                                All ({rows.length})
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setFilterCategory(cat.id)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        filterCategory === cat.id
                                            ? "bg-blue-500 text-white"
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                                >
                                    {cat.label} ({rows.filter(r => r.category === cat.id).length})
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                                <tr>
                                    {columns.map((col) => (
                                        <th
                                            key={col.key}
                                            className="px-6 py-4 text-left text-sm font-semibold cursor-pointer hover:bg-blue-600 transition-colors"
                                            onClick={() => handleSort(col.key)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span>{col.label}</span>
                                                {sortColumn === col.key && (
                                                    <svg className={`w-4 h-4 transition-transform ${sortDirection === "desc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                    {hasDetailsColumn && (
                                        <th className="px-6 py-4 text-center text-sm font-semibold w-20">Details</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.map((row, idx) => (
                                    <Fragment key={row.id}>
                                        <motion.tr
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: idx * 0.03 }}
                                            className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                                                row.category ? getCategoryColor(row.category) : ""
                                            }`}
                                        >
                                            {columns.map((col) => (
                                                <td key={col.key} className="px-6 py-4 text-sm text-gray-800 whitespace-pre-line">
                                                    {col.render ? col.render(row[col.key]) : row[col.key]}
                                                </td>
                                            ))}
                                            {hasDetailsColumn && (
                                                <td className="px-6 py-4 text-center">
                                                    {row.details && (
                                                        <button
                                                            onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}
                                                            className="text-blue-500 hover:text-blue-700 font-medium text-sm"
                                                        >
                                                            {expandedRow === row.id ? "Hide" : "Show"}
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                        </motion.tr>
                                        {/* Expanded Details Row */}
                                        {expandedRow === row.id && row.details && (
                                            <tr>
                                                <td colSpan={columns.length + (hasDetailsColumn ? 1 : 0)} className="px-6 py-4 bg-blue-50 border-b border-blue-200">
                                                    <AnimatePresence>
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: "auto" }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="py-2">
                                                                <h3 className="text-lg font-bold text-gray-800 mb-3">
                                                                    {row[columns[0]?.key] || "Details"}
                                                                </h3>
                                                                {typeof row.details === 'string' ? (
                                                                    <p className="text-gray-700">{row.details}</p>
                                                                ) : (
                                                                    <div className="space-y-3">
                                                                        {row.details.description && (
                                                                            <p className="text-gray-700">{row.details.description}</p>
                                                                        )}
                                                                        {row.details.points && (
                                                                            <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                                                {row.details.points.map((point, i) => (
                                                                                    <li key={i}>{point}</li>
                                                                                ))}
                                                                            </ul>
                                                                        )}
                                                                        {row.details.impact && (
                                                                            <div className="mt-3 p-3 bg-white rounded border border-blue-300">
                                                                                <p className="text-xs font-semibold text-blue-800 mb-1">Impact:</p>
                                                                                <p className="text-sm text-blue-900">{row.details.impact}</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    </AnimatePresence>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))}
                                {filteredRows.length === 0 && (
                                    <tr>
                                        <td colSpan={columns.length + (hasDetailsColumn ? 1 : 0)} className="px-6 py-8 text-center text-gray-500">
                                            No data available for this filter
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden p-4 space-y-4">
                        {filteredRows.map((row, idx) => (
                            <motion.div
                                key={row.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`rounded-lg border-2 p-4 ${
                                    row.category ? getCategoryColor(row.category) : "bg-white border-gray-200"
                                }`}
                            >
                                {columns.map((col) => (
                                    <div key={col.key} className="mb-3 last:mb-0">
                                        <span className="text-xs font-semibold text-gray-600 uppercase">{col.label}</span>
                                        <p className="text-sm text-gray-800 mt-1 whitespace-pre-line">
                                            {col.render ? col.render(row[col.key]) : row[col.key]}
                                        </p>
                                    </div>
                                ))}
                                {row.details && (
                                    <>
                                        <button
                                            onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}
                                            className="mt-3 text-blue-500 hover:text-blue-700 font-medium text-sm"
                                        >
                                            {expandedRow === row.id ? "Hide Details" : "Show Details"}
                                        </button>
                                        {/* Expanded Details Inline */}
                                        <AnimatePresence>
                                            {expandedRow === row.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="mt-4 pt-4 border-t border-gray-300 overflow-hidden"
                                                >
                                                    <h3 className="text-base font-bold text-gray-800 mb-2">
                                                        {row[columns[0]?.key] || "Details"}
                                                    </h3>
                                                    {typeof row.details === 'string' ? (
                                                        <p className="text-sm text-gray-700">{row.details}</p>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {row.details.description && (
                                                                <p className="text-sm text-gray-700">{row.details.description}</p>
                                                            )}
                                                            {row.details.points && (
                                                                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                                                                    {row.details.points.map((point, i) => (
                                                                        <li key={i}>{point}</li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                            {row.details.impact && (
                                                                <div className="mt-2 p-2 bg-white rounded border border-blue-300">
                                                                    <p className="text-xs font-semibold text-blue-800 mb-1">Impact:</p>
                                                                    <p className="text-xs text-blue-900">{row.details.impact}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Summary */}
                {data.summary && (
                    <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <h3 className="text-sm font-semibold text-yellow-800 mb-2">
                            {typeof data.summary === 'string' ? 'Summary' : data.summary.title || 'Summary'}
                        </h3>
                        {typeof data.summary === 'string' ? (
                            <p className="text-sm text-yellow-900">{data.summary}</p>
                        ) : (
                            <div className="space-y-2">
                                {data.summary.points && (
                                    <ul className="list-disc list-inside space-y-1 text-sm text-yellow-900">
                                        {data.summary.points.map((point, idx) => (
                                            <li key={idx}>{point}</li>
                                        ))}
                                    </ul>
                                )}
                                {data.summary.examTip && (
                                    <div className="mt-3 p-2 bg-yellow-100 rounded border border-yellow-300">
                                        <p className="text-xs font-semibold text-yellow-800 mb-1">💡 Exam Tip:</p>
                                        <p className="text-xs text-yellow-900">{data.summary.examTip}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Additional Info */}
                {data.additionalInfo && (
                    <div className="mt-6 space-y-4">
                        {/* Comparison Section */}
                        {data.additionalInfo.comparison && data.additionalInfo.comparison.length > 0 && (
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <h3 className="text-sm font-semibold text-blue-800 mb-3">
                                    {data.additionalInfo.title || 'Key Differences & Common Features'}
                                </h3>
                                <div className="space-y-3">
                                    {data.additionalInfo.comparison.map((item, idx) => (
                                        <div key={idx} className="p-3 bg-white rounded border border-blue-200">
                                            <p className="text-sm font-semibold text-blue-900 mb-1">
                                                {item.aspect}
                                            </p>
                                            <p className="text-sm text-blue-800">
                                                {item.detail}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Exam Tip from Additional Info */}
                        {data.additionalInfo.examTip && (
                            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                <p className="text-xs font-semibold text-green-800 mb-2">💡 Exam Tip:</p>
                                <p className="text-sm text-green-900">{data.additionalInfo.examTip}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

