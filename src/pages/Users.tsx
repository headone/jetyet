import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Combobox,
  ComboboxItem,
  ComboboxValue,
  ComboboxChips,
  ComboboxInput,
  ComboboxChip,
  ComboboxPopup,
  ComboboxList,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import {
  Dialog,
  DialogDescription,
  DialogPanel,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import {
  Plus,
  LucideRotate3D,
  Trash2,
  LinkIcon,
  Network,
  Shuffle,
  Rocket,
  Key,
  RefreshCw,
  CircleGauge,
  MoreHorizontal,
  CloudDownload,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  type UserWithNodes,
  type Node,
  type UserNode,
  type UserMonthlyTraffic,
} from "@/types";
import { toast } from "sonner";
import copy from "copy-to-clipboard";
import { apiCall, apiCallSWR } from "@/client";
import { Spinner } from "@/components/ui/spinner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Users = () => {
  const [users, setUsers] = useState<UserWithNodes[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [trafficByUser, setTrafficByUser] = useState<
    Record<string, UserMonthlyTraffic>
  >({});

  const fetchUsers = async () => {
    await apiCallSWR("/api/users", "GET", undefined, setUsers);
  };

  const fetchNodes = async () => {
    await apiCallSWR("/api/nodes", "GET", undefined, setNodes);
  };

  const fetchTraffic = async () => {
    await apiCallSWR("/api/users/traffic", "GET", undefined, (rows) => {
      setTrafficByUser(
        Object.fromEntries(rows.map((row) => [row.userId, row])),
      );
    });
  };

  const deleteUser = async (id: string) => {
    await apiCall("/api/users/:id", "DELETE", { params: { id } });

    fetchUsers();
  };

  useEffect(() => {
    Promise.all([fetchUsers(), fetchNodes(), fetchTraffic()]);
  }, []);

  const formatBytes = (bytes: number) => {
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const copySubLink = async (
    subKey: string,
    type: "clash" | "karing" | "shadowrocket",
  ) => {
    const subLink = `${window.location.origin}/sub/${subKey}?type=${type}`;
    try {
      await navigator.clipboard.writeText(subLink);
    } catch {
      copy(subLink);
    }
    toast.success(`${type} subscription link copied to clipboard`);
  };

  const handleReassign = async () => {
    await apiCall("/api/nodes/reassign", "POST", {
      // Reassign all nodes
      body: users.flatMap((user) =>
        user.userNodes.map((node) => ({
          userId: user.id,
          nodeId: node.nodeId,
        })),
      ),
    });
  };

  const handleSyncTraffic = async () => {
    await apiCall("/api/traffic/sync", "POST");
    await fetchTraffic();
  };

  const handleResetTraffic = async (userId: string) => {
    await apiCall("/api/users/:id/traffic/reset", "POST", {
      params: { id: userId },
    });
    await fetchTraffic();
  };

  const handleUpdateTrafficLimit = async (
    userId: string,
    monthlyLimitGB: number | null,
  ) => {
    await apiCall("/api/users/:id/traffic-limit", "PUT", {
      params: { id: userId },
      body: { monthlyLimitGB },
    });
    await Promise.all([fetchUsers(), fetchTraffic()]);
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-normal font-header tracking-tight">
            Users
          </h2>
          <p className="text-muted-foreground">
            Manage access and traffic limits
          </p>
        </div>
        <div className="flex gap-2">
          <ReassignButton onReassign={handleReassign} />
          <SyncTrafficButton onSync={handleSyncTraffic} />
          <AddUserSheet onSuccess={fetchUsers} />
        </div>
      </div>

      <Card className="rounded-md border py-0">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                  Username
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                  Status
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                  Usage
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                  Nodes
                </th>
                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {users.map((user) => {
                const traffic = trafficByUser[user.id];
                const usedBytes = traffic?.totalBytes ?? 0;
                const limitBytes = user.monthlyLimitBytes;
                const usagePercent =
                  limitBytes != null && limitBytes > 0
                    ? (usedBytes / limitBytes) * 100
                    : 0;
                const isOverLimit =
                  limitBytes != null && limitBytes > 0 && usedBytes >= limitBytes;
                return (
                  <tr
                    key={user.id}
                    className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                  >
                    <td className="p-4 align-middle font-medium">
                      {user.name}
                    </td>
                    <td className="p-4 align-middle">
                      <Badge variant={user.status === 1 ? "success" : "error"}>
                        {user.status === 1 ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="w-45 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{formatBytes(usedBytes)}</span>
                          <span className="text-muted-foreground">
                            {limitBytes == null ? "∞ GB" : formatBytes(limitBytes)}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${usagePercent > 90 ? "bg-red-500" : "bg-primary"}`}
                            style={{ width: `${Math.min(usagePercent, 100)}%` }}
                          />
                        </div>
                        {isOverLimit && (
                          <p className="text-xs text-red-500">Over monthly limit</p>
                        )}
                      </div>
                    </td>
                    <td className="p-4 align-middle text-muted-foreground">
                      <AssignDialog
                        userId={user.id}
                        nodes={nodes}
                        assignedNodes={user.userNodes}
                        onSuccess={fetchUsers}
                      >
                        {/*{user.userNodes.length} assigned*/}
                        {user.userNodes.length === 0 && "no assigned"}
                        {user.userNodes.length > 0 &&
                          nodes.length === 0 &&
                          `${user.userNodes.length} assigned`}
                        {user.userNodes.length > 0 && nodes.length > 0 && (
                          <>
                            <div className="-space-x-[0.6rem] flex">
                              {user.userNodes
                                .slice(0, 3)
                                .map((ids) =>
                                  nodes.find((node) => node.id === ids.nodeId),
                                )
                                .filter((node) => !!node)
                                .map((node) => {
                                  const initials = [...node.name]
                                    .slice(0, 2)
                                    .join("");
                                  return (
                                    <Avatar>
                                      <AvatarFallback className="font-node-card">
                                        {initials}
                                      </AvatarFallback>
                                    </Avatar>
                                  );
                                })}
                            </div>
                            <span>
                              {user.userNodes.length - 3 > 0 &&
                                nodes.length > 0 &&
                                `+${user.userNodes.length - 3}`}
                            </span>
                          </>
                        )}
                      </AssignDialog>
                    </td>
                    <td className="p-4 align-middle text-right">
                      <div className="flex justify-end gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={<Button size="icon" variant="ghost" />}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-all duration-200 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                          >
                            <LinkIcon className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => copySubLink(user.subKey, "clash")}
                              className="cursor-pointer py-3"
                            >
                              <Network className="h-4 w-4 mr-3 text-blue-500" />
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium">Clash</span>
                                <span className="text-xs text-muted-foreground">
                                  Standard port range configuration
                                </span>
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => copySubLink(user.subKey, "karing")}
                              className="cursor-pointer py-3"
                            >
                              <Shuffle className="h-4 w-4 mr-3 text-green-500" />
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium">Karing</span>
                                <span className="text-xs text-muted-foreground">
                                  Random port for each access
                                </span>
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                copySubLink(user.subKey, "shadowrocket")
                              }
                              className="cursor-pointer py-3"
                            >
                              <Rocket className="h-4 w-4 mr-3 text-violet-500" />
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium">
                                  Shadowrocket
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Base64 text data
                                </span>
                              </div>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <UserOperationMenu
                          userId={user.id}
                          userName={user.name}
                          currentLimitBytes={user.monthlyLimitBytes}
                          onUpdateTrafficLimit={handleUpdateTrafficLimit}
                          onResetTraffic={handleResetTraffic}
                          onResetSubKeyDone={fetchUsers}
                          onDelete={deleteUser}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-4 text-center text-muted-foreground h-24"
                  >
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const AddUserSheet = ({ onSuccess }: { onSuccess?: () => void }) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;

    setLoading(true);
    try {
      await apiCall("/api/users", "POST", { body: { name } });
      toast.success("User added successfully.");
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to add user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet>
      <SheetTrigger render={<Button />}>
        <Plus className="h-3.5 w-3.5 mr-2" />
        Add
      </SheetTrigger>
      <SheetPopup inset>
        <Form className="h-full gap-0" onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>Add User</SheetTitle>
            <SheetDescription>Add a new user to the system.</SheetDescription>
          </SheetHeader>
          <SheetPanel className="grid gap-4">
            <Field name="name">
              <FieldLabel>Name</FieldLabel>
              <Input type="text" required />
            </Field>
          </SheetPanel>
          <SheetFooter>
            <SheetClose render={<Button variant="ghost" />}>Cancel</SheetClose>
            <SheetClose render={<Button disabled={loading} type="submit" />}>
              Save
            </SheetClose>
          </SheetFooter>
        </Form>
      </SheetPopup>
    </Sheet>
  );
};

const AssignDialog = ({
  children,
  userId,
  nodes,
  assignedNodes,
  onSuccess,
}: {
  children: React.ReactNode;
  userId: string;
  nodes: Node[];
  assignedNodes: UserNode[];
  onSuccess?: () => void;
}) => {
  const [selectedNodes, setSelectedNodes] = useState<Node[]>(
    assignedNodes
      .map((node) => nodes.find((n) => n.id === node.nodeId))
      .filter((node) => !!node),
  );

  const assignHandler = async () => {
    const callApi = (node: UserNode, assign: boolean) =>
      apiCall("/api/nodes/assign", "POST", {
        body: { userId, nodeId: node.nodeId, assign },
      });

    const assignList = selectedNodes
      .filter((node) => !assignedNodes.find((n) => n.nodeId === node.id))
      .map((node) => ({ userId: userId, nodeId: node.id }));

    const unassignList = assignedNodes.filter(
      (node) => !selectedNodes.find((n) => n.id === node.nodeId),
    );

    await Promise.all([
      ...assignList.map((node) => callApi(node, true)),
      ...unassignList.map((node) => callApi(node, false)),
    ]);

    toast.success("Nodes assigned successfully");
    onSuccess?.();
  };

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" />}>
        {children}
      </DialogTrigger>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Assign Nodes</DialogTitle>
          <DialogDescription>
            Assign the authorized nodes to the user.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel className="font-node-card">
          <Combobox
            value={selectedNodes}
            items={nodes}
            onValueChange={setSelectedNodes}
            multiple
          >
            <ComboboxChips>
              <ComboboxValue>
                {(value: Node[]) => (
                  <>
                    {value?.map((item) => (
                      <ComboboxChip aria-label={item.name} key={item.id}>
                        {item.name}
                      </ComboboxChip>
                    ))}
                    <ComboboxInput
                      aria-label="Select a node"
                      placeholder={
                        value.length > 0 ? undefined : "Select a node..."
                      }
                    />
                  </>
                )}
              </ComboboxValue>
            </ComboboxChips>
            <ComboboxPopup>
              <ComboboxEmpty>No nodes found.</ComboboxEmpty>
              <ComboboxList>
                {(item: Node) => (
                  <ComboboxItem
                    key={item.id}
                    value={item}
                    className="font-node-card"
                  >
                    {item.name}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxPopup>
          </Combobox>
        </DialogPanel>
        <DialogFooter className="space-x-2">
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <DialogClose render={<Button />} onClick={assignHandler}>
            Save
          </DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
};

const ReassignButton = ({
  onReassign,
}: {
  onReassign: () => Promise<void>;
}) => {
  const [loading, setLoading] = useState(false);

  const handleReassign = async () => {
    setLoading(true);
    try {
      await onReassign();
      toast.success("Reassignment completed");
    } catch (error) {
      toast.error("Reassignment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button disabled={loading} variant="outline" onClick={handleReassign}>
      {loading ? <Spinner /> : <LucideRotate3D className="h-4 w-4 mr-2" />}
      {loading ? "Reassigning" : "Reassign"}
    </Button>
  );
};

const SyncTrafficButton = ({
  onSync,
}: {
  onSync: () => Promise<void>;
}) => {
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    setLoading(true);
    try {
      await onSync();
      toast.success("Traffic synchronized");
    } catch (error) {
      toast.error("Traffic synchronization failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button disabled={loading} variant="outline" onClick={handleSync}>
      {loading ? <Spinner /> : <CloudDownload className="h-4 w-4 mr-2" />}
      {loading ? "Syncing" : "Sync Traffic"}
    </Button>
  );
};

const UserOperationMenu = ({
  userId,
  userName,
  currentLimitBytes,
  onUpdateTrafficLimit,
  onResetTraffic,
  onResetSubKeyDone,
  onDelete,
}: {
  userId: string;
  userName: string;
  currentLimitBytes: number | null;
  onUpdateTrafficLimit: (
    userId: string,
    monthlyLimitGB: number | null,
  ) => Promise<void>;
  onResetTraffic: (userId: string) => Promise<void>;
  onResetSubKeyDone: () => void;
  onDelete: (userId: string) => Promise<void>;
}) => {
  const [trafficLimitOpen, setTrafficLimitOpen] = useState(false);
  const [resetTrafficOpen, setResetTrafficOpen] = useState(false);
  const [resetSubKeyOpen, setResetSubKeyOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button size="icon" variant="ghost" className="h-8 w-8" />
          }
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            onClick={() => setTrafficLimitOpen(true)}
            className="cursor-pointer"
          >
            <CircleGauge className="mr-2 h-4 w-4" />
            Set Traffic Limit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setResetTrafficOpen(true)}
            className="cursor-pointer"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset Monthly Traffic
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setResetSubKeyOpen(true)}
            className="cursor-pointer"
          >
            <Key className="mr-2 h-4 w-4" />
            Reset Subscription Key
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="cursor-pointer text-red-600 hover:text-red-700"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TrafficLimitDialog
        userId={userId}
        userName={userName}
        currentLimitBytes={currentLimitBytes}
        onSave={onUpdateTrafficLimit}
        open={trafficLimitOpen}
        onOpenChange={setTrafficLimitOpen}
        showTrigger={false}
      />

      <ResetTrafficDialog
        userId={userId}
        userName={userName}
        onReset={onResetTraffic}
        open={resetTrafficOpen}
        onOpenChange={setResetTrafficOpen}
        showTrigger={false}
      />

      <ResetSubKeyDialog
        userId={userId}
        userName={userName}
        onSuccess={onResetSubKeyDone}
        open={resetSubKeyOpen}
        onOpenChange={setResetSubKeyOpen}
        showTrigger={false}
      />

      <DeleteUserDialog
        userName={userName}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDelete={() => onDelete(userId)}
      />
    </>
  );
};

const TrafficLimitDialog = ({
  userId,
  userName,
  currentLimitBytes,
  onSave,
  open,
  onOpenChange,
  showTrigger = true,
}: {
  userId: string;
  userName: string;
  currentLimitBytes: number | null;
  onSave: (userId: string, monthlyLimitGB: number | null) => Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}) => {
  const [loading, setLoading] = useState(false);
  const [innerOpen, setInnerOpen] = useState(false);
  const [limitInput, setLimitInput] = useState(
    currentLimitBytes == null
      ? ""
      : (currentLimitBytes / 1024 / 1024 / 1024).toString(),
  );
  const actualOpen = open ?? innerOpen;
  const setOpen = onOpenChange ?? setInnerOpen;

  useEffect(() => {
    if (actualOpen) {
      setLimitInput(
        currentLimitBytes == null
          ? ""
          : (currentLimitBytes / 1024 / 1024 / 1024).toString(),
      );
    }
  }, [actualOpen, currentLimitBytes]);

  const handleSave = async () => {
    const normalized = limitInput.trim();
    const value = normalized === "" ? null : Number(normalized);
    if (value != null && (!Number.isFinite(value) || value < 0)) {
      toast.error("Please enter a non-negative number");
      return;
    }

    setLoading(true);
    try {
      await onSave(userId, value);
      toast.success(`Monthly traffic limit updated for ${userName}`);
      setOpen(false);
    } catch (error) {
      toast.error("Failed to update monthly traffic limit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={actualOpen} onOpenChange={setOpen}>
      {showTrigger && (
        <AlertDialogTrigger
          render={
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={loading} />
          }
        >
          <CircleGauge className="h-4 w-4" />
        </AlertDialogTrigger>
      )}
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>Set Monthly Traffic Limit</AlertDialogTitle>
          <AlertDialogDescription>
            Set a monthly limit in GB for <strong>{userName}</strong>. Leave empty for unlimited.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="px-6 py-4">
          <Field name="monthlyLimitGB">
            <FieldLabel>Monthly Limit (GB)</FieldLabel>
            <Input
              type="number"
              min="0"
              step="0.1"
              placeholder="Unlimited"
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
            />
          </Field>
        </div>
        <AlertDialogFooter variant="bare">
          <AlertDialogClose render={<Button variant="ghost" />}>
            Cancel
          </AlertDialogClose>
          <Button disabled={loading} onClick={handleSave}>
            {loading ? <Spinner /> : "Save"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
};

const ResetTrafficDialog = ({
  userId,
  userName,
  onReset,
  open,
  onOpenChange,
  showTrigger = true,
}: {
  userId: string;
  userName: string;
  onReset: (userId: string) => Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}) => {
  const [loading, setLoading] = useState(false);
  const [innerOpen, setInnerOpen] = useState(false);
  const actualOpen = open ?? innerOpen;
  const setOpen = onOpenChange ?? setInnerOpen;

  const handleReset = async () => {
    setLoading(true);
    try {
      await onReset(userId);
      toast.success(`Monthly traffic reset for ${userName}`);
    } catch (error) {
      toast.error("Failed to reset monthly traffic");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={actualOpen} onOpenChange={setOpen}>
      {showTrigger && (
        <AlertDialogTrigger
          render={
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={loading} />
          }
        >
          <RefreshCw className="h-4 w-4" />
        </AlertDialogTrigger>
      )}
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset this month's traffic?</AlertDialogTitle>
          <AlertDialogDescription>
            This will reset monthly traffic counters for <strong>{userName}</strong>.
            Counter collection continues, and new usage will be accumulated from now on.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter variant="bare">
          <AlertDialogClose render={<Button variant="ghost" />}>
            Cancel
          </AlertDialogClose>
          <AlertDialogClose
            render={<Button variant="destructive" disabled={loading} />}
            onClick={handleReset}
          >
            Confirm Reset
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
};

const ResetSubKeyDialog = ({
  userId,
  userName,
  onSuccess,
  open,
  onOpenChange,
  showTrigger = true,
}: {
  userId: string;
  userName: string;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}) => {
  const [loading, setLoading] = useState(false);
  const [customSubKey, setCustomSubKey] = useState("");
  const [innerOpen, setInnerOpen] = useState(false);
  const actualOpen = open ?? innerOpen;
  const setOpen = onOpenChange ?? setInnerOpen;

  const handleResetSubKey = async () => {
    setLoading(true);
    try {
      await apiCall("/api/users/:id/subKey", "PUT", {
        params: { id: userId },
        body: { subKey: customSubKey },
      });
      toast.success(`Subscription key has been reset`);
      setOpen(false); // Close dialog
      setCustomSubKey(""); // Clear input
      onSuccess?.();
    } catch (error: any) {
      toast.error("Failed to reset subscription key");
    } finally {
      setLoading(false);
    }
  };

  // Clear input when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setCustomSubKey("");
    }
  };

  return (
    <AlertDialog open={actualOpen} onOpenChange={handleOpenChange}>
      {showTrigger && (
        <AlertDialogTrigger
          render={
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              disabled={loading}
            />
          }
        >
          <Key className="h-4 w-4" />
        </AlertDialogTrigger>
      )}
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset Subscription Key?</AlertDialogTitle>
          <AlertDialogDescription>
            This will generate a new subscription key for user{" "}
            <strong>{userName}</strong>.
            <br />
            <strong className="text-destructive">
              The old subscription link will be immediately invalidated, and the
              user will need to use the new subscription link.
            </strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="px-6 py-4">
          <Field name="customSubKey">
            <FieldLabel>Custom Subscription Key (Optional)</FieldLabel>
            <Input
              type="text"
              placeholder="Leave empty to auto-generate"
              value={customSubKey}
              onChange={(e) => setCustomSubKey(e.target.value)}
            />
          </Field>
        </div>
        <AlertDialogFooter variant="bare">
          <AlertDialogClose render={<Button variant="ghost" />}>
            Cancel
          </AlertDialogClose>
          <Button
            variant="destructive"
            disabled={loading}
            onClick={handleResetSubKey}
          >
            {loading ? <Spinner /> : "Confirm Reset"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
};

const DeleteUserDialog = ({
  userName,
  open,
  onOpenChange,
  onDelete,
}: {
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => Promise<void>;
}) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onDelete();
      toast.success(`User ${userName} deleted`);
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete user{" "}
            <strong>{userName}</strong> and remove related data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter variant="bare">
          <AlertDialogClose render={<Button variant="ghost" />}>
            Cancel
          </AlertDialogClose>
          <Button
            variant="destructive"
            disabled={loading}
            onClick={handleDelete}
          >
            {loading ? <Spinner /> : "Delete User"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
};
