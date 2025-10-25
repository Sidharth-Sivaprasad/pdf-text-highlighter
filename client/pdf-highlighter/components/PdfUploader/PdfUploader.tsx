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
	const [isDragging, setIsDragging] = useState(false);
	const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

	const validateFile = (selectedFile: File): boolean => {
		if (selectedFile.type !== "application/pdf") {
			setError("Please select a valid PDF file");
			return false;
		}
		if (selectedFile.size > MAX_FILE_SIZE) {
			setError("File is too large. Maximum size is 20 MB.");
			return false;
		}
		return true;
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0] ?? null;
		if (selectedFile && validateFile(selectedFile)) {
			setFile(selectedFile);
			setError(null);
		} else {
			setFile(null);
		}
	};

	const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		if (!processing) {
			setIsDragging(true);
		}
	};

	const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	};

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);

		if (processing) return;

		const droppedFile = e.dataTransfer.files[0];
		if (droppedFile && validateFile(droppedFile)) {
			setFile(droppedFile);
			setError(null);
		} else {
			setFile(null);
		}
	};

	const handleSearch = async () => {
		if (!file || !searchText.trim()) {
			setError("Please provide both a PDF file and search text");
			return;
		}

		setProcessing(true);
		setError("");
		setUploadProgress(0);

		try {
			setCurrentStage("Uploading PDF...");
			const data = await performSearch(file, searchText, (percent) => {
				setUploadProgress(percent);
				if (percent >= 80 && currentStage !== "Analyzing PDF...") {
					setCurrentStage("Analyzing PDF...");
				}
			});

			setCurrentStage("Processing complete!");
			setUploadProgress(100);

			addToHistory({
				fileName: file.name,
				searchText,
				timestamp: new Date().toLocaleString(),
				totalMatches: data.total_matches,
			});

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
		<div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-950 via-amber-950 to-amber-950 p-8 pt-25 antialiased font-sans">
			<div className="max-w-4xl mx-auto">
				<div className=" bg-slate-500/10 rounded-xl shadow-2xl p-8 text-white border border-white/20 backdrop-blur-md">
					<div className="flex items-center gap-3 mb-6">
						<h1 className="text-3xl font-bold text-white">
							Image PDF Text Highlighter
						</h1>
					</div>
					<div className="flex items-center gap-3 mb-8">
						<p className="text-md text-white/80">
							Smarter Search. Faster Insights. Zero Manual Effort.
						</p>
					</div>

					<div className="space-y-6">
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
								<div
									onDragEnter={handleDragEnter}
									onDragOver={handleDragOver}
									onDragLeave={handleDragLeave}
									onDrop={handleDrop}
									className={`flex items-center justify-center w-full px-4 py-8 border-2 border-dashed rounded-lg transition-all ${
										isDragging
											? "border-yellow-800 bg-yellow-600/10 scale-[1.02]"
											: "border-gray-600 bg-gray-900/30"
									} ${
										processing
											? "cursor-not-allowed opacity-50"
											: "cursor-pointer hover:border-indigo-400"
									}`}
								>
									<label
										htmlFor="pdf-upload"
										className="w-full h-full flex items-center justify-center cursor-pointer"
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
												<Upload
													className={`w-12 h-12 mx-auto mb-2 transition-colors ${
														isDragging ? "text-indigo-950" : "text-gray-400"
													}`}
												/>
												<p
													className={`transition-colors ${
														isDragging ? "text-indigo-950" : "text-gray-300"
													}`}
												>
													{isDragging
														? "Drop PDF here"
														: "Click to upload or drag & drop PDF"}
												</p>
												<p className="text-sm text-gray-500 mt-1">
													Up to 300 pages (Max 20MB)
												</p>
											</div>
										)}
									</label>
								</div>
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
									className="px-6 py-1 bg-indigo-700 text-white rounded-lg hover:bg-indigo-600 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center gap-2 transition-colors min-w-[120px] justify-center cursor-pointer"
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
							<div className="p-6  bg-blue-900/30 border border-blue-500 rounded-lg text-blue-100">
								<div className="flex items-center justify-between mb-3">
									<div className="flex items-center gap-3">
										<Loader2 className="w-5 h-5 animate-spin" />
										<p className="font-medium">{currentStage}</p>
									</div>
									<span className="text-sm font-light text-white tracking-wide">
										{uploadProgress}%
									</span>
								</div>

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
				<UploadHistory uploadHistory={uploadHistory} onClear={clearHistory} />
			</div>
		</div>
	);
};

export default PdfUploader;
