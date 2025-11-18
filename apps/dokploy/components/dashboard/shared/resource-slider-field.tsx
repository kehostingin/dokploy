import { InfoIcon } from "lucide-react";
import type { ControllerRenderProps, FieldValues, Path } from "react-hook-form";
import {
	FormControl,
	FormDescription,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface ResourceSliderFieldProps<T extends FieldValues> {
	field: ControllerRenderProps<T, Path<T>>;
	label: string;
	unit: string;
	min: number;
	max: number;
	step: number;
	defaultValue: string | number;
	tooltip: string;
	description: string;
	decimalPlaces?: number;
}

export function ResourceSliderField<T extends FieldValues>({
	field,
	label,
	unit,
	min,
	max,
	step,
	defaultValue,
	tooltip,
	description,
	decimalPlaces = 0,
}: ResourceSliderFieldProps<T>) {
	const formatValue = (value: number) => {
		return decimalPlaces > 0 ? value.toFixed(decimalPlaces) : value.toString();
	};

	return (
		<FormItem>
			<div
				className="flex items-center gap-2"
				onClick={(e) => e.preventDefault()}
			>
				<FormLabel>
					{label} ({unit})
				</FormLabel>
				<TooltipProvider>
					<Tooltip delayDuration={0}>
						<TooltipTrigger>
							<InfoIcon className="h-4 w-4 text-muted-foreground" />
						</TooltipTrigger>
						<TooltipContent>
							<p>{tooltip}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
			<FormDescription>{description}</FormDescription>
			<div className="flex gap-4 items-center pt-2">
				<FormControl>
					<Slider
						min={min}
						max={max}
						step={step}
						value={[Number.parseFloat(field.value || defaultValue.toString())]}
						onValueChange={(value) =>
							field.onChange(formatValue(value[0] ?? 0))
						}
						className="flex-1"
					/>
				</FormControl>
				<div className="flex items-center gap-2 w-36">
					<Input
						type="number"
						min={min}
						max={max}
						step={step}
						className="w-24"
						value={field.value || ""}
						onChange={(e) => field.onChange(e.target.value)}
					/>
					<span className="text-sm text-muted-foreground">{unit}</span>
				</div>
			</div>
			<FormMessage />
		</FormItem>
	);
}
