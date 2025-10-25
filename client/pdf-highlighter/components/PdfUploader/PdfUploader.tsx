"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { useSearch } from "@/context/SearchContext";
import UploadHistory from "@/components/UploadHistory/UploadHistory";

const PdfUploader: React.FC = () => {
	const router = useRouter();
	const {
		file,
		searchText,
		setFile,
		setSearchText,
		uploadHistory,
		addToHistory,
		clearHistory,
		performSearch,
	} = useSearch();

	const [processing, setProcessing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [currentStage, setCurrentStage] = useState<string>("");
	const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0] ?? null;
		if (selectedFile && selectedFile.type === "application/pdf") {
			setFile(selectedFile);
			setError(null);
		} else {
			setFile(null);
			setError("Please select a valid PDF file");
		}
	};

	const handleSearch = async () => {
		if (!file || !searchText.trim()) {
			setError("Please provide both a PDF file and search text");
			return;
		}
		// ask if this check is needed
		if (file.size > MAX_FILE_SIZE) {
			setError("File is too large. Maximum size is 20 MB.");
			return;
		}
		setProcessing(true);
		setError("");
		setUploadProgress(0);

		try {
			// Stage 1: Upload
			setCurrentStage("Uploading PDF...");
			const data = await performSearch(file, searchText, (percent) => {
				setUploadProgress(percent);
				if (percent >= 80 && currentStage !== "Analyzing PDF...") {
					setCurrentStage("Analyzing PDF...");
				}
			});

			// Stage 2: Processing complete
			setCurrentStage("Processing complete!");
			setUploadProgress(100);

			addToHistory({
				fileName: file.name,
				searchText,
				timestamp: new Date().toLocaleString(),
				totalMatches: data.total_matches,
			});

			// Navigate to results page after brief delay
			setTimeout(() => {
				router.push("/results");
			}, 500);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to process PDF. Make sure the backend server is running on port 8000."
			);
		} finally {
			setTimeout(() => {
				setProcessing(false);
				setUploadProgress(0);
				setCurrentStage("");
			}, 1000);
		}
	};

	const clearFile = () => {
		setFile(null);
		setError("");
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-990 to-slate-950 p-8 pt-20">
			<div className="max-w-4xl mx-auto">
				{/* Main Box */}
				<div className="bg-gray-800/100 rounded-lg shadow-xl p-8 text-white">
					<div className="flex items-center gap-3 mb-8">
						<h1 className="text-3xl font-bold text-white">
							Image PDF Text Highlighter
						</h1>
					</div>

					<div className="space-y-6">
						{/* File Upload */}
						<div>
							<label className="block text-sm font-medium text-gray-200 mb-2">
								Upload PDF (Scanned Images)
							</label>
							<div className="relative">
								<input
									type="file"
									accept=".pdf"
									onChange={handleFileChange}
									className="hidden"
									id="pdf-upload"
									disabled={processing}
								/>
								<label
									htmlFor="pdf-upload"
									className={`flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-600 rounded-lg ${
										processing
											? "cursor-not-allowed opacity-50"
											: "cursor-pointer hover:border-indigo-500"
									} transition-colors bg-gray-900/30`}
								>
									{file ? (
										<div className="flex items-center gap-3">
											<FileText className="w-6 h-6 text-indigo-400" />
											<span className="text-white">{file.name}</span>
											{!processing && (
												<button
													onClick={(e) => {
														e.preventDefault();
														clearFile();
													}}
													className="ml-2 p-1 hover:bg-gray-700 rounded"
												>
													<X className="w-4 h-4 text-gray-400" />
												</button>
											)}
										</div>
									) : (
										<div className="text-center">
											<Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
											<p className="text-gray-300">Click to upload PDF</p>
											<p className="text-sm text-gray-500 mt-1">
												Up to 300 pages.
											</p>
											{/* no checks for page limits */}
										</div>
									)}
								</label>
							</div>
						</div>

						{/* Search Input */}
						<div>
							<label className="block text-sm font-medium text-gray-200 mb-2">
								Search Text
							</label>
							<div className="flex gap-3">
								<input
									type="text"
									value={searchText}
									onChange={(e) => setSearchText(e.target.value)}
									placeholder="Enter the excerpt to search for..."
									className="flex-1 px-4 py-1 border border-gray-600 rounded-lg bg-gray-900/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
									onKeyUp={(e) =>
										e.key === "Enter" && !processing && handleSearch()
									}
									disabled={processing}
								/>
								<button
									onClick={handleSearch}
									disabled={processing || !file || !searchText.trim()}
									className="
    px-6 py-1 
    bg-indigo-700 
    text-white 
    rounded-lg 
    hover:bg-indigo-600 
    disabled:bg-gray-500 
    disabled:cursor-not-allowed 
    flex items-center gap-2 
    transition-colors 
    min-w-[120px] 
    justify-center 
    cursor-pointer
  "
								>
									{processing ? (
										<>
											<Loader2 className="w-5 h-5 animate-spin" />
											Processing
										</>
									) : (
										"Search"
									)}
								</button>
							</div>
						</div>

						{/* Error Message */}
						{error && (
							<div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
								{error}
							</div>
						)}

						{/* Progress Bar */}
						{processing && (
							<div className="p-6 bg-blue-900/50 border border-blue-500 rounded-lg text-blue-100">
								{/* Stage row */}
								<div className="flex items-center justify-between mb-3">
									<div className="flex items-center gap-3">
										<Loader2 className="w-5 h-5 animate-spin" />
										<p className="font-medium">{currentStage}</p>
									</div>
									<span className="text-sm font-light text-white tracking-wide">
										{uploadProgress}%
									</span>
								</div>

								{/* Progress Bar */}
								<div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
									<div
										className="bg-gradient-to-r from-indigo-500 to-blue-500 h-full transition-all duration-500 ease-out rounded-full shadow-lg"
										style={{ width: `${uploadProgress}%` }}
									></div>
								</div>

								<p className="text-sm mt-3">
									{uploadProgress < 100
										? "Uploading and processing PDF with OCR. This may take several minutes for large PDFs."
										: "Finalizing results..."}
								</p>
							</div>
						)}
					</div>
				</div>

				{/* Upload History */}
				<UploadHistory
					uploadHistory={uploadHistory}
					onClear={clearHistory}
					// onReuse={(text: string) => setSearchText(text)}
				/>
			</div>
		</div>
	);
};

export default PdfUploader;
