import { FileText, ChevronLeft, ChevronRight, X } from "lucide-react";

interface ContextPanelProps {
	currentHighlight: {
		page: number;
		locations: any[];
		matchIndex: number;
		matchGroup: any;
	} | null;
	currentHighlightIndex: number;
	totalHighlights: number;
	onPrevious: () => void;
	onNext: () => void;
	onClear: () => void;
	fileName?: string;
	totalMatches: number;
	pagesWithMatches: number;
	totalPages: number;
}

export default function ContextPanel({
	currentHighlight,
	currentHighlightIndex,
	totalHighlights,
	onPrevious,
	onNext,
	onClear,
	fileName,
	totalMatches,
	pagesWithMatches,
	totalPages,
}: ContextPanelProps) {
	return (
		<div className="bg-slate-500/10 rounded-lg shadow-xl p-4 text-white border border-white/20 backdrop-blur-md sticky top-8">
			{/* File Stats Section */}
			<div className="mb-4 pb-3 border-b border-gray-700">
				<div className="space-y-2 text-sm">
					<div className="flex items-center gap-2">
						<span className="text-gray-400 font-semibold">File:</span>
						<span className="truncate flex-1" title={fileName}>
							{fileName || "N/A"}
						</span>
					</div>
					<div className="flex items-center justify-between gap-4">
						<div className="flex items-center gap-2">
							<span className="text-gray-400 font-semibold">
								Total Matches:
							</span>
							<span className="font-bold text-indigo-400">{totalMatches}</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-gray-400 font-semibold">
								Matched Pages:
							</span>
							<span className="font-bold">
								{pagesWithMatches} / {totalPages}
							</span>
						</div>
					</div>
				</div>
			</div>

			<div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700">
				<div className="flex items-center gap-2">
					{/* <FileText className="w-5 h-5 text-indigo-400" /> */}
					<h3 className="font-regular text-base sm:text-lg md:text-lg">
						Current Match
					</h3>
				</div>

				{/* Navigation Controls */}
				{totalHighlights > 0 && (
					<div className="flex items-center gap-2">
						<button
							onClick={onPrevious}
							className="p-1.5 bg-indigo-600 hover:bg-indigo-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							title="Previous highlight"
						>
							<ChevronLeft className="w-4 h-4" />
						</button>
						<div className="text-xs font-medium min-w-[60px] text-center">
							<span className="text-indigo-400">
								{currentHighlightIndex !== -1 ? currentHighlightIndex + 1 : "-"}
							</span>
							<span className="text-gray-400"> / {totalHighlights}</span>
						</div>
						<button
							onClick={onNext}
							className="p-1.5 bg-indigo-600 hover:bg-indigo-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							title="Next highlight"
						>
							<ChevronRight className="w-4 h-4" />
						</button>
						<button
							onClick={onClear}
							className="p-1.5 bg-indigo-600 hover:bg-indigo-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-1"
							title="Clear current highlight"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				)}
			</div>

			{currentHighlight && currentHighlight.matchGroup ? (
				<div className="space-y-4">
					{/* Page Info */}
					<div className="bg-gray-900/50 rounded-lg p-3">
						<div className="text-xs text-gray-400 mb-1">Location</div>
						<div className="text-sm">
							<span className="font-semibold text-indigo-400">
								Page {currentHighlight.page}
							</span>
							<span className="text-gray-500 mx-2">•</span>
							<span className="text-gray-300">
								Match {currentHighlightIndex + 1} of {totalHighlights}
							</span>
						</div>
					</div>

					{/* Matched Text */}
					{currentHighlight.matchGroup.matched_text && (
						<div className="bg-gray-900/50 rounded-lg p-3">
							<div className="text-xs text-gray-400 mb-2">Matched Text</div>
							<div className="text-sm font-medium text-amber-500 bg-amber-900/20 px-2 py-1 rounded">
								"{currentHighlight.matchGroup.matched_text}"
							</div>
						</div>
					)}

					{/* Context */}
					{currentHighlight.matchGroup.context && (
						<div className="bg-gray-900/50 rounded-lg p-3">
							<div className="text-xs text-gray-400 mb-2">Context</div>
							<div className="text-sm text-gray-300 leading-relaxed">
								{currentHighlight.matchGroup.context
									.split(
										new RegExp(
											`(${currentHighlight.matchGroup.matched_text})`,
											"gi"
										)
									)
									.map((part: string, index: number) => {
										const isMatch =
											part.toLowerCase() ===
											currentHighlight.matchGroup.matched_text.toLowerCase();
										return isMatch ? (
											<span
												key={index}
												className="text-amber-500 bg-amber-900/20 font-semibold px-1 rounded"
											>
												{part}
											</span>
										) : (
											<span key={index}>{part}</span>
										);
									})}
							</div>
						</div>
					)}

					{/* Number of Lines */}
					<div className="bg-gray-900/50 rounded-lg p-3">
						<div className="text-xs text-gray-400 mb-1">Details</div>
						<div className="text-sm text-gray-300">
							<span className="font-semibold">
								{currentHighlight.locations.length}
							</span>{" "}
							line{currentHighlight.locations.length !== 1 ? "s" : ""}{" "}
							highlighted
						</div>
					</div>
				</div>
			) : (
				<div className="text-center py-8 text-gray-400">
					<FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
					<p className="text-sm">No match selected</p>
					<p className="text-xs mt-1">
						Navigate through matches to see details
					</p>
				</div>
			)}
		</div>
	);
}
