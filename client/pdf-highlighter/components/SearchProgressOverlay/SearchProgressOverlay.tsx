"use client";

import { Loader2 } from "lucide-react";

interface SearchProgressOverlayProps {
	processing: boolean;
	currentStage: string;
	uploadProgress: number;
}

export default function SearchProgressOverlay({
	processing,
	currentStage,
	uploadProgress,
}: SearchProgressOverlayProps) {
	if (!processing) return null;

	return (
		<div className="fixed top-0 left-0 right-0 z-50 pt-1 shadow-xl bg-transparent backdrop-blur-sm">
			<div className="max-w-lg mx-auto p-3 rounded-xl bg-indigo-900/30 border border-indigo-500 text-blue-100">
				<div className="flex items-center justify-between mb-3">
					<div className="flex items-center gap-3">
						<Loader2 className="w-5 h-5 animate-spin text-blue-300" />
						<p className="font-medium">{currentStage}</p>
					</div>
					<span className="text-sm font-light text-white tracking-wide">
						{uploadProgress}%
					</span>
				</div>

				<div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
					<div
						className="bg-gradient-to-r from-indigo-500 to-blue-500 h-full transition-all duration-500 ease-out rounded-full shadow-lg"
						style={{ width: `${uploadProgress}%` }}
					/>
				</div>

				<p className="text-xs mt-2 text-blue-300">
					Running search against selected PDF. Do not navigate away.
				</p>
			</div>
		</div>
	);
}
