"use client";
import {
	createContext,
	useContext,
	useState,
	ReactNode,
	useEffect,
	useRef,
} from "react";

interface MatchLocation {
	page: number;
	locations: any[];
}

interface SearchResult {
	success: boolean;
	total_matches: number;
	total_pages: number;
	pages_with_matches: number;
	search_query: string;
	matches: MatchLocation[];
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

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

export function SearchProvider({ children }: { children: ReactNode }) {
	const [file, setFile] = useState<File | null>(null);
	const [searchText, setSearchText] = useState("");
	const [results, setResults] = useState<SearchResult | null>(null);
	const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>([]);
	const cache = useRef<Record<string, SearchResult>>({});

	// --- Memory leak prevention ---
	const cancelRef = useRef(false);
	useEffect(() => {
		cancelRef.current = false;
		return () => {
			cancelRef.current = true;
		};
	}, []);

	// Load upload history from localStorage
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

	// Persist upload history
	useEffect(() => {
		localStorage.setItem("uploadHistory", JSON.stringify(uploadHistory));
	}, [uploadHistory]);

	const addToHistory = (item: UploadHistoryItem) => {
		setUploadHistory((prev) => [item, ...prev].slice(0, 10));
	};

	const clearHistory = () => {
		setUploadHistory([]);
		localStorage.removeItem("uploadHistory");
	};

	const hashFile = async (file: File) => {
		const buffer = await file.arrayBuffer();
		const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
		return Array.from(new Uint8Array(hashBuffer))
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
	};

	const uploadFile = async (
		file: File,
		onProgress?: (percent: number) => void
	) => {
		const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB
		const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
		let lastProgress = 0;

		for (let i = 0; i < totalChunks; i++) {
			if (cancelRef.current) throw new Error("Upload cancelled"); // <-- memory safe

			const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
			const formData = new FormData();
			formData.append("chunk", chunk);
			formData.append("index", i.toString());
			formData.append("total", totalChunks.toString());
			formData.append("fileName", file.name);

			const res = await fetch(`${BASE_URL}/upload-chunk`, {
				method: "POST",
				body: formData,
			});
			if (!res.ok) throw new Error(`Failed to upload chunk ${i}`);

			if (onProgress) {
				const progress = Math.round(((i + 1) / totalChunks) * 80);
				if (progress - lastProgress >= 2) {
					onProgress(progress);
					lastProgress = progress;
				}
			}
		}

		const completeForm = new FormData();
		completeForm.append("fileName", file.name);
		const completeRes = await fetch(`${BASE_URL}/upload-complete`, {
			method: "POST",
			body: completeForm,
		});
		if (!completeRes.ok) throw new Error("Failed to finalize upload");
	};

	const runSearch = async (
		file: File,
		searchText: string,
		onProgress?: (percent: number) => void
	) => {
		if (cancelRef.current) throw new Error("Search cancelled"); // <-- memory safe

		const searchForm = new FormData();
		searchForm.append("fileName", file.name);
		searchForm.append("search_text", searchText);

		const res = await fetch(`${BASE_URL}/search`, {
			method: "POST",
			body: searchForm,
		});
		const data = await res.json();
		if (!res.ok || !data.success)
			throw new Error(data.error || "Search failed");

		if (onProgress) onProgress(100);

		return data as SearchResult;
	};

	const performSearch = async (
		file: File,
		searchText: string,
		onProgress?: (percent: number) => void
	): Promise<SearchResult> => {
		const fileHash = await hashFile(file);
		const cacheKey = `${fileHash}-${searchText}`;

		if (cache.current[cacheKey]) {
			if (onProgress) onProgress(100);
			setResults(cache.current[cacheKey]);
			setFile(file);
			setSearchText(searchText);
			return cache.current[cacheKey];
		}

		// Upload & search
		await uploadFile(file, onProgress);

		// Simulate analysis progress
		if (onProgress) {
			let progress = 81;
			const target = 92 + Math.floor(Math.random() * 8);
			while (progress < target) {
				if (cancelRef.current) throw new Error("Search cancelled");
				progress += Math.floor(Math.random() * 3) + 1;
				if (progress > target) progress = target;
				onProgress(progress);
				await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
			}
			onProgress(target);
		}

		const data = await runSearch(file, searchText, onProgress);

		if (!cancelRef.current) {
			const MAX_CACHE_ENTRIES = 10;
			cache.current[cacheKey] = data;
			const keys = Object.keys(cache.current);
			if (keys.length > MAX_CACHE_ENTRIES) {
				delete cache.current[keys[0]];
			}

			setFile(file);
			setSearchText(searchText);
			setResults(data);
		}

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
	if (!context) throw new Error("useSearch must be used within SearchProvider");
	return context;
}
