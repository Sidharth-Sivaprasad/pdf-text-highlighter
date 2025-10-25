"use client";

import { useRef, useEffect } from "react";
import WebViewer, { WebViewerInstance } from "@pdftron/webviewer";
import { useSearch } from "@/context/SearchContext";

export default function PdfViewer() {
	const { file, results } = useSearch();
	const viewer = useRef<HTMLDivElement>(null);
	const instanceRef = useRef<WebViewerInstance | null>(null);
	const isInitialized = useRef(false);

	// Initialize WebViewer once
	useEffect(() => {
		if (viewer.current == null) return;
		if (isInitialized.current) return;

		isInitialized.current = true;

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

				// Load document if file exists
				if (file) {
					await instance.UI.loadDocument(file, { filename: file.name });
				}

				const { documentViewer } = instance.Core;
				documentViewer.addEventListener("documentLoaded", () => {
					console.log("Document loaded successfully");
					if (results?.matches && results.matches.length > 0) {
						addHighlights(instance, results.matches);
					}
				});

				// documentViewer.addEventListener("documentLoaded", () => {
				// 	console.log("Document loaded successfully");
				// 	if (results?.matches && results.matches.length > 0) {
				// 		addHighlights(instance, results.matches);
				// 	}
				// 	// Add highlights after document is loaded
				// });

				// documentViewer.addEventListener("documentLoadFailed", () => {
				// 	console.error("Failed to load document");
				// });
			})
			.catch((err) => {
				console.error("WebViewer initialization error:", err);
				isInitialized.current = false;
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

		try {
			instanceRef.current.UI.loadDocument(file, { filename: file.name });
		} catch (err) {
			console.error("Error loading document:", err);
		}
	}, [file]);

	// Update highlights when results change
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

	// Function to add highlights to the PDF
	const addHighlights = (instance: WebViewerInstance, matches: any[]) => {
		const { documentViewer, annotationManager, Annotations } = instance.Core;

		// Clear existing annotations
		// const existingAnnotations = annotationManager.getAnnotationsList();
		// annotationManager.deleteAnnotations(existingAnnotations);
		console.log(matches);

		// matches.forEach((match) => {
		// 	const pageNumber = match.page;
		// 	const pageInfo = documentViewer.getDocument().getPageInfo(pageNumber);
		// 	if (!pageInfo) {
		// 		console.warn(`Page ${pageNumber} not found`);
		// 		return;
		// 	}

		// 	match.locations.forEach((location: any) => {
		// 		console.log("locations", location);
		// 		try {
		// 			// Create a rectangle annotation (highlight)
		// 			const rect = new Annotations.RectangleAnnotation({
		// 				PageNumber: pageNumber,
		// 				X: location.left,
		// 				Y: location.top,
		// 				Width: location.width,
		// 				Height: location.height,
		// 				StrokeColor: new Annotations.Color(255, 235, 59, 1), // Yellow border
		// 				FillColor: new Annotations.Color(255, 235, 59, 0.3), // Yellow fill
		// 				StrokeThickness: 10,
		// 			});
		// 			console.log("rect", rect);
		// 			annotationManager.addAnnotation(rect);
		// 		} catch (err) {
		// 			console.error(`Error adding highlight on page ${pageNumber}:`, err);
		// 		}
		// 	});
		// });
		matches.forEach((match) => {
			const pageNumber = match.page;
			if (pageNumber !== 1) return;
			const pageInfo = documentViewer.getDocument().getPageInfo(pageNumber);
			if (!pageInfo) {
				console.warn(`Page ${pageNumber} not found`);
				return;
			}

			const pageHeight = pageInfo.height; // used to flip Y coordinate

			match.locations.forEach((location: any) => {
				try {
					const x = (location.left * 72) / 400;
					const y =
						pageHeight -
						(location.top * 72) / 400 -
						(location.height * 72) / 400;
					const width = (location.width * 72) / 400;
					const height = (location.height * 72) / 400;
					console.log(
						"left",
						location.left,
						"top",
						location.top,
						"x",
						x,
						"y",
						y,
						"width",
						width,
						"height",
						height,
						"pageHeight",
						pageHeight,
						"pageWidth",
						pageInfo.width
					);

					const rect = new Annotations.RectangleAnnotation({
						PageNumber: pageNumber,
						X: x,
						Y: y,
						Width: width,
						Height: height,
						StrokeColor: new Annotations.Color(255, 235, 59, 1),
						FillColor: new Annotations.Color(255, 235, 59, 0.3),
						StrokeThickness: 2,
					});

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
		// 	documentViewer.setCurrentPage(matches[0].page);
		// }
	};

	return (
		<div
			className="webviewer h-[900px] w-full rounded-lg shadow-lg overflow-hidden bg-gray-900"
			ref={viewer}
		></div>
	);
}
