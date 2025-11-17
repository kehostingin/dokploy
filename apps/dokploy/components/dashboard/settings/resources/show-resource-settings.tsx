"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ResourceSliderField } from "@/components/dashboard/shared/resource-slider-field";
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

const resourceSchema = z.object({
	globalMemoryReservation: z.string().optional(),
	globalMemoryLimit: z.string().optional(),
	globalCpuReservation: z.string().optional(),
	globalCpuLimit: z.string().optional(),
});

type ResourceForm = z.infer<typeof resourceSchema>;

export const ShowResourceSettings = () => {
	const { data, refetch } = api.resourceSettings.get.useQuery();
	const { mutateAsync, isLoading } = api.resourceSettings.update.useMutation();

	const form = useForm<ResourceForm>({
		resolver: zodResolver(resourceSchema),
		defaultValues: {
			globalMemoryReservation: "256",
			globalMemoryLimit: "1024",
			globalCpuReservation: "0.5",
			globalCpuLimit: "1",
		},
	});

	useEffect(() => {
		if (data) {
			form.reset({
				globalMemoryReservation: data.globalMemoryReservation || "256",
				globalMemoryLimit: data.globalMemoryLimit || "1024",
				globalCpuReservation: data.globalCpuReservation || "0.5",
				globalCpuLimit: data.globalCpuLimit || "1",
			});
		}
	}, [data, form]);

	const onSubmit = async (values: ResourceForm) => {
		await mutateAsync(values)
			.then(async () => {
				toast.success("Global resource limits updated successfully");
				await refetch();
			})
			.catch(() => {
				toast.error("Error updating resource limits");
			});
	};

	return (
		<div className="flex flex-col gap-4">
			<Card className="bg-background">
				<CardHeader>
					<CardTitle className="text-xl">Global Resource Limits</CardTitle>
					<CardDescription>
						Set default resource limits for all new services. These defaults
						will be automatically applied when creating new applications,
						databases, or compose services. You can override these values in
						each service's advanced settings.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
							<div className="grid gap-6">
								<FormField
									control={form.control}
									name="globalMemoryReservation"
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
									name="globalMemoryLimit"
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
									name="globalCpuReservation"
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
									name="globalCpuLimit"
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
								<Button type="submit" isLoading={isLoading}>
									Save Changes
								</Button>
							</div>
						</form>
					</Form>
				</CardContent>
			</Card>

			<Card className="bg-background">
				<CardHeader>
					<CardTitle className="text-xl">Important Notes</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<h4 className="font-medium">Reservation vs Limit</h4>
						<p className="text-sm text-muted-foreground">
							<strong>Reservation</strong> is the minimum guaranteed resources.{" "}
							<strong>Limit</strong> is the maximum allowed resources. Services
							can burst above reservation up to the limit if resources are
							available.
						</p>
					</div>
					<div className="space-y-2">
						<h4 className="font-medium">When Changes Apply</h4>
						<p className="text-sm text-muted-foreground">
							These defaults only apply to <strong>new services</strong> created
							after saving. Existing services keep their current resource
							limits. You can modify individual service limits in their Advanced
							settings.
						</p>
					</div>
					<div className="space-y-2">
						<h4 className="font-medium">Recommendations by Service Type</h4>
						<ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
							<li>
								<strong>Small apps:</strong> 256 MB reservation, 512 MB limit
							</li>
							<li>
								<strong>Databases:</strong> 512 MB reservation, 2 GB limit
							</li>
							<li>
								<strong>Production workloads:</strong> 1 GB reservation, 4 GB
								limit
							</li>
						</ul>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};
