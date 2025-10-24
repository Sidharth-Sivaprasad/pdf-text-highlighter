"use client";
import React from "react";
import { FileText, Search } from "lucide-react";

type UploadItem = {
	fileName: string;
	searchText: string;
	timestamp: string;
	totalMatches?: number;
};

type Props = {
	uploadHistory: UploadItem[];
	onClear: () => void;
	onReuse: (searchText: string) => void;
};

const UploadHistory: React.FC<Props> = ({
	uploadHistory,
	onClear,
	onReuse,
}) => {
	return (
		<div className="mt-6 p-6 bg-gray-800/80 rounded-lg shadow text-white">
			<div className="flex items-center justify-between mb-4">
				<h3 className="font-semibold text-lg">Upload History</h3>
				{uploadHistory.length > 0 && (
					<button
						onClick={onClear}
						className="text-sm text-red-400 hover:text-red-300 transition-colors"
					>
						Clear History
					</button>
				)}
			</div>

			{uploadHistory.length === 0 ? (
				<p className="text-gray-400 text-sm text-center py-4">
					No files uploaded yet
				</p>
			) : (
				<div className="space-y-3 max-h-64 overflow-y-auto">
					{uploadHistory.map((item, index) => (
						<div
							key={index}
							className="p-3 bg-gray-700/50 rounded-lg border border-gray-600 hover:bg-gray-700 transition-colors"
						>
							<div className="flex items-start justify-between">
								<div className="flex-1">
									<div className="flex items-center gap-2 mb-1">
										<FileText className="w-4 h-4 text-blue-400" />
										<p className="font-medium text-sm truncate">
											{item.fileName}
										</p>
									</div>
									<p className="text-xs text-gray-400 mb-1">
										Searched for: "{item.searchText}"
									</p>
									<div className="flex items-center gap-3 text-xs text-gray-400">
										<span>{item.timestamp}</span>
										{item.totalMatches !== undefined && (
											<span className="text-green-400">
												{item.totalMatches} match(es) found
											</span>
										)}
									</div>
								</div>
								<button
									onClick={() => onReuse(item.searchText)}
									className="ml-2 p-1 hover:bg-gray-600 rounded transition-colors"
									title="Reuse search text"
								>
									<Search className="w-4 h-4 text-gray-400" />
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default UploadHistory;
