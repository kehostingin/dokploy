import { zodResolver } from "@hookform/resolvers/zod";
import {
	Cloud,
	FileCode,
	HardDrive,
	PenBoxIcon,
	PlusIcon,
	ServerIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AlertBlock } from "@/components/shared/alert-block";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { api } from "@/utils/api";
import { S3_PROVIDERS } from "./constants";

// Simple flexible schema for all providers
const destinationSchema = z.object({
	name: z.string().min(1, "Name is required"),
	providerType: z.string().min(1, "Provider type is required"),
	// S3 fields
	provider: z.string().optional(),
	accessKeyId: z.string().optional(),
	secretAccessKey: z.string().optional(),
	bucket: z.string().optional(),
	region: z.string().optional(),
	endpoint: z.string().optional(),
	// FTP/SFTP fields
	host: z.string().optional(),
	port: z.coerce.number().optional(),
	user: z.string().optional(),
	pass: z.string().optional(),
	keyPem: z.string().optional(),
	tls: z.boolean().optional(),
	// Custom config
	customConfig: z.string().optional(),
	serverId: z.string().optional(),
});

type Destination = z.infer<typeof destinationSchema>;

interface Props {
	destinationId?: string;
}

// Provider icons and names
const PROVIDER_INFO: Record<
	string,
	{ icon: React.ReactNode; name: string; description: string }
> = {
	s3: {
		icon: <Cloud className="size-4" />,
		name: "S3 Compatible",
		description: "AWS S3, MinIO, Cloudflare R2, DigitalOcean Spaces, etc.",
	},
	ftp: {
		icon: <ServerIcon className="size-4" />,
		name: "FTP/FTPS",
		description: "File Transfer Protocol server",
	},
	sftp: {
		icon: <ServerIcon className="size-4" />,
		name: "SFTP",
		description: "SSH File Transfer Protocol",
	},
	custom: {
		icon: <FileCode className="size-4" />,
		name: "Custom rclone",
		description: "Custom rclone configuration snippet",
	},
};

