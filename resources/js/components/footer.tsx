import { Link } from '@inertiajs/react';

export default function Footer() {
    return (
        <footer className="border-t bg-white mt-auto">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900 tracking-tight">Invest Kazakhstan</span>
                        <span className="text-sm text-gray-400">© {new Date().getFullYear()}</span>
                    </div>

                    <div className="flex gap-6">
                        <Link href="#" className="text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors">
                            О проекте
                        </Link>
                        <Link href="#" className="text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors">
                            Инвесторам
                        </Link>
                        <Link href="#" className="text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors">
                            Контакты
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
