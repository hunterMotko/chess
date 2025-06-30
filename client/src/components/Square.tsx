import React from 'react'
import './square.css';

export type SquareValue = 'P' | 'R' | 'N' | 'B' | 'Q' | 'K' | null;

interface SquareProps {
	value: SquareValue;
	onClick: () => void;
	isLightSquare: boolean;
}

export default function Square({ value, onClick, isLightSquare }: SquareProps) {
	const color = isLightSquare ? 'light-square' : 'dark-square';
	return (
		<button className={`square ${color}`} onClick={onClick}>
			{value}
		</button>
	);
};

