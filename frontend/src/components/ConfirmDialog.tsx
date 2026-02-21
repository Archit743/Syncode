interface ConfirmDialogProps {
	open: boolean;
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	danger?: boolean;
	busy?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

export const ConfirmDialog = ({
	open,
	title,
	message,
	confirmText = "Confirm",
	cancelText = "Cancel",
	danger = false,
	busy = false,
	onConfirm,
	onCancel
}: ConfirmDialogProps) => {
	if (!open) return null;

	return (
		<div
			className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1000] backdrop-blur-sm"
			onClick={onCancel}
		>
			<div
				className="bg-syncode-black border-2 border-white p-8 max-w-[480px] w-[90%] flex flex-col gap-6"
				onClick={(event) => event.stopPropagation()}
			>
				<h2 className="text-base font-normal text-white m-0 tracking-[3px] uppercase font-mono">
					{title}
				</h2>
				<p className="text-xs text-syncode-gray-300 m-0 leading-relaxed tracking-wide font-mono">
					{message}
				</p>
				<div className="flex gap-3 justify-end">
					<button
						className="px-5 py-2.5 text-[11px] font-normal bg-syncode-black text-white border border-white cursor-pointer transition-all duration-200 tracking-widest font-mono uppercase hover:bg-syncode-gray-900 disabled:opacity-50"
						onClick={onCancel}
						disabled={busy}
					>
						{cancelText}
					</button>
					<button
						className={`px-5 py-2.5 text-[11px] font-normal border border-white cursor-pointer transition-all duration-200 tracking-widest font-mono uppercase disabled:opacity-50 ${
							danger ? "bg-white text-black" : "bg-syncode-black text-white hover:bg-syncode-gray-900"
						}`}
						onClick={onConfirm}
						disabled={busy}
					>
						{busy ? "Please wait..." : confirmText}
					</button>
				</div>
			</div>
		</div>
	);
};
