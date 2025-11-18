import { zodResolver } from "@hookform/resolvers/zod";
import {
	CheckCircle2,
	Cloud,
	FileCode,
	HardDrive,
	Loader2,
	PenBoxIcon,
	PlusIcon,
	ServerIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
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
	// WebDAV fields
	url: z.string().optional(),
	vendor: z.string().optional(),
	// Local fields
	path: z.string().optional(),
	// Crypt fields
	remote: z.string().optional(),
	password: z.string().optional(),
	password2: z.string().optional(),
	filenameEncryption: z.string().optional(),
	// OAuth fields
	oauthSessionId: z.string().optional(),
	token: z.string().optional(), // OAuth token JSON
	rootFolderId: z.string().optional(), // Google Drive
	teamDrive: z.string().optional(), // Google Drive
	driveId: z.string().optional(), // OneDrive
	driveType: z.string().optional(), // OneDrive
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
	webdav: {
		icon: <ServerIcon className="size-4" />,
		name: "WebDAV",
		description: "Nextcloud, ownCloud, Sharepoint WebDAV",
	},
	"google-drive": {
		icon: <Cloud className="size-4" />,
		name: "Google Drive",
		description: "Google Drive cloud storage (OAuth required)",
	},
	onedrive: {
		icon: <Cloud className="size-4" />,
		name: "OneDrive",
		description: "Microsoft OneDrive cloud storage (OAuth required)",
	},
	dropbox: {
		icon: <Cloud className="size-4" />,
		name: "Dropbox",
		description: "Dropbox cloud storage (OAuth required)",
	},
	local: {
		icon: <HardDrive className="size-4" />,
		name: "Local Filesystem",
		description: "Local directory on the server",
	},
	crypt: {
		icon: <FileCode className="size-4" />,
		name: "Encrypted Remote",
		description: "Encrypt files on top of another remote",
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
	const [oauthSessionId, setOauthSessionId] = useState<string>("");
	const [oauthStatus, setOauthStatus] = useState<
		"idle" | "authorizing" | "authorized" | "error"
	>("idle");
	const [oauthUserInfo, setOauthUserInfo] = useState<{
		email?: string;
		name?: string;
	}>({});
	const utils = api.useUtils();
	const { data: isCloud } = api.settings.isCloud.useQuery();

	const { mutateAsync, isError, error, isLoading } = destinationId
		? api.destination.update.useMutation()
		: api.destination.create.useMutation();

	const { data: destination } = api.destination.one.useQuery(
		{ destinationId: destinationId || "" },
		{ enabled: !!destinationId, refetchOnWindowFocus: false },
	);

	// OAuth mutations and queries
	const initiateOAuth = api.oauth.initiate.useMutation();
	const getOAuthSession = api.oauth.getSession.useQuery(
		{ sessionId: oauthSessionId },
		{
			enabled: !!oauthSessionId && oauthStatus === "authorizing",
			refetchInterval: 2000, // Poll every 2 seconds
		},
	);
	const getOAuthTokenData = api.oauth.getTokenData.useQuery(
		{ sessionId: oauthSessionId },
		{ enabled: false }, // Manual trigger
	);
	const deleteOAuthSession = api.oauth.deleteSession.useMutation();

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
			url: "",
			vendor: "",
			path: "",
			remote: "",
			password: "",
			password2: "",
			filenameEncryption: "standard",
			oauthSessionId: "",
			token: "",
			rootFolderId: "",
			teamDrive: "",
			driveId: "",
			driveType: "",
			customConfig: "",
			serverId: "",
		},
		resolver: zodResolver(destinationSchema),
	});

	// OAuth functions
	const handleOAuthAuthorize = async () => {
		try {
			setOauthStatus("authorizing");
			const result = await initiateOAuth.mutateAsync({
				provider: selectedProvider as "google-drive" | "onedrive" | "dropbox",
				destinationName: form.getValues("name"),
			});

			setOauthSessionId(result.sessionId);

			// Open OAuth popup
			const width = 600;
			const height = 700;
			const left = window.screenX + (window.outerWidth - width) / 2;
			const top = window.screenY + (window.outerHeight - height) / 2;

			const popup = window.open(
				result.authUrl,
				"OAuth Authorization",
				`width=${width},height=${height},left=${left},top=${top}`,
			);

			if (!popup) {
				toast.error(
					"Failed to open authorization popup. Please allow popups for this site.",
				);
				setOauthStatus("error");
			}
		} catch (error) {
			console.error("OAuth initiation error:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to start OAuth flow",
			);
			setOauthStatus("error");
		}
	};

	// Listen for OAuth callback messages
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (event.origin !== window.location.origin) return;

			if (event.data.type === "oauth-success") {
				// Update session ID from callback (in case it wasn't set)
				if (event.data.sessionId) {
					setOauthSessionId(event.data.sessionId);
				}
				setOauthStatus("authorized");
				setOauthUserInfo({
					email: event.data.userEmail,
					name: event.data.userName,
				});
				toast.success(
					`Authorized as ${event.data.userEmail || event.data.userName}`,
				);
			} else if (event.data.type === "oauth-error") {
				setOauthStatus("error");
				toast.error(event.data.error);
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, []);

	// Monitor OAuth session status via polling
	useEffect(() => {
		if (getOAuthSession.data?.found && getOAuthSession.data.hasToken) {
			setOauthStatus("authorized");
			setOauthUserInfo({
				email: getOAuthSession.data.userEmail,
				name: getOAuthSession.data.userName,
			});
		}
	}, [getOAuthSession.data]);

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
				accessKeyId: destination.accessKey || rcloneData.accessKeyId || "",
				secretAccessKey:
					destination.secretAccessKey || rcloneData.secretAccessKey || "",
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
				// WebDAV fields
				url: rcloneData.url || "",
				vendor: rcloneData.vendor || "",
				// Local fields
				path: rcloneData.path || "",
				// Crypt fields
				remote: rcloneData.remote || "",
				password: rcloneData.password || "",
				password2: rcloneData.password2 || "",
				filenameEncryption: rcloneData.filenameEncryption || "standard",
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
			} else if (data.providerType === "webdav") {
				rcloneConfig = {
					url: data.url,
					vendor: data.vendor,
					user: data.user,
					pass: data.pass,
				};
				await mutateAsync({
					name: data.name,
					providerType: "webdav",
					rcloneConfig: JSON.stringify(rcloneConfig),
					destinationId: destinationId || "",
				});
			} else if (data.providerType === "local") {
				rcloneConfig = {
					path: data.path,
				};
				await mutateAsync({
					name: data.name,
					providerType: "local",
					rcloneConfig: JSON.stringify(rcloneConfig),
					destinationId: destinationId || "",
				});
			} else if (data.providerType === "crypt") {
				rcloneConfig = {
					remote: data.remote,
					password: data.password,
					password2: data.password2,
					filenameEncryption: data.filenameEncryption,
				};
				await mutateAsync({
					name: data.name,
					providerType: "crypt",
					rcloneConfig: JSON.stringify(rcloneConfig),
					destinationId: destinationId || "",
				});
			} else if (
				data.providerType === "google-drive" ||
				data.providerType === "onedrive" ||
				data.providerType === "dropbox"
			) {
				// OAuth providers - fetch token data from session
				if (!oauthSessionId || oauthStatus !== "authorized") {
					toast.error("Please authorize with the provider first");
					return;
				}

				try {
					const tokenData = await getOAuthTokenData.refetch();
					if (!tokenData.data) {
						toast.error("Failed to get OAuth token data");
						return;
					}

					rcloneConfig = {
						token: tokenData.data.tokenJson,
					};

					// Add provider-specific optional fields
					if (data.providerType === "google-drive") {
						if (data.rootFolderId) {
							rcloneConfig.rootFolderId = data.rootFolderId;
						}
						if (data.teamDrive) {
							rcloneConfig.teamDrive = data.teamDrive;
						}
					} else if (data.providerType === "onedrive") {
						if (data.driveId) {
							rcloneConfig.driveId = data.driveId;
						}
						if (data.driveType) {
							rcloneConfig.driveType = data.driveType;
						}
					}

					await mutateAsync({
						name: data.name,
						providerType: data.providerType,
						rcloneConfig: JSON.stringify(rcloneConfig),
						destinationId: destinationId || "",
					});

					// Clean up OAuth session after successful creation
					await deleteOAuthSession.mutateAsync({ sessionId: oauthSessionId });
				} catch (error) {
					console.error("Failed to create OAuth destination:", error);
					throw error;
				}
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

			// Reset OAuth state
			setOauthSessionId("");
			setOauthStatus("idle");
			setOauthUserInfo({});
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
			// Reset OAuth state when provider changes
			setOauthSessionId("");
			setOauthStatus("idle");
			setOauthUserInfo({});
		}
	}, [watchedProviderType]);

	// Reset OAuth state when dialog closes
	useEffect(() => {
		if (!open) {
			setOauthSessionId("");
			setOauthStatus("idle");
			setOauthUserInfo({});
		}
	}, [open]);

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
						Configure a backup destination to store your database and
						application backups securely.
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
																<div className="flex flex-col text-left">
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
										<Input placeholder="My Backup Destination" {...field} />
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

						{/* WebDAV Fields */}
						{selectedProvider === "webdav" && (
							<>
								<FormField
									control={form.control}
									name="url"
									render={({ field }) => (
										<FormItem>
											<FormLabel>WebDAV URL</FormLabel>
											<FormControl>
												<Input
													placeholder="https://cloud.example.com/remote.php/dav"
													{...field}
												/>
											</FormControl>
											<FormDescription>
												Full WebDAV endpoint URL
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="vendor"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Vendor (Optional)</FormLabel>
											<FormControl>
												<Select
													onValueChange={field.onChange}
													value={field.value}
												>
													<SelectTrigger>
														<SelectValue placeholder="Select vendor" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="nextcloud">Nextcloud</SelectItem>
														<SelectItem value="owncloud">ownCloud</SelectItem>
														<SelectItem value="sharepoint">
															SharePoint
														</SelectItem>
														<SelectItem value="other">Other</SelectItem>
													</SelectContent>
												</Select>
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
												<Input placeholder="username" {...field} />
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
							</>
						)}

						{/* Local Fields */}
						{selectedProvider === "local" && (
							<FormField
								control={form.control}
								name="path"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Local Path</FormLabel>
										<FormControl>
											<Input placeholder="/path/to/backups" {...field} />
										</FormControl>
										<FormDescription>
											Absolute path on the server's filesystem
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}

						{/* Crypt Fields */}
						{selectedProvider === "crypt" && (
							<>
								<FormField
									control={form.control}
									name="remote"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Base Remote</FormLabel>
											<FormControl>
												<Input
													placeholder="my-s3-remote:bucket/path"
													{...field}
												/>
											</FormControl>
											<FormDescription>
												The remote to encrypt (e.g., "my-s3:bucket" or
												"my-sftp:/backups")
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="password"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Encryption Password</FormLabel>
											<FormControl>
												<Input type="password" {...field} />
											</FormControl>
											<FormDescription>
												Password for encrypting files (will be obscured by
												rclone)
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="password2"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Salt Password (Optional)</FormLabel>
											<FormControl>
												<Input type="password" {...field} />
											</FormControl>
											<FormDescription>
												Additional salt for extra security
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="filenameEncryption"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Filename Encryption</FormLabel>
											<FormControl>
												<Select
													onValueChange={field.onChange}
													value={field.value}
												>
													<SelectTrigger>
														<SelectValue placeholder="Select encryption mode" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="standard">
															Standard (recommended)
														</SelectItem>
														<SelectItem value="obfuscate">Obfuscate</SelectItem>
														<SelectItem value="off">Off</SelectItem>
													</SelectContent>
												</Select>
											</FormControl>
											<FormDescription>
												How to encrypt filenames
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							</>
						)}

						{/* OAuth Providers */}
						{(selectedProvider === "google-drive" ||
							selectedProvider === "onedrive" ||
							selectedProvider === "dropbox") && (
							<div className="rounded-lg border p-4 bg-muted/50">
								<div className="flex flex-col gap-3">
									<div className="flex items-start gap-2">
										<Cloud className="size-5 mt-0.5" />
										<div className="flex-1">
											<h4 className="font-medium">OAuth Authentication</h4>
											<p className="text-sm text-muted-foreground mt-1">
												Authorize Dokploy to access your{" "}
												{selectedProvider === "google-drive" && "Google Drive"}
												{selectedProvider === "onedrive" && "OneDrive"}
												{selectedProvider === "dropbox" && "Dropbox"} account.
											</p>
										</div>
									</div>

									{oauthStatus === "idle" && (
										<>
											<Button
												type="button"
												onClick={handleOAuthAuthorize}
												disabled={!form.watch("name")}
												className="w-full"
											>
												<Cloud className="size-4 mr-2" />
												Authorize with{" "}
												{selectedProvider === "google-drive" && "Google"}
												{selectedProvider === "onedrive" && "Microsoft"}
												{selectedProvider === "dropbox" && "Dropbox"}
											</Button>
											{!form.watch("name") && (
												<p className="text-xs text-muted-foreground">
													Please enter a destination name first
												</p>
											)}
										</>
									)}

									{oauthStatus === "authorizing" && (
										<div className="flex items-center gap-2 p-3 rounded-md bg-blue-500/10">
											<Loader2 className="size-4 animate-spin text-blue-500" />
											<span className="text-sm">
												Waiting for authorization...
											</span>
										</div>
									)}

									{oauthStatus === "authorized" && (
										<div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10">
											<CheckCircle2 className="size-4 text-green-500" />
											<div className="flex-1">
												<span className="text-sm font-medium">
													Authorized successfully
												</span>
												{oauthUserInfo.name && (
													<p className="text-xs text-muted-foreground">
														{oauthUserInfo.name}
														{oauthUserInfo.email && ` (${oauthUserInfo.email})`}
													</p>
												)}
											</div>
										</div>
									)}

									{oauthStatus === "error" && (
										<div className="flex flex-col gap-2">
											<div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10">
												<span className="text-sm text-destructive">
													Authorization failed
												</span>
											</div>
											<Button
												type="button"
												variant="outline"
												onClick={handleOAuthAuthorize}
												disabled={!form.watch("name")}
												className="w-full"
											>
												Try Again
											</Button>
										</div>
									)}

									{/* Provider-specific optional fields */}
									{oauthStatus === "authorized" && (
										<>
											{selectedProvider === "google-drive" && (
												<>
													<FormField
														control={form.control}
														name="rootFolderId"
														render={({ field }) => (
															<FormItem>
																<FormLabel>Root Folder ID (Optional)</FormLabel>
																<FormControl>
																	<Input placeholder="1ABC...XYZ" {...field} />
																</FormControl>
																<FormDescription>
																	Limit access to a specific folder
																</FormDescription>
																<FormMessage />
															</FormItem>
														)}
													/>
													<FormField
														control={form.control}
														name="teamDrive"
														render={({ field }) => (
															<FormItem>
																<FormLabel>Team Drive ID (Optional)</FormLabel>
																<FormControl>
																	<Input placeholder="0ABC...XYZ" {...field} />
																</FormControl>
																<FormDescription>
																	Use a Google Workspace Team Drive
																</FormDescription>
																<FormMessage />
															</FormItem>
														)}
													/>
												</>
											)}

											{selectedProvider === "onedrive" && (
												<>
													<FormField
														control={form.control}
														name="driveId"
														render={({ field }) => (
															<FormItem>
																<FormLabel>Drive ID (Optional)</FormLabel>
																<FormControl>
																	<Input placeholder="b!abc..." {...field} />
																</FormControl>
																<FormDescription>
																	Specify a particular drive
																</FormDescription>
																<FormMessage />
															</FormItem>
														)}
													/>
													<FormField
														control={form.control}
														name="driveType"
														render={({ field }) => (
															<FormItem>
																<FormLabel>Drive Type (Optional)</FormLabel>
																<FormControl>
																	<Select
																		onValueChange={field.onChange}
																		value={field.value}
																	>
																		<SelectTrigger>
																			<SelectValue placeholder="Select drive type" />
																		</SelectTrigger>
																		<SelectContent>
																			<SelectItem value="personal">
																				Personal
																			</SelectItem>
																			<SelectItem value="business">
																				Business
																			</SelectItem>
																			<SelectItem value="documentLibrary">
																				Document Library
																			</SelectItem>
																		</SelectContent>
																	</Select>
																</FormControl>
																<FormMessage />
															</FormItem>
														)}
													/>
												</>
											)}
										</>
									)}
								</div>
							</div>
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
					<Button type="submit" form="destination-form" isLoading={isLoading}>
						{destinationId ? "Update" : "Create"} Destination
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
