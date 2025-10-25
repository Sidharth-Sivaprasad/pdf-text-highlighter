"use client";

import { useEffect } from "react";

export default function Error({
	error,
	reset,
}: {
	error: Error;
	reset: () => void;
}) {
	useEffect(() => {
		console.error("Error caught by Next.js boundary:", error);
	}, [error]);

	return (
		<div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-950 to-slate-950 flex items-center justify-center p-8">
			<div className="flex flex-col items-center justify-center text-center text-gray-300 bg-gray-900/80 rounded-2xl p-10 border border-gray-700 shadow-2xl max-w-md w-full">
				<h2 className="text-2xl font-semibold text-red-400 mb-3">
					Something went wrong
				</h2>
				<p className="text-gray-400 mb-6 text-sm">{error.message}</p>
				<button
					onClick={() => reset()}
					className="px-5 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-all text-white font-medium shadow-md"
				>
					Try again
				</button>
			</div>
		</div>
	);
}
