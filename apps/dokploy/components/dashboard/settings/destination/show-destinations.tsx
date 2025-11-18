import {
	CheckCircle2,
	Cloud,
	Database,
	FileCode,
	Folder,
	FolderUp,
	HardDrive,
	Loader2,
	ServerIcon,
	Trash2,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DialogAction } from "@/components/shared/dialog-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { api } from "@/utils/api";
import { HandleDestinationsV2 } from "./handle-destinations-v2";

// Provider icon mapping
const PROVIDER_ICONS: Record<string, React.ReactNode> = {
	s3: <Cloud className="size-4" />,
	"google-drive": <Cloud className="size-4" />,
	onedrive: <Cloud className="size-4" />,
	dropbox: <Cloud className="size-4" />,
	ftp: <ServerIcon className="size-4" />,
	sftp: <ServerIcon className="size-4" />,
	webdav: <ServerIcon className="size-4" />,
	local: <HardDrive className="size-4" />,
	crypt: <Database className="size-4" />,
	custom: <FileCode className="size-4" />,
};

// Provider display names
const PROVIDER_NAMES: Record<string, string> = {
	s3: "S3",
	"google-drive": "Google Drive",
	onedrive: "OneDrive",
	dropbox: "Dropbox",
	ftp: "FTP",
	sftp: "SFTP",
	webdav: "WebDAV",
	local: "Local",
	crypt: "Encrypted",
	custom: "Custom",
};

export const ShowDestinations = () => {
	const { data, isLoading, refetch } = api.destination.all.useQuery();
	const { mutateAsync, isLoading: isRemoving } =
		api.destination.remove.useMutation();
	const { mutateAsync: testConnection } =
		api.destination.testConnection.useMutation();
	const [testingId, setTestingId] = useState<string | null>(null);
	return (
		<div className="w-full">
			<Card className="h-full bg-sidebar  p-2.5 rounded-xl  max-w-5xl mx-auto">
				<div className="rounded-xl bg-background shadow-md ">
					<CardHeader className="">
						<CardTitle className="text-xl flex flex-row gap-2">
							<Database className="size-6 text-muted-foreground self-center" />
							Backup Destinations
						</CardTitle>
						<CardDescription>
							Configure backup destinations including S3-compatible storage, Google Drive, OneDrive, FTP, SFTP, and more.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2 py-8 border-t">
						{isLoading ? (
							<div className="flex flex-row gap-2 items-center justify-center text-sm text-muted-foreground min-h-[25vh]">
								<span>Loading...</span>
								<Loader2 className="animate-spin size-4" />
							</div>
						) : (
							<>
								{data?.length === 0 ? (
									<div className="flex flex-col items-center gap-3  min-h-[25vh] justify-center">
										<FolderUp className="size-8 self-center text-muted-foreground" />
										<span className="text-base text-muted-foreground">
											To create a backup it is required to set at least 1
											provider.
										</span>
										<HandleDestinationsV2 />
									</div>
								) : (
									<div className="flex flex-col gap-4  min-h-[25vh]">
										<div className="flex flex-col gap-4 rounded-lg ">
											{data?.map((destination, index) => {
												const providerType =
													destination.providerType || "s3";
												const providerName =
													PROVIDER_NAMES[providerType] || providerType;
												const providerIcon =
													PROVIDER_ICONS[providerType] || (
														<Folder className="size-4" />
													);
												const isTesting =
													testingId === destination.destinationId;

												return (
													<div
														key={destination.destinationId}
														className="flex items-center justify-between bg-sidebar p-1 w-full rounded-lg"
													>
														<div className="flex items-center justify-between p-3.5 rounded-lg bg-background border  w-full">
															<div className="flex flex-col gap-2">
																<div className="flex items-center gap-2">
																	<span className="text-sm font-medium">
																		{index + 1}. {destination.name}
																	</span>
																	<Badge
																		variant="secondary"
																		className="flex items-center gap-1"
																	>
																		{providerIcon}
																		{providerName}
																	</Badge>
																</div>
																<div className="flex flex-col gap-1 text-xs text-muted-foreground">
																	<span>
																		Created:{" "}
																		{new Date(
																			destination.createdAt,
																		).toLocaleDateString()}
																	</span>
																	{destination.lastTestedAt && (
																		<div className="flex items-center gap-1">
																			{destination.lastError ? (
																				<>
																					<XCircle className="size-3 text-red-500" />
																					<span className="text-red-500">
																						Last test failed:{" "}
																						{new Date(
																							destination.lastTestedAt,
																						).toLocaleString()}
																					</span>
																				</>
																			) : (
																				<>
																					<CheckCircle2 className="size-3 text-green-500" />
																					<span className="text-green-500">
																						Last tested:{" "}
																						{new Date(
																							destination.lastTestedAt,
																						).toLocaleString()}
																					</span>
																				</>
																			)}
																		</div>
																	)}
																	{destination.lastError && (
																		<span className="text-red-500 text-xs">
																			Error: {destination.lastError}
																		</span>
																	)}
																</div>
															</div>
															<div className="flex flex-row gap-1">
																<Button
																	variant="outline"
																	size="sm"
																	onClick={async () => {
																		setTestingId(destination.destinationId);
																		try {
																			await testConnection({
																				destinationId:
																					destination.destinationId,
																			});
																			toast.success("Connection test successful!");
																			refetch();
																		} catch (error) {
																			toast.error(
																				error instanceof Error
																					? error.message
																					: "Connection test failed",
																			);
																			refetch();
																		} finally {
																			setTestingId(null);
																		}
																	}}
																	isLoading={isTesting}
																	disabled={isTesting}
																>
																	Test Connection
																</Button>
																<HandleDestinationsV2
																	destinationId={destination.destinationId}
																/>
																<DialogAction
																	title="Delete Destination"
																	description="Are you sure you want to delete this destination?"
																	type="destructive"
																	onClick={async () => {
																		await mutateAsync({
																			destinationId: destination.destinationId,
																		})
																			.then(() => {
																				toast.success(
																					"Destination deleted successfully",
																				);
																				refetch();
																			})
																			.catch(() => {
																				toast.error("Error deleting destination");
																			});
																	}}
																>
																	<Button
																		variant="ghost"
																		size="icon"
																		className="group hover:bg-red-500/10 "
																		isLoading={isRemoving}
																	>
																		<Trash2 className="size-4 text-primary group-hover:text-red-500" />
																	</Button>
																</DialogAction>
															</div>
														</div>
													</div>
												);
											})}
										</div>

										<div className="flex flex-row gap-2 flex-wrap w-full justify-end mr-4">
											<HandleDestinationsV2 />
										</div>
									</div>
								)}
							</>
						)}
					</CardContent>
				</div>
			</Card>
		</div>
	);
};
