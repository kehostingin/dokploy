import {
	bytesToMb,
	coresToNanoseconds,
	mbToBytes,
	nanosecondsToCores,
} from "@dokploy/server/utils/resources/conversions";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ResourceSliderField } from "@/components/dashboard/shared/resource-slider-field";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Form, FormField } from "@/components/ui/form";
import { api } from "@/utils/api";

interface Props {
	composeId: string;
}

const addResourcesSchema = z.object({
	memoryReservation: z.string().optional(),
	cpuLimit: z.string().optional(),
	memoryLimit: z.string().optional(),
	cpuReservation: z.string().optional(),
});

type AddResources = z.infer<typeof addResourcesSchema>;

export const ShowComposeResources = ({ composeId }: Props) => {
	const { data, refetch } = api.compose.one.useQuery(
		{ composeId },
		{ enabled: !!composeId },
	);

	const { mutateAsync, isLoading } = api.compose.update.useMutation();

	const form = useForm<AddResources>({
		defaultValues: {
			cpuLimit: "",
			cpuReservation: "",
			memoryLimit: "",
			memoryReservation: "",
		},
		resolver: zodResolver(addResourcesSchema),
	});

	useEffect(() => {
		if (data) {
			form.reset({
				cpuLimit: data?.cpuLimit
					? nanosecondsToCores(data.cpuLimit)
					: undefined,
				cpuReservation: data?.cpuReservation
					? nanosecondsToCores(data.cpuReservation)
					: undefined,
				memoryLimit: data?.memoryLimit
					? bytesToMb(data.memoryLimit)
					: undefined,
				memoryReservation: data?.memoryReservation
					? bytesToMb(data.memoryReservation)
					: undefined,
			});
		}
	}, [data, form, form.reset]);

	const onSubmit = async (formData: AddResources) => {
		await mutateAsync({
			composeId,
			cpuLimit: formData.cpuLimit
				? coresToNanoseconds(formData.cpuLimit)
				: null,
			cpuReservation: formData.cpuReservation
				? coresToNanoseconds(formData.cpuReservation)
				: null,
			memoryLimit: formData.memoryLimit
				? mbToBytes(formData.memoryLimit)
				: null,
			memoryReservation: formData.memoryReservation
				? mbToBytes(formData.memoryReservation)
				: null,
		})
			.then(async () => {
				toast.success("Resources Updated");
				await refetch();
			})
			.catch(() => {
				toast.error("Error updating the resources");
			});
	};

	return (
		<Card className="bg-background">
			<CardHeader>
				<CardTitle className="text-xl">Resources</CardTitle>
				<CardDescription>
					Configure resource limits for this compose service
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<AlertBlock type="info">
					Please remember to click Redeploy after modifying the resources to
					apply the changes.
				</AlertBlock>
				<Form {...form}>
					<form
						id="hook-form"
						onSubmit={form.handleSubmit(onSubmit)}
						className="grid w-full gap-8"
					>
						<div className="grid w-full gap-6">
							<FormField
								control={form.control}
								name="memoryReservation"
								render={({ field }) => (
									<ResourceSliderField
										field={field}
										label="Memory Reservation"
										unit="MB"
										min={64}
										max={8192}
										step={64}
										defaultValue="256"
										tooltip="Soft memory limit. Container can use more if available."
										description="Minimum guaranteed memory. Recommended: 64-512 MB"
									/>
								)}
							/>

							<FormField
								control={form.control}
								name="memoryLimit"
								render={({ field }) => (
									<ResourceSliderField
										field={field}
										label="Memory Limit"
										unit="MB"
										min={128}
										max={16384}
										step={128}
										defaultValue="1024"
										tooltip="Hard memory limit. Container will be killed if exceeded."
										description="Maximum allowed memory. Recommended: 512-2048 MB"
									/>
								)}
							/>

							<FormField
								control={form.control}
								name="cpuReservation"
								render={({ field }) => (
									<ResourceSliderField
										field={field}
										label="CPU Reservation"
										unit="cores"
										min={0.1}
										max={4.0}
										step={0.1}
										defaultValue="0.5"
										tooltip="Soft CPU limit. Container can use more if available."
										description="Minimum guaranteed CPU. Recommended: 0.1-1.0 cores"
										decimalPlaces={1}
									/>
								)}
							/>

							<FormField
								control={form.control}
								name="cpuLimit"
								render={({ field }) => (
									<ResourceSliderField
										field={field}
										label="CPU Limit"
										unit="cores"
										min={0.25}
										max={8.0}
										step={0.25}
										defaultValue="1"
										tooltip="Hard CPU limit. Container cannot exceed this."
										description="Maximum allowed CPU. Recommended: 0.5-2.0 cores"
										decimalPlaces={2}
									/>
								)}
							/>
						</div>
						<div className="flex w-full justify-end">
							<Button isLoading={isLoading} type="submit">
								Save
							</Button>
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
};
