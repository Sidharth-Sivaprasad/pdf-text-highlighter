import React from "react";

type Props = {
	title?: string;
};

const Header: React.FC<Props> = ({ title = "PDF Text Highlighter" }) => {
	return (
		<header className="absolute top-0 left-0 w-full z-50  bg-transparent backdrop-blur-md px-6 py-4 flex items-center justify-between transition-opacity duration-500 hover:opacity-100 opacity-70">
			<div className="flex items-center gap-3">
				<svg
					width="28"
					height="28"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					aria-hidden
				>
					<rect
						x="3"
						y="4"
						width="14"
						height="16"
						rx="2"
						stroke="#3a00adff"
						strokeWidth="1.5"
					/>
					<path
						d="M17 7V5"
						stroke="#3a00adff"
						strokeWidth="1.5"
						strokeLinecap="round"
					/>
					<path
						d="M7 9H13"
						stroke="#ab3003ff"
						strokeWidth="1.5"
						strokeLinecap="round"
					/>
					<path
						d="M7 13H13"
						stroke="#3b82f6"
						strokeWidth="1.5"
						strokeLinecap="round"
					/>
					<path
						d="M7 17H11"
						stroke="#3b82f6"
						strokeWidth="1.5"
						strokeLinecap="round"
					/>
				</svg>
				<h1 className="text-lg font-normal text-white select-none pointer-events-none">
					{title}
				</h1>
			</div>
		</header>
	);
};

export default Header;
