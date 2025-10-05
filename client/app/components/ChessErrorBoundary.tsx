import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
interface Props {
	children?: ReactNode;
	gameId?: string;
	onGameReset?: () => void;
}

interface State {
	hasError: boolean;
	error?: Error;
	errorInfo?: ErrorInfo;
}

export class ChessErrorBoundary extends Component<Props, State> {
	public state: State = {
		hasError: false
	};

	public static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error('Chess game error:', error, errorInfo);
		this.setState({ errorInfo });

		// Report specific chess game errors
		if (error.message.includes('chess') || error.message.includes('WebSocket')) {
			console.error('Chess-specific error detected:', {
				gameId: this.props.gameId,
				error: error.message,
				stack: error.stack,
				componentStack: errorInfo.componentStack
			});
		}
	}

	private handleRetry = () => {
		this.setState({ hasError: false, error: undefined, errorInfo: undefined });
	};

	private handleGameReset = () => {
		this.props.onGameReset?.();
		this.setState({ hasError: false, error: undefined, errorInfo: undefined });
	};

	public render() {
		if (this.state.hasError) {
			const isWebSocketError = this.state.error?.message.includes('WebSocket') ||
									this.state.error?.message.includes('socket');
			const isChessError = this.state.error?.message.includes('chess') ||
								this.state.error?.message.includes('move');

			return (
				<div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
					<div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-lg w-full">
						<div className="flex items-center mb-4">
							<div className="text-yellow-400 text-2xl mr-3">♟️</div>
							<h2 className="text-white text-lg font-semibold">Chess Game Error</h2>
						</div>

						<p className="text-gray-300 text-sm mb-4">
							{isWebSocketError && "There was a connection issue with the game server."}
							{isChessError && "There was an issue with the chess game logic."}
							{!isWebSocketError && !isChessError && "An unexpected error occurred in the chess game."}
						</p>

						{this.state.error && (
							<div className="bg-gray-900 rounded p-3 mb-4">
								<p className="text-red-400 text-xs font-mono">
									{this.state.error.message}
								</p>
							</div>
						)}

						<div className="flex flex-col sm:flex-row gap-3">
							<button
								onClick={this.handleRetry}
								className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded text-sm transition-colors"
							>
								Try Again
							</button>

							{this.props.onGameReset && (
								<button
									onClick={this.handleGameReset}
									className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 px-4 rounded text-sm transition-colors"
								>
									Reset Game
								</button>
							)}

							<button
								onClick={() => window.location.href = '/'}
								className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded text-sm transition-colors"
							>
								Go Home
							</button>
						</div>

						{this.props.gameId && (
							<p className="text-gray-500 text-xs mt-4 text-center">
								Game ID: {this.props.gameId}
							</p>
						)}
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}