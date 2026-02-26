import { Link } from '@inertiajs/react';

export default function Footer() {
    return (
        <footer className="mt-auto border-t border-gray-100 bg-white">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 sm:flex-row sm:px-6 lg:px-8">
                <div className="flex items-center gap-2">
                    <img
                        src="/assets/images/logo-2.png"
                        alt="Turkistan Invest"
                        className="h-5 shrink-0 opacity-60"
                    />
                    <span className="text-xs font-semibold tracking-wide text-[#0f1b3d]/60">
                        TURKISTAN INVEST
                    </span>
                    <span className="text-xs text-gray-300">
                        © {new Date().getFullYear()}
                    </span>
                </div>
                <div className="flex gap-5">
                        <Link
                            href="/investment-projects"
                            className="text-xs font-medium text-gray-400 transition-colors hover:text-[#0f1b3d]"
                        >
                            О проекте
                        </Link>
                    {/* <Link
                        href="#"
                        className="text-xs font-medium text-gray-400 transition-colors hover:text-[#0f1b3d]"
                    >
                        Инвесторам
                    </Link>
                    <Link
                        href="#"
                        className="text-xs font-medium text-gray-400 transition-colors hover:text-[#0f1b3d]"
                    >
                        Контакты
                    </Link> */}
                </div>
            </div>
        </footer>
    );
}