export const HandleDestinationsV2 = ({ destinationId }: Props) => {
	const [open, setOpen] = useState(false);
	const [selectedProvider, setSelectedProvider] = useState<string>("s3");
	const utils = api.useUtils();
	const { data: isCloud } = api.settings.isCloud.useQuery();

	const { mutateAsync, isError, error, isLoading } = destinationId
		? api.destination.update.useMutation()
		: api.destination.create.useMutation();

	const { data: destination } = api.destination.one.useQuery(
		{ destinationId: destinationId || "" },
		{ enabled: !!destinationId, refetchOnWindowFocus: false },
	);

	const form = useForm<Destination>({
		defaultValues: {
			name: "",
			providerType: "s3",
			provider: "",
			accessKeyId: "",
			secretAccessKey: "",
			bucket: "",
			region: "",
			endpoint: "",
			host: "",
			port: undefined,
			user: "",
			pass: "",
			keyPem: "",
			tls: false,
			customConfig: "",
			serverId: "",
		},
		resolver: zodResolver(destinationSchema),
	});

	// Load destination data when editing
	useEffect(() => {
		if (destination) {
			const providerType = destination.providerType || "s3";
			setSelectedProvider(providerType);

			// Parse rcloneConfig if present
			let rcloneData: any = {};
			if (destination.rcloneConfig) {
				try {
					rcloneData = JSON.parse(destination.rcloneConfig);
				} catch (e) {
					console.error("Failed to parse rclone config:", e);
				}
			}

			form.reset({
				name: destination.name,
				providerType,
				// S3 fields (legacy)
				provider: destination.provider || rcloneData.provider || "",
				accessKeyId:
					destination.accessKey || rcloneData.accessKeyId || "",
				secretAccessKey:
					destination.secretAccessKey ||
					rcloneData.secretAccessKey ||
					"",
				bucket: destination.bucket || rcloneData.bucket || "",
				region: destination.region || rcloneData.region || "",
				endpoint: destination.endpoint || rcloneData.endpoint || "",
				// FTP/SFTP fields
				host: rcloneData.host || "",
				port: rcloneData.port,
				user: rcloneData.user || "",
				pass: rcloneData.pass || "",
				keyPem: rcloneData.keyPem || "",
				tls: rcloneData.tls || false,
				// Custom config
				customConfig: destination.customConfig || "",
			});
		}
	}, [destination, form]);

	const onSubmit = async (data: Destination) => {
		try {
			// Build rcloneConfig based on provider type
			let rcloneConfig: Record<string, any> = {};

			if (data.providerType === "s3") {
				// For S3, use legacy fields if present, otherwise build rclone config
				if (data.accessKeyId && data.secretAccessKey && data.bucket) {
					// Legacy S3 - pass through as-is
					await mutateAsync({
						name: data.name,
						providerType: "s3",
						provider: data.provider,
						accessKey: data.accessKeyId,
						secretAccessKey: data.secretAccessKey,
						bucket: data.bucket,
						region: data.region,
						endpoint: data.endpoint,
						destinationId: destinationId || "",
					});
				}
			} else if (data.providerType === "ftp") {
				rcloneConfig = {
					host: data.host,
					port: data.port || 21,
					user: data.user,
					pass: data.pass,
					tls: data.tls,
				};
				await mutateAsync({
					name: data.name,
					providerType: "ftp",
					rcloneConfig: JSON.stringify(rcloneConfig),
					destinationId: destinationId || "",
				});
			} else if (data.providerType === "sftp") {
				rcloneConfig = {
					host: data.host,
					port: data.port || 22,
					user: data.user,
					pass: data.pass,
					keyPem: data.keyPem,
				};
				await mutateAsync({
					name: data.name,
					providerType: "sftp",
					rcloneConfig: JSON.stringify(rcloneConfig),
					destinationId: destinationId || "",
				});
			} else if (data.providerType === "custom") {
				await mutateAsync({
					name: data.name,
					providerType: "custom",
					customConfig: data.customConfig,
					destinationId: destinationId || "",
				});
			}

			toast.success(`Destination ${destinationId ? "Updated" : "Created"}`);
			await utils.destination.all.invalidate();
			setOpen(false);
		} catch (error) {
			toast.error(
				`Error ${destinationId ? "Updating" : "Creating"} destination`,
			);
		}
	};

	// Watch provider type changes
	const watchedProviderType = form.watch("providerType");
	useEffect(() => {
		if (watchedProviderType) {
			setSelectedProvider(watchedProviderType);
		}
	}, [watchedProviderType]);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{destinationId ? (
					<Button
						variant="ghost"
						size="icon"
						className="group hover:bg-blue-500/10"
					>
						<PenBoxIcon className="size-3.5 text-primary group-hover:text-blue-500" />
					</Button>
				) : (
					<Button className="cursor-pointer space-x-3">
						<PlusIcon className="h-4 w-4" />
						Add Destination
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{destinationId ? "Update" : "Add"} Backup Destination
					</DialogTitle>
					<DialogDescription>
						Configure a backup destination to store your database and application
						backups securely.
					</DialogDescription>
				</DialogHeader>

				{isError && (
					<AlertBlock type="error" className="w-full">
						{error?.message}
					</AlertBlock>
				)}

				<Form {...form}>
					<form
						id="destination-form"
						onSubmit={form.handleSubmit(onSubmit)}
						className="grid w-full gap-4"
					>
						{/* Provider Type Selection */}
						<FormField
							control={form.control}
							name="providerType"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Provider Type</FormLabel>
									<FormControl>
										<Select
											onValueChange={field.onChange}
											value={field.value}
											disabled={!!destinationId}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select provider type" />
											</SelectTrigger>
											<SelectContent>
												{Object.entries(PROVIDER_INFO).map(
													([key, { icon, name, description }]) => (
														<SelectItem key={key} value={key}>
															<div className="flex items-center gap-2">
																{icon}
																<div className="flex flex-col">
																	<span>{name}</span>
																	<span className="text-xs text-muted-foreground">
																		{description}
																	</span>
																</div>
															</div>
														</SelectItem>
													),
												)}
											</SelectContent>
										</Select>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Name field (common to all) */}
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input
											placeholder="My Backup Destination"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* S3 Fields */}
						{selectedProvider === "s3" && (
							<>
								<FormField
									control={form.control}
									name="provider"
									render={({ field }) => (
										<FormItem>
											<FormLabel>S3 Provider</FormLabel>
											<FormControl>
												<Select
													onValueChange={field.onChange}
													value={field.value}
												>
													<SelectTrigger>
														<SelectValue placeholder="Select S3 provider" />
													</SelectTrigger>
													<SelectContent>
														{S3_PROVIDERS.map((provider) => (
															<SelectItem
																key={provider.key}
																value={provider.key}
															>
																{provider.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="accessKeyId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Access Key ID</FormLabel>
											<FormControl>
												<Input placeholder="AKIAIOSFODNN7EXAMPLE" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="secretAccessKey"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Secret Access Key</FormLabel>
											<FormControl>
												<Input
													type="password"
													placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="bucket"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Bucket</FormLabel>
											<FormControl>
												<Input placeholder="my-backup-bucket" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="region"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Region</FormLabel>
											<FormControl>
												<Input placeholder="us-east-1" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="endpoint"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Endpoint</FormLabel>
											<FormControl>
												<Input
													placeholder="https://s3.amazonaws.com"
													{...field}
												/>
											</FormControl>
											<FormDescription>
												Use the full S3 endpoint URL for your provider
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							</>
						)}

						{/* FTP Fields */}
						{selectedProvider === "ftp" && (
							<>
								<FormField
									control={form.control}
									name="host"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Host</FormLabel>
											<FormControl>
												<Input placeholder="ftp.example.com" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="port"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Port</FormLabel>
											<FormControl>
												<Input
													type="number"
													placeholder="21"
													{...field}
													value={field.value || ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="user"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Username</FormLabel>
											<FormControl>
												<Input placeholder="ftpuser" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="pass"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Password</FormLabel>
											<FormControl>
												<Input type="password" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="tls"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
											<div className="space-y-0.5">
												<FormLabel>Use TLS/SSL</FormLabel>
												<FormDescription>
													Enable FTPS (FTP over TLS)
												</FormDescription>
											</div>
											<FormControl>
												<Switch
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
							</>
						)}

						{/* SFTP Fields */}
						{selectedProvider === "sftp" && (
							<>
								<FormField
									control={form.control}
									name="host"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Host</FormLabel>
											<FormControl>
												<Input placeholder="sftp.example.com" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="port"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Port</FormLabel>
											<FormControl>
												<Input
													type="number"
													placeholder="22"
													{...field}
													value={field.value || ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="user"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Username</FormLabel>
											<FormControl>
												<Input placeholder="sftpuser" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="pass"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Password (Optional)</FormLabel>
											<FormControl>
												<Input type="password" {...field} />
											</FormControl>
											<FormDescription>
												Use password or SSH key (not both)
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="keyPem"
									render={({ field }) => (
										<FormItem>
											<FormLabel>SSH Private Key (Optional)</FormLabel>
											<FormControl>
												<Textarea
													placeholder="-----BEGIN RSA PRIVATE KEY-----"
													className="font-mono text-xs"
													rows={4}
													{...field}
												/>
											</FormControl>
											<FormDescription>
												Paste your SSH private key here
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							</>
						)}

						{/* Custom rclone config */}
						{selectedProvider === "custom" && (
							<FormField
								control={form.control}
								name="customConfig"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Custom rclone Configuration</FormLabel>
										<FormControl>
											<Textarea
												placeholder="[myremote]&#10;type = s3&#10;provider = AWS&#10;..."
												className="font-mono text-xs"
												rows={10}
												{...field}
											/>
										</FormControl>
										<FormDescription>
											Paste your complete rclone config section here. See{" "}
											<a
												href="https://rclone.org/docs/"
												target="_blank"
												rel="noopener noreferrer"
												className="text-primary underline"
											>
												rclone docs
											</a>{" "}
											for examples.
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}
					</form>
				</Form>

				<DialogFooter>
					<Button
						type="submit"
						form="destination-form"
						isLoading={isLoading}
					>
						{destinationId ? "Update" : "Create"} Destination
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
