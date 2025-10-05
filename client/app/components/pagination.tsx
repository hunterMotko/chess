interface PaginationProps {
	curPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
}

export default function Pagination({ curPage, totalPages, onPageChange }: PaginationProps) {
	const isPrevDisabled = curPage <= 1;
	const isNextDisabled = curPage >= totalPages;
	const pagesArr = getPageNumbers(curPage, totalPages)
	const prevBtnClass = isPrevDisabled
		? 'bg-gray-700 text-gray-500 cursor-not-allowed'
		: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-colors duration-200';

	const nextBtnClass = isNextDisabled
		? 'bg-gray-700 text-gray-500 cursor-not-allowed'
		: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-colors duration-200'

	function isCurPage(curPage: number, page: number) {
		return curPage === page
			? 'bg-indigo-500 text-white shadow-md'
			: 'bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors duration-200'
	}

	return (
		<nav className="flex items-center justify-center space-x-2 my-8">
			<button
				onClick={() => onPageChange(curPage - 1)}
				disabled={isPrevDisabled}
				className={
					`px-4 py-2 rounded-md font-medium text-sm ${prevBtnClass}`
				}
			>
				Previous
			</button>

			{pagesArr.map((page, index) => (
				<div key={index}>
					{typeof page === 'number' ? (
						<button
							onClick={() => onPageChange(page)}
							className={
								`px-4 py-2 rounded-md font-medium text-sm ${isCurPage(curPage, page)}`
							}
						>
							{page}
						</button>
					) : (
						<span className="px-4 py-2 text-gray-400">
							{page}
						</span>
					)}
				</div>
			))}

			<button
				onClick={() => onPageChange(curPage + 1)}
				disabled={isNextDisabled}
				className={`px-4 py-2 rounded-md font-medium text-sm ${nextBtnClass}`}
			>
				Next
			</button>
		</nav>
	);
};

function getPageNumbers(curPage: number, totalPages: number): (number | string)[] {
	const pageNumbers: (number | string)[] = [];
	const maxPages = 5;
	if (totalPages > 0) {
		pageNumbers.push(1);
	}
	if (curPage > maxPages - 1 && totalPages > maxPages) {
		pageNumbers.push('...');
	}
	let start = Math.max(2, curPage - Math.floor(maxPages / 2) + (maxPages % 2 === 0 ? 0 : 1));
	let end = Math.min(totalPages - 1, curPage + Math.floor(maxPages / 2));
	if (curPage < maxPages - 1) {
		end = Math.min(totalPages - 1, maxPages - 1);
	}
	if (curPage > totalPages - (maxPages - 1)) {
		start = Math.max(2, totalPages - (maxPages - 1));
	}
	for (let i = start; i <= end; i++) {
		if (i > 1 && i < totalPages) {
			pageNumbers.push(i);
		}
	}
	if (curPage < totalPages - (maxPages - 2) && totalPages > maxPages) {
		pageNumbers.push('...');
	}
	if (totalPages > 1 && !pageNumbers.includes(totalPages)) {
		pageNumbers.push(totalPages);
	}
	return pageNumbers;
};
