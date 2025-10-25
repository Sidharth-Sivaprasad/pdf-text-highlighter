"use client";
import { useRouter } from "next/navigation";
import { useSearch } from "@/context/SearchContext";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import PdfViewer from "@/components/PdfViewer/PdfViewer";

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

	useEffect(() => {
		if (!results) {
			router.push("/");
		}
	}, [results, router]);

	// Render null while redirecting
	if (!results) return null;

	// Allow searching again with same file
	const handleNewSearch = async () => {
		if (!file || !searchText.trim()) {
			setError("Please enter search text");
			return;
		}

		setProcessing(true);
		setError(null);

		try {
			await performSearch(file, searchText);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Search failed");
		} finally {
			setProcessing(false);
		}
	};

	const fileUrl = useMemo(() => {
		return file ? URL.createObjectURL(file) : null;
	}, [file]);

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-950 via-amber-950 to-amber-950 p-8 pt-25 antialiased font-sans">
			<div className="max-w-4xl mx-auto">
				{/* Header (Back Button and Search Bar) */}
				<div className="flex items-center gap-4 mb-3">
					{/* Back Button */}
					<button
						onClick={() => router.push("/")}
						className="flex-shrink-0 flex items-center gap-2 text-white hover:text-indigo-400 transition-colors"
					>
						<ArrowLeft className="w-5 h-5" />
					</button>

					{/* Search Component (Sleek and Compact) */}
					<div className="flex-1 bg-slate-500/10 rounded-lg shadow-xl p-3 text-white border border-white/20 backdrop-blur-md">
						<div className="flex gap-3 items-center">
							<input
								type="text"
								value={searchText}
								onChange={(e) => setSearchText(e.target.value)}
								placeholder="Enter new search text..."
								className="flex-1 px-3 py-1 border border-gray-600 rounded-lg bg-gray-900/50 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500"
								onKeyUp={(e) => e.key === "Enter" && handleNewSearch()}
							/>
							<button
								onClick={handleNewSearch}
								disabled={processing || !searchText.trim()}
								className="flex-shrink-0 px-4 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center gap-2 transition-colors text-sm"
							>
								{processing ? (
									"Searching..."
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
					<div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm max-w-lg mx-auto mb-4">
						{error}
					</div>
				)}

				{/* NEW: Search Statistics Box */}
				<div className="bg-slate-500/10 rounded-lg shadow-xl p-3 text-white border border-white/20 backdrop-blur-md mb-6">
					<div className="flex items-center gap-4 text-sm">
						{/* 1. Document Name (Truncated) */}
						<div className="flex items-center gap-2">
							<span className="text-gray-400 font-semibold">File:</span>
							<span className="truncate max-w-xs">{file?.name || "N/A"}</span>
						</div>
						<div className="text-gray-600">|</div> {/* Separator */}
						{/* 2. Total Matches */}
						<div className="flex items-center gap-2">
							<span className="text-gray-400 font-semibold">Matches:</span>
							<span className="font-bold text-indigo-400">
								{results.total_matches}
							</span>
						</div>
						<div className="text-gray-600">|</div> {/* Separator */}
						{/* 3. Pages Found */}
						<div className="flex items-center gap-2">
							<span className="text-gray-400 font-semibold">Pages:</span>
							<span className="font-bold">
								{results.pages_with_matches} / {results.total_pages}
							</span>
						</div>
						<div className="text-gray-600">|</div> {/* Separator */}
					</div>
				</div>

				{fileUrl && (
					<div className="mb-6">
						<PdfViewer />
					</div>
				)}
			</div>
		</div>
	);
}
