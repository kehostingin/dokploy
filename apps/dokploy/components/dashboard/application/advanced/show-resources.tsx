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

const addResourcesSchema = z.object({
	memoryReservation: z.string().optional(),
	cpuLimit: z.string().optional(),
	memoryLimit: z.string().optional(),
	cpuReservation: z.string().optional(),
});

export type ServiceType =
	| "postgres"
	| "mongo"
	| "redis"
	| "mysql"
	| "mariadb"
	| "application";

interface Props {
	id: string;
	type: ServiceType | "application";
}

type AddResources = z.infer<typeof addResourcesSchema>;
export const ShowResources = ({ id, type }: Props) => {
	const queryMap = {
		postgres: () =>
			api.postgres.one.useQuery({ postgresId: id }, { enabled: !!id }),
		redis: () => api.redis.one.useQuery({ redisId: id }, { enabled: !!id }),
		mysql: () => api.mysql.one.useQuery({ mysqlId: id }, { enabled: !!id }),
		mariadb: () =>
			api.mariadb.one.useQuery({ mariadbId: id }, { enabled: !!id }),
		application: () =>
			api.application.one.useQuery({ applicationId: id }, { enabled: !!id }),
		mongo: () => api.mongo.one.useQuery({ mongoId: id }, { enabled: !!id }),
	};
	const { data, refetch } = queryMap[type]
		? queryMap[type]()
		: api.mongo.one.useQuery({ mongoId: id }, { enabled: !!id });

	const mutationMap = {
		postgres: () => api.postgres.update.useMutation(),
		redis: () => api.redis.update.useMutation(),
		mysql: () => api.mysql.update.useMutation(),
		mariadb: () => api.mariadb.update.useMutation(),
		application: () => api.application.update.useMutation(),
		mongo: () => api.mongo.update.useMutation(),
	};

	const { mutateAsync, isLoading } = mutationMap[type]
		? mutationMap[type]()
		: api.mongo.update.useMutation();

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
			mongoId: id || "",
			postgresId: id || "",
			redisId: id || "",
			mysqlId: id || "",
			mariadbId: id || "",
			applicationId: id || "",
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
					If you want to decrease or increase the resources to a specific.
					application or database
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<AlertBlock type="info">
					Please remember to click Redeploy after modify the resources to apply
					the changes.
				</AlertBlock>
				<Form {...form}>
					<form
						id="hook-form"
						onSubmit={form.handleSubmit(onSubmit)}
						className="grid w-full gap-8 "
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
