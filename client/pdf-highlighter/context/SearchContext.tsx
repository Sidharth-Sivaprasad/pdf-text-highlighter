"use client";
import {
	createContext,
	useContext,
	useState,
	ReactNode,
	useEffect,
} from "react";

interface SearchResult {
	success: boolean;
	total_matches: number;
	total_pages: number;
	pages_with_matches: number;
	search_query: string;
	matches: any[];
}

interface UploadHistoryItem {
	fileName: string;
	searchText: string;
	timestamp: string;
	totalMatches?: number;
}

interface SearchContextType {
	file: File | null;
	searchText: string;
	results: SearchResult | null;
	uploadHistory: UploadHistoryItem[];
	setFile: (file: File | null) => void;
	setSearchText: (text: string) => void;
	setResults: (results: SearchResult | null) => void;
	addToHistory: (item: UploadHistoryItem) => void;
	clearHistory: () => void;
	performSearch: (
		file: File,
		searchText: string,
		onProgress?: (percent: number) => void
	) => Promise<SearchResult>;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
	const [file, setFile] = useState<File | null>(null);
	const [searchText, setSearchText] = useState("");
	const [results, setResults] = useState<SearchResult | null>(null);
	const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>([]);

	useEffect(() => {
		const stored = localStorage.getItem("uploadHistory");
		if (stored) {
			try {
				setUploadHistory(JSON.parse(stored));
			} catch (err) {
				console.error("Failed to load upload history:", err);
			}
		}
	}, []);

	useEffect(() => {
		if (uploadHistory.length > 0) {
			localStorage.setItem("uploadHistory", JSON.stringify(uploadHistory));
		}
	}, [uploadHistory]);

	const addToHistory = (item: UploadHistoryItem) => {
		setUploadHistory((prev) => [item, ...prev].slice(0, 10));
	};

	const clearHistory = () => {
		setUploadHistory([]);
		localStorage.removeItem("uploadHistory");
	};

	const performSearch = async (
		file: File,
		searchText: string,
		onProgress?: (percent: number) => void
	): Promise<SearchResult> => {
		const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB
		const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

		// Upload chunks
		for (let i = 0; i < totalChunks; i++) {
			const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
			const formData = new FormData();
			formData.append("chunk", chunk);
			formData.append("index", i.toString());
			formData.append("total", totalChunks.toString());
			formData.append("fileName", file.name);

			const res = await fetch("http://localhost:8000/upload-chunk", {
				method: "POST",
				body: formData,
			});

			if (!res.ok) throw new Error(`Failed to upload chunk ${i}`);

			if (onProgress) onProgress(Math.round(((i + 1) / totalChunks) * 80)); // Up to 80% for upload
		}

		const completeForm = new FormData();
		completeForm.append("fileName", file.name);

		const completeRes = await fetch("http://localhost:8000/upload-complete", {
			method: "POST",
			body: completeForm,
		});
		if (!completeRes.ok) throw new Error("Failed to finalize upload");

		if (onProgress) {
			const target = Math.floor(92 + Math.random() * 8); // random between 92–99
			let progress = 81;

			while (progress < target) {
				progress += Math.floor(Math.random() * 3) + 1; // +1 to +3 each time
				if (progress > target) progress = target;
				onProgress(progress);

				const delay = 300 + Math.random() * 700; // random delay 300–1000ms
				await new Promise((r) => setTimeout(r, delay));
			}

			// Final call (ensures UI shows last value)
			onProgress(target);
		}

		const searchForm = new FormData();
		searchForm.append("fileName", file.name);
		searchForm.append("search_text", searchText);

		const searchRes = await fetch("http://localhost:8000/search", {
			method: "POST",
			body: searchForm,
		});

		const data = await searchRes.json();
		if (!searchRes.ok || !data.success) {
			throw new Error(data.error || "Search failed");
		}

		if (onProgress) onProgress(100);

		setFile(file);
		setSearchText(searchText);
		setResults(data);

		return data;
	};

	return (
		<SearchContext.Provider
			value={{
				file,
				searchText,
				results,
				uploadHistory,
				setFile,
				setSearchText,
				setResults,
				addToHistory,
				clearHistory,
				performSearch,
			}}
		>
			{children}
		</SearchContext.Provider>
	);
}

export function useSearch() {
	const context = useContext(SearchContext);
	if (!context) {
		throw new Error("useSearch must be used within SearchProvider");
	}
	return context;
}
