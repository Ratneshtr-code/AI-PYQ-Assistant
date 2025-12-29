// src/components/PaymentMethodSelector.jsx
import { motion } from "framer-motion";

export default function PaymentMethodSelector({ selectedMethod, onSelect, paymentMethods = [] }) {
    // Default payment methods if none provided
    const defaultMethods = [
        {
            id: "razorpay",
            name: "Razorpay",
            description: "Secure payment gateway - Cards, UPI, Netbanking, Wallets",
            icon: "💳",
            available: true
        },
        {
            id: "payu",
            name: "PayU",
            description: "Popular payment gateway for Indian market",
            icon: "💵",
            available: false,
            comingSoon: true
        },
        {
            id: "paytm",
            name: "Paytm",
            description: "India's leading digital payments platform",
            icon: "📱",
            available: false,
            comingSoon: true
        },
        {
            id: "cashfree",
            name: "Cashfree",
            description: "Fast and secure payment processing",
            icon: "💸",
            available: false,
            comingSoon: true
        }
    ];

    const methods = paymentMethods.length > 0 ? paymentMethods : defaultMethods;

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Select Payment Method
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {methods.map((method) => (
                    <motion.div
                        key={method.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => method.available && onSelect(method.id)}
                        className={`
                            relative p-4 rounded-lg border-2 cursor-pointer transition-all
                            ${selectedMethod === method.id
                                ? "border-blue-500 bg-blue-50 shadow-md"
                                : "border-gray-200 hover:border-gray-300 bg-white"
                            }
                            ${!method.available ? "opacity-60 cursor-not-allowed" : ""}
                        `}
                    >
                        {selectedMethod === method.id && (
                            <div className="absolute top-2 right-2">
                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                        )}
                        
                        <div className="flex items-start gap-3">
                            <div className="text-3xl">{method.icon}</div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-gray-900">{method.name}</h4>
                                    {method.comingSoon && (
                                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                            Coming Soon
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{method.description}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

