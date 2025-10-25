"use client";

import { useRef, useEffect, useState } from "react";
import WebViewer, { WebViewerInstance } from "@pdftron/webviewer";
import { useSearch } from "@/context/SearchContext";
import { Loader2 } from "lucide-react";

interface HighlightLocation {
	left: number;
	top: number;
	width: number;
	height: number;
	context?: string;
	matched_text?: string;
}

interface CurrentHighlight {
	page: number;
	matchIndex: number;
	location: HighlightLocation;
}

interface PdfViewerProps {
	currentHighlight?: CurrentHighlight | null;
}

export default function PdfViewer({ currentHighlight }: PdfViewerProps) {
	const { file, results } = useSearch();
	const viewer = useRef<HTMLDivElement>(null);
	const instanceRef = useRef<WebViewerInstance | null>(null);
	const isInitialized = useRef(false);
	const DPI = 300; // DPI is not used in this component, but kept here.

	const [isViewerLoading, setIsViewerLoading] = useState(true);
	console.log("Current Highlight in PdfViewer:", currentHighlight);

	useEffect(() => {
		if (viewer.current == null) return;
		if (isInitialized.current) return;

		isInitialized.current = true;
		// Start loading status when initialization begins
		setIsViewerLoading(true);

		WebViewer(
			{
				path: "lib/webviewer",
				licenseKey: process.env.NEXT_PUBLIC_PDFTRON_LICENSE_KEY || "",
				initialDoc: undefined,
			},
			viewer.current
		)
			.then(async (instance) => {
				instanceRef.current = instance;

				// Set dark theme
				instance.UI.setTheme("dark");

				const { documentViewer } = instance.Core;

				documentViewer.addEventListener("documentLoaded", () => {
					console.log("Document loaded successfully");
					setIsViewerLoading(false);

					if (results?.matches && results.matches.length > 0) {
						addHighlights(instance, results.matches);
					}
				});

				// Load document if file exists
				if (file) {
					await instance.UI.loadDocument(file, { filename: file.name });
				} else {
					// If no initial file, stop loading (or wait for file change)
					setIsViewerLoading(false);
				}

				documentViewer.addEventListener("documentLoadFailed", () => {
					console.error("Failed to load document");
					setIsViewerLoading(false);
				});
			})
			.catch((err) => {
				console.error("WebViewer initialization error:", err);
				isInitialized.current = false;
				setIsViewerLoading(false); // Stop loading on error
			});

		return () => {
			if (instanceRef.current) {
				try {
					instanceRef.current.UI.dispose();
				} catch (err) {
					console.error("Error disposing WebViewer:", err);
				}
			}
		};
	}, []);

	// Load document when file changes
	useEffect(() => {
		if (!instanceRef.current || !file) return;

		setIsViewerLoading(true); // Start loading when a new file is loaded
		try {
			// Note: The 'documentLoaded' listener handles setting setIsViewerLoading(false)
			instanceRef.current.UI.loadDocument(file, { filename: file.name });
		} catch (err) {
			console.error("Error loading document:", err);
			setIsViewerLoading(false);
		}
	}, [file]);

	useEffect(() => {
		if (!instanceRef.current) return;

		const { documentViewer, annotationManager, Annotations } =
			instanceRef.current.Core;

		if (!documentViewer.getDocument()) return;

		if (!currentHighlight) {
			try {
				// Remove previous overlay highlight (if any)
				const existing = annotationManager
					.getAnnotationsList()
					.filter((a) => a.Author === "CurrentHighlight");

				if (existing.length > 0) {
					annotationManager.deleteAnnotations(existing, {
						force: true,
					});
				}
			} catch (err) {
				console.error("Error removing current highlight overlay:", err);
			}
			return;
		}

		const { page, location } = currentHighlight;

		// Jump to the target page
		documentViewer.setCurrentPage(page, true);

		try {
			// Remove previous overlay highlight (if any)
			const existing = annotationManager
				.getAnnotationsList()
				.filter((a) => a.Author === "CurrentHighlight");

			if (existing.length > 0) {
				annotationManager.deleteAnnotations(existing, {
					force: true,
				});
			}

			// Create new overlay highlight
			const x = (location.left * 72) / 300;
			const y = (location.top * 72) / 300;
			const width = (location.width * 72) / 300;
			const height = (location.height * 72) / 300;

			const highlight = new Annotations.RectangleAnnotation({
				PageNumber: page,
				X: x,
				Y: y,
				Width: width,
				Height: height,
				StrokeColor: new Annotations.Color(255, 0, 0), // red border
				FillColor: new Annotations.Color(255, 0, 0, 0.15), // semi-transparent fill
				StrokeThickness: 1,
				Opacity: 0.6,
			});

			// Mark this as the temporary “current highlight”
			highlight.Author = "CurrentHighlight";

			annotationManager.addAnnotation(highlight);
			annotationManager.drawAnnotationsFromList([highlight]);
		} catch (err) {
			console.error("Error adding current highlight overlay:", err);
		}
	}, [currentHighlight]);

	useEffect(() => {
		if (!instanceRef.current || !results?.matches) return;

		const { documentViewer } = instanceRef.current.Core;

		// Wait for document to be ready
		if (documentViewer.getDocument()) {
			addHighlights(instanceRef.current, results.matches);
		}
	}, [results]);

	// Function to add highlights to the PDF (unchanged)
	const addHighlights = (instance: WebViewerInstance, matches: any[]) => {
		const { documentViewer, annotationManager, Annotations } = instance.Core;

		// Clear existing annotations
		const existingAnnotations = annotationManager.getAnnotationsList();
		annotationManager.deleteAnnotations(existingAnnotations);
		console.log(matches);

		if (matches.length === 0) return;

		matches.forEach((match) => {
			const pageNumber = match.page;
			const pageInfo = documentViewer.getDocument().getPageInfo(pageNumber);
			if (!pageInfo) {
				console.warn(`Page ${pageNumber} not found`);
				return;
			}

			match.locations.forEach((location: any) => {
				try {
					const x = (location.left * 72) / DPI;
					const y_top_in_points = (location.top * 72) / DPI;
					const y = y_top_in_points;
					const width = (location.width * 72) / DPI;
					const height = (location.height * 72) / DPI;

					const rect = new Annotations.RectangleAnnotation({
						PageNumber: pageNumber,
						X: x,
						Y: y,
						Width: width,
						Height: height,
						StrokeColor: new Annotations.Color(242, 89, 18),
						// FillColor: new Annotations.Color(255, 235, 59, 0),
						Intensity: 0.1,
						StrokeThickness: 1,
					});
					rect.FillColor = new Annotations.Color(255, 255, 153, 10);
					rect.Opacity = 0.3;

					annotationManager.addAnnotation(rect);
				} catch (err) {
					console.error(`Error adding highlight on page ${pageNumber}:`, err);
				}
			});
		});

		// Redraw annotations
		annotationManager.drawAnnotationsFromList(
			annotationManager.getAnnotationsList()
		);

		// Jump to first highlight
		if (matches.length > 0 && matches[0].page) {
			documentViewer.setCurrentPage(matches[0].page, true);
		}
	};

	return (
		<div className="relative h-[900px] w-full rounded-lg shadow-lg overflow-hidden bg-gray-900">
			{/* The WebViewer container */}
			<div className="webviewer h-full w-full" ref={viewer}></div>

			{/* The Loader Overlay */}
			{isViewerLoading && (
				<div className="absolute inset-0 flex items-center justify-center bg-gray-900/70 backdrop-blur-sm z-10">
					<div className="flex flex-col items-center text-white">
						<Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
						<p className="mt-3 text-lg">Loading Document...</p>
					</div>
				</div>
			)}
		</div>
	);
}
