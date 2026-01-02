import { CreditCard, CheckCircle } from 'lucide-react';

export function Billing() {
    const billingInfo = {
        plan: 'Professional',
        status: 'Active',
        renewalDate: '2024-02-15',
        amount: '$29/month',
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Billing</h2>
                <p className="text-sm font-medium text-gray-500 mt-2">
                    Current subscription and payment information.
                </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-8">
                <div className="flex items-start gap-6">
                    <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600">
                        <CreditCard className="h-8 w-8" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                            <h3 className="text-xl font-black text-gray-900">{billingInfo.plan} Plan</h3>
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-black uppercase tracking-wider rounded-full">
                                <CheckCircle className="h-3 w-3" />
                                {billingInfo.status}
                            </span>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                <span className="text-sm font-medium text-gray-500">Amount</span>
                                <span className="text-sm font-bold text-gray-900">{billingInfo.amount}</span>
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                <span className="text-sm font-medium text-gray-500">Next Renewal</span>
                                <span className="text-sm font-bold text-gray-900">
                                    {new Date(billingInfo.renewalDate).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-3">
                                <span className="text-sm font-medium text-gray-500">Payment Method</span>
                                <span className="text-sm font-bold text-gray-900">•••• 4242</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 leading-relaxed">
                        Your subscription will automatically renew on the date shown above.
                        For plan changes or cancellation, please contact support.
                    </p>
                </div>
            </div>
        </div>
    );
}
