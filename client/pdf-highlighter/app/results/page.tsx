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
		<div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-990 to-slate-950 p-8 pt-20">
			<div className="max-w-4xl mx-auto">
				{/* Back Button */}
				<button
					onClick={() => router.push("/")}
					className="mb-4 flex items-center gap-2 text-white hover:text-indigo-400 transition-colors"
				>
					<ArrowLeft className="w-5 h-5" />
				</button>

				<div className="bg-gray-800/100 rounded-lg shadow-xl p-6 text-white mb-6">
					<h2 className="text-lg font-semibold mb-3">
						Search in: {file?.name}
					</h2>
					<div className="flex gap-3">
						<input
							type="text"
							value={searchText}
							onChange={(e) => setSearchText(e.target.value)}
							placeholder="Enter new search text..."
							className="flex-1 px-4 py-1 border border-gray-600 rounded-lg bg-gray-900/50 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500"
							onKeyUp={(e) => e.key === "Enter" && handleNewSearch()}
						/>
						<button
							onClick={handleNewSearch}
							disabled={processing || !searchText.trim()}
							className="px-6 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
						>
							{processing ? (
								"Searching..."
							) : (
								<>
									<Search className="w-5 h-5" />
									Search
								</>
							)}
						</button>
					</div>
					{error && (
						<div className="mt-3 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
							{error}
						</div>
					)}
				</div>

				{/* <div className="bg-gray-800/100 rounded-lg shadow-xl p-8 text-white mb-6">
					<h1 className="text-3xl font-bold mb-4">Search Results</h1>

					<div className="grid grid-cols-2 gap-4 text-sm">
						<div className="bg-gray-700/50 p-4 rounded-lg">
							<p className="text-gray-400 mb-1">Search Query</p>
							<p className="font-medium">"{results.search_query}"</p>
						</div>

						<div className="bg-gray-700/50 p-4 rounded-lg">
							<p className="text-gray-400 mb-1">Total Matches</p>
							<p className="font-medium text-green-400">
								{results.total_matches}
							</p>
						</div>
						<div className="bg-gray-700/50 p-4 rounded-lg">
							<p className="text-gray-400 mb-1">Pages with Matches</p>
							<p className="font-medium">
								{results.pages_with_matches} / {results.total_pages}
							</p>
						</div>
					</div>
				</div> */}
				{fileUrl && (
					<div className="mb-6">
						<PdfViewer />
					</div>
				)}
			</div>
		</div>
	);
}
