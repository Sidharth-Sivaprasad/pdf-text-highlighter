"use client";
import { useRouter } from "next/navigation";
import { useSearch } from "@/context/SearchContext";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, Loader2 } from "lucide-react";
import PdfViewer from "@/components/PdfViewer/PdfViewer";
import ContextPanel from "@/components/ContextPanel/ContextPanel";

export default function ResultsPage() {
	const router = useRouter();
	const {
		file,
		searchText: initialSearchText,
		results,
		performSearch,
	} = useSearch();

	const [searchText, setSearchText] = useState(initialSearchText);
	const [processing, setProcessing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [currentStage, setCurrentStage] = useState<string>("");
	const [currentHighlightIndex, setCurrentHighlightIndex] = useState(0);

	useEffect(() => {
		if (!results) {
			router.push("/");
		}
	}, [results, router]);

	if (!results) return null;

	const allHighlights = useMemo(() => {
		const highlights: Array<{
			page: number;
			locations: any[];
			matchIndex: number;
			matchGroup: any;
		}> = [];

		results.matches.forEach((match, matchIndex) => {
			match.locations.forEach((matchGroup: any) => {
				const locationArray = matchGroup.locations;

				highlights.push({
					page: match.page,
					locations: locationArray,
					matchIndex,
					matchGroup,
				});
			});
		});
		return highlights;
	}, [results]);

	const goToPreviousHighlight = () => {
		setCurrentHighlightIndex((prev) =>
			prev > 0 ? prev - 1 : allHighlights.length - 1
		);
	};

	const goToNextHighlight = () => {
		setCurrentHighlightIndex((prev) =>
			prev < allHighlights.length - 1 ? prev + 1 : 0
		);
	};

	const clearHighlight = () => {
		setCurrentHighlightIndex(-1);
	};

	const handleNewSearch = async () => {
		if (!file || !searchText.trim()) {
			setError("Please enter search text");
			return;
		}

		setProcessing(true);
		setError(null);
		setUploadProgress(0);
		setCurrentHighlightIndex(0);

		try {
			setCurrentStage("Preparing new search...");

			await performSearch(file, searchText, (percent) => {
				setUploadProgress(percent);
				if (percent >= 80 && currentStage !== "Analyzing PDF...") {
					setCurrentStage("Analyzing PDF...");
				}
			});

			setCurrentStage("Search complete!");
			setUploadProgress(100);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Search failed");
		} finally {
			setTimeout(() => {
				setProcessing(false);
				setUploadProgress(0);
				setCurrentStage("");
			}, 1000);
		}
	};

	const currentHighlight = useMemo(() => {
		if (currentHighlightIndex === -1) return null;
		if (!allHighlights || allHighlights.length === 0) return null;

		const highlight = allHighlights[currentHighlightIndex];
		if (!highlight) return null;

		return {
			page: highlight.page,
			locations: highlight.locations,
			matchIndex: highlight.matchIndex,
			matchGroup: highlight.matchGroup,
		};
	}, [allHighlights, currentHighlightIndex]);

	return (
		<div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-950 via-amber-950 to-amber-950 p-8 pt-25 antialiased font-sans">
			{processing && (
				<div className="fixed top-0 left-0 right-0 z-50 pt-1 shadow-xl bg-transparent backdrop-blur-sm">
					<div className="max-w-lg mx-auto p-3 rounded-xl bg-blue-900/50 border border-blue-700 text-blue-100">
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
							></div>
						</div>

						<p className="text-xs mt-2 text-blue-300">
							Running search against selected PDF. Do not navigate away.
						</p>
					</div>
				</div>
			)}

			<div className="max-w-7xl mx-auto">
				<div className="flex items-center gap-4 mb-3">
					<button
						onClick={() => router.push("/")}
						className="flex-shrink-0 flex items-center gap-2 text-white hover:text-indigo-400 transition-colors"
					>
						<ArrowLeft className="w-5 h-5" />
					</button>

					<div className="flex-1 bg-slate-500/10 rounded-lg shadow-xl p-3 text-white border border-white/20 backdrop-blur-md">
						<div className="flex gap-3 items-center">
							<input
								type="text"
								value={searchText}
								onChange={(e) => setSearchText(e.target.value)}
								placeholder="Enter new search text..."
								className="flex-1 px-3 py-1 border border-gray-600 rounded-lg bg-gray-900/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
								onKeyUp={(e) => e.key === "Enter" && handleNewSearch()}
							/>
							<button
								onClick={handleNewSearch}
								disabled={processing || !searchText.trim()}
								className="flex-shrink-0 px-4 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center gap-2 transition-colors text-sm"
							>
								{processing ? (
									<>
										<Loader2 className="w-4 h-4 animate-spin" />
										Searching
									</>
								) : (
									<>
										<Search className="w-4 h-4" />
										Search
									</>
								)}
							</button>
						</div>
					</div>
				</div>

				{error && (
					<div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm max-w-7xl mx-auto mb-4">
						{error}
					</div>
				)}

				{/* <div className="bg-slate-500/10 rounded-lg shadow-xl p-3 text-white border border-white/20 backdrop-blur-md mb-6">
					<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
						<div className="flex items-center gap-4 text-sm w-full sm:w-auto">
							<div className="flex items-center gap-2">
								<span className="text-gray-400 font-semibold">File:</span>
								<span className="truncate max-w-[100px] sm:max-w-xs">
									{file?.name || "N/A"}
								</span>
							</div>

							<div className="text-gray-600 hidden sm:block">|</div>
							<div className="flex items-center gap-2">
								<span className="text-gray-400 font-semibold">Matches:</span>
								<span className="font-bold text-indigo-400">
									{results.total_matches}
								</span>
							</div>
							<div className="text-gray-600 hidden sm:block">|</div>
							<div className="flex items-center gap-2">
								<span className="text-gray-400 font-semibold">Pages:</span>
								<span className="font-bold">
									{results.pages_with_matches} / {results.total_pages}
								</span>
							</div>
						</div> 
				{allHighlights.length > 0 && (
							<div className="flex items-center gap-3 border-l border-gray-600 pl-4">
								<button
									onClick={goToPreviousHighlight}
									className="p-1.5 bg-indigo-600 hover:bg-indigo-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									title="Previous highlight"
								>
									<ChevronLeft className="w-4 h-4" />
								</button>
								<div className="text-sm font-medium min-w-[80px] text-center">
									<span className="text-indigo-400">
										{currentHighlightIndex !== -1
											? currentHighlightIndex + 1
											: "-"}
									</span>
									<span className="text-gray-400">
										{" "}
										/ {allHighlights.length}
									</span>
								</div>
								<button
									onClick={goToNextHighlight}
									className="p-1.5 bg-indigo-600 hover:bg-indigo-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									title="Next highlight"
								>
									<ChevronRight className="w-4 h-4" />
								</button>
								<div className="relative group">
									<button
										onClick={clearHighlight}
										className="p-1.5 bg-indigo-600 hover:bg-indigo-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
										title="Clear current highlight"
									>
										<X className="w-4 h-4" />
									</button>

									<div className="absolute left-1/2 transform -translate-x-1/2 -mt-10 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
										Clear Highlight
									</div>
								</div>
							</div>
						)} 
				 </div>
				</div> */}

				{file && (
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
						{/* Context Panel ABOVE PdfViewer on small screens */}
						<div className="order-1 lg:order-2 lg:col-span-1">
							<ContextPanel
								currentHighlight={currentHighlight}
								currentHighlightIndex={currentHighlightIndex}
								totalHighlights={allHighlights.length}
								onPrevious={goToPreviousHighlight}
								onNext={goToNextHighlight}
								onClear={clearHighlight}
								fileName={file?.name}
								totalMatches={results.total_matches}
								pagesWithMatches={results.pages_with_matches}
								totalPages={results.total_pages}
							/>
						</div>

						{/* PdfViewer BELOW on small screens, LEFT on large */}
						<div className="order-2 lg:order-1 lg:col-span-2">
							<PdfViewer currentHighlight={currentHighlight} />
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
