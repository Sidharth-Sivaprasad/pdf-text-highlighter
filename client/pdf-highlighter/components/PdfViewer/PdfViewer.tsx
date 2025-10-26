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
	locations: HighlightLocation[];
	matchGroup?: any;
}

interface PdfViewerProps {
	currentHighlight?: CurrentHighlight | null;
}

export default function PdfViewer({ currentHighlight }: PdfViewerProps) {
	const { file, results } = useSearch();
	const viewer = useRef<HTMLDivElement>(null);
	const instanceRef = useRef<WebViewerInstance | null>(null);
	const isInitialized = useRef(false);
	const DPI = 300;

	const [isViewerLoading, setIsViewerLoading] = useState(true);

	useEffect(() => {
		if (viewer.current == null) return;
		if (isInitialized.current) return;

		isInitialized.current = true;
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

				instance.UI.setTheme("dark");

				const { documentViewer } = instance.Core;

				documentViewer.addEventListener("documentLoaded", () => {
					console.log("Document loaded successfully");
					setIsViewerLoading(false);

					if (results?.matches && results.matches.length > 0) {
						addHighlights(instance, results.matches);
					}
				});

				if (file) {
					await instance.UI.loadDocument(file, { filename: file.name });
				} else {
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
				setIsViewerLoading(false);
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

	useEffect(() => {
		if (!instanceRef.current || !file) return;

		setIsViewerLoading(true);
		try {
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
				const existing = annotationManager
					.getAnnotationsList()
					.filter((a) => a.Author === "CurrentHighlight");

				if (existing.length > 0) {
					annotationManager.deleteAnnotations(existing, {
						force: true,
					});
					annotationManager.drawAnnotationsFromList(
						annotationManager.getAnnotationsList()
					);
				}
			} catch (err) {
				console.error("Error removing current highlight overlay:", err);
			}
			return;
		}

		const { page, locations } = currentHighlight;

		documentViewer.setCurrentPage(page, true);

		try {
			const existing = annotationManager
				.getAnnotationsList()
				.filter((a) => a.Author === "CurrentHighlight");

			if (existing.length > 0) {
				annotationManager.deleteAnnotations(existing, {
					force: true,
				});
			}

			locations.forEach((location) => {
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
					StrokeColor: new Annotations.Color(255, 0, 0),
					FillColor: new Annotations.Color(255, 0, 0, 0.15),
					StrokeThickness: 2,
					Opacity: 0.7,
				});

				highlight.Author = "CurrentHighlight";
				annotationManager.addAnnotation(highlight);
			});
			annotationManager.drawAnnotationsFromList(
				annotationManager.getAnnotationsList()
			);
		} catch (err) {
			console.error("Error adding current highlight overlay:", err);
		}
	}, [currentHighlight]);

	useEffect(() => {
		if (!instanceRef.current) return;

		const { documentViewer, annotationManager } = instanceRef.current.Core;

		if (!documentViewer.getDocument()) return;

		// Clear existing highlights if no results
		if (!results?.matches || results.matches.length === 0) {
			const existingAnnotations = annotationManager.getAnnotationsList();
			annotationManager.deleteAnnotations(existingAnnotations);
			annotationManager.drawAnnotationsFromList([]);
			return;
		}

		// Add highlights if results exist
		addHighlights(instanceRef.current, results.matches);
	}, [results]);

	const addHighlights = (instance: WebViewerInstance, matches: any[]) => {
		const { documentViewer, annotationManager, Annotations } = instance.Core;

		// Clear existing annotations
		const existingAnnotations = annotationManager.getAnnotationsList();
		annotationManager.deleteAnnotations(existingAnnotations);
		console.log("Matches structure:", matches);

		if (matches.length === 0) return;

		matches.forEach((match) => {
			const pageNumber = match.page;
			const pageInfo = documentViewer.getDocument().getPageInfo(pageNumber);
			if (!pageInfo) {
				console.warn(`Page ${pageNumber} not found`);
				return;
			}

			match.locations.forEach((matchGroup: any) => {
				const locationArray = matchGroup.locations; //made a change here,check if error occurs

				locationArray.forEach((location: any) => {
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
							Intensity: 0.1,
							StrokeThickness: 1,
						});
						// rect.FillColor = new Annotations.Color(255, 255, 153, 10);
						rect.FillColor = new Annotations.Color(202, 92, 0, 10);

						rect.Opacity = 0.3;

						annotationManager.addAnnotation(rect);
					} catch (err) {
						console.error(`Error adding highlight on page ${pageNumber}:`, err);
					}
				});
			});
		});

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
			<div className="webviewer h-full w-full" ref={viewer}></div>

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
