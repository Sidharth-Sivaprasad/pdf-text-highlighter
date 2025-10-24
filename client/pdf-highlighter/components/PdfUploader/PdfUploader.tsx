"use client";
import React, { useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import UploadHistory from "@/components/UploadHistory/UploadHistory";

const PdfUploader: React.FC = () => {
	const [searchText, setSearchText] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const [processing, setProcessing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [results, setResults] = useState<any>(null);
	const [uploadHistory, setUploadHistory] = useState<
		Array<{
			fileName: string;
			searchText: string;
			timestamp: string;
			totalMatches?: number;
		}>
	>([]);

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

		setProcessing(true);
		setError("");
		setResults(null);

		const formData = new FormData();
		formData.append("pdf", file);
		formData.append("search_text", searchText);

		try {
			const response = await fetch("http://localhost:8000/search", {
				method: "POST",
				body: formData,
			});

			const data = await response.json();
			if (!response.ok || !data.success) {
				throw new Error(data.error || "Search failed");
			}

			setResults(data);
			setUploadHistory((prev) =>
				[
					{
						fileName: file.name,
						searchText,
						timestamp: new Date().toLocaleString(),
						totalMatches: data.total_matches,
					},
					...prev,
				].slice(0, 10)
			);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to process PDF. Make sure the backend server is running on port 8000."
			);
		} finally {
			setProcessing(false);
		}
	};

	const clearFile = () => {
		setFile(null);
		setResults(null);
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
								/>
								<label
									htmlFor="pdf-upload"
									className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 transition-colors"
								>
									{file ? (
										<div className="flex items-center gap-3">
											<FileText className="w-6 h-6 text-indigo-600" />
											<span className="text-gray-700">{file.name}</span>
											<button
												onClick={(e) => {
													e.preventDefault();
													clearFile();
												}}
												className="ml-2 p-1 hover:bg-gray-100 rounded"
											>
												<X className="w-4 h-4 text-gray-500" />
											</button>
										</div>
									) : (
										<div className="text-center">
											<Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
											<p className="text-gray-600">Click to upload PDF</p>
											<p className="text-sm text-gray-400 mt-1">
												Up to 300 pages
											</p>
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
									className="flex-1 px-4 py-3 border border-gray-600 rounded-lg bg-gray-900/50 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
								/>
								<button
									onClick={handleSearch}
									disabled={processing || !file || !searchText.trim()}
									className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
								>
									{processing ? "Processing..." : "Search"}
								</button>
							</div>
						</div>

						{/* Error Message */}
						{error && (
							<div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
								{error}
							</div>
						)}

						{/* Processing Info */}
						{processing && (
							<div className="p-6 bg-blue-900/50 border border-blue-500 rounded-lg text-blue-100">
								<p className="font-medium mb-1">Processing PDF with OCR...</p>
								<p className="text-sm">
									This may take several minutes for large PDFs. The backend is
									extracting text and searching for matches.
								</p>
							</div>
						)}
					</div>
				</div>

				{/* Upload History */}
				<UploadHistory
					uploadHistory={uploadHistory}
					onClear={() => setUploadHistory([])}
					onReuse={(text: any) => setSearchText(text)}
				/>
			</div>
		</div>
	);
};

export default PdfUploader;
