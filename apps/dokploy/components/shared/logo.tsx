import { cn } from "@/lib/utils";

interface Props {
	className?: string;
	logoUrl?: string;
	text?: boolean;
}

export const Logo = ({
	className = "size-14",
	logoUrl,
	text = false,
}: Props) => {
	const logoContent = logoUrl ? (
		// biome-ignore lint/performance/noImgElement: this is for dynamic logo loading
		<img
			src={logoUrl}
			alt="Organization Logo"
			className={cn(className, "object-contain rounded-sm")}
		/>
	) : (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			xmlnsXlink="http://www.w3.org/1999/xlink"
			data-name="Layer 2"
			viewBox="0 0 511.6 512"
			className={className}
		>
			<defs>
				<linearGradient
					id="a"
					x1="91.14"
					x2="289.4"
					y1="304.85"
					y2="100.7"
					gradientUnits="userSpaceOnUse"
				>
					<stop offset="0" stopColor="#37eaef" />
					<stop offset=".77" stopColor="#3d3da8" />
				</linearGradient>
				<linearGradient
					xlinkHref="#a"
					id="b"
					x1="152.19"
					x2="350.45"
					y1="364.14"
					y2="159.99"
				/>
				<linearGradient
					xlinkHref="#a"
					id="c"
					x1="150.61"
					x2="348.88"
					y1="362.61"
					y2="158.46"
				/>
				<linearGradient
					xlinkHref="#a"
					id="d"
					x1="212.28"
					x2="410.54"
					y1="422.5"
					y2="218.34"
				/>
			</defs>
			<g data-name="Layer 1">
				<path
					d="m274.34 128.1 11.55 11.55c6.94 6.94 8.45 15.43 3.18 19.11l-104.73 73.11c-10.69 7.46-28.36 5.29-38.9-5.24l-17.54-17.54z"
					fill="url(#a)"
				/>
				<path
					d="m343.43 146.29 21.21 21.21-52.3 59.09-13.2-13.2c-7.93-7.93-10-18.28-4.82-22.93z"
					fill="url(#b)"
				/>
				<path
					d="m258.58 222.62 14.55 14.55c8.74 8.74 12.01 20.29 7.08 26.04l-87.38 101.94-45.34-45.34 111.08-97.2Z"
					fill="url(#c)"
				/>
				<path
					d="m383.7 237.46-11.55-11.55c-6.94-6.94-15.43-8.44-19.09-3.17L280.1 327.63c-7.45 10.71-5.26 28.39 5.27 38.93l17.54 17.54z"
					fill="url(#d)"
				/>
				<path d="M0 0h511.6v512H0z" fill="none" />
			</g>
		</svg>
	);

	if (text) {
		return (
			<div className="flex items-center">
				{logoContent}
				<span
					className="text-xl font-semibold tracking-tight text-foreground"
					style={{ fontFamily: "'Funnel Display', sans-serif" }}
				>
					Kehosting.in
				</span>
			</div>
		);
	}

	return logoContent;
};
