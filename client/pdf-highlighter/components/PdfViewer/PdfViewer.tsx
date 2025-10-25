"use client";

import { useRef, useEffect, useState } from "react"; // ADDED useState
import WebViewer, { WebViewerInstance } from "@pdftron/webviewer";
import { useSearch } from "@/context/SearchContext";
import { Loader2 } from "lucide-react"; // ADDED Loader icon

export default function PdfViewer() {
	const { file, results } = useSearch();
	const viewer = useRef<HTMLDivElement>(null);
	const instanceRef = useRef<WebViewerInstance | null>(null);
	const isInitialized = useRef(false);
	const DPI = 300; // DPI is not used in this component, but kept here.

	// ADDED State to track viewer loading status
	const [isViewerLoading, setIsViewerLoading] = useState(true);

	// Initialize WebViewer once
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
					// Document is ready, stop the main loader
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

	// Update highlights when results change
	// This is fast, so we don't need a loader specific to highlights,
	// but we ensure the document is loaded first.
	useEffect(() => {
		if (
			!instanceRef.current ||
			!results?.matches ||
			results.matches.length === 0
		)
			return;

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
		// if (matches.length > 0 && matches[0].page) {
		//  documentViewer.setCurrentPage(matches[0].page);
		// }
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
