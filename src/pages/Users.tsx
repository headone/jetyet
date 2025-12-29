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
import { cn } from "@/lib/utils";
import {
  Plus,
  RefreshCw,
  Trash2,
  LinkIcon,
  Network,
  Shuffle,
  Rocket,
} from "lucide-react";
import { useEffect, useState } from "react";
import { type UserWithNodes, type Node, type UserNode } from "@/types";
import { toast } from "sonner";
import copy from "copy-to-clipboard";
import { apiCall, apiCallSWR } from "@/client";

export const Users = () => {
  const [users, setUsers] = useState<UserWithNodes[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);

  const fetchUsers = async () => {
    await apiCallSWR("/api/users", "GET", undefined, setUsers);
  };

  const fetchNodes = async () => {
    await apiCallSWR("/api/nodes", "GET", undefined, setNodes);
  };

  const deleteUser = async (id: string) => {
    await apiCall("/api/users/:id", "DELETE", { params: { id } });

    fetchUsers();
  };

  useEffect(() => {
    Promise.all([fetchUsers(), fetchNodes()]);
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

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">
            Manage access and traffic limits
          </p>
        </div>
        <div className="flex items-center">
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
                // const usagePercent =
                //   user.trafficLimitGB > 0
                //     ? (user.usedTrafficBytes /
                //         (user.trafficLimitGB * 1024 * 1024 * 1024)) *
                //       100
                //     : 0;
                const usagePercent = 0;
                return (
                  <tr
                    key={user.id}
                    className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                  >
                    <td className="p-4 align-middle font-medium">
                      {user.name}
                    </td>
                    <td className="p-4 align-middle">
                      <Badge
                        className={cn(
                          "border-transparent w-14 text-xs",
                          user.status === 1
                            ? " bg-green-100 text-green-800 hover:bg-green-200"
                            : "bg-destructive text-white hover:bg-destructive/80 ",
                        )}
                      >
                        {user.status === 1 ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="w-45 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{formatBytes(0)}</span>
                          <span className="text-muted-foreground">
                            {/*{user.trafficLimitGB} GB*/}∞ GB
                          </span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${usagePercent > 90 ? "bg-red-500" : "bg-primary"}`}
                            style={{ width: `${Math.min(usagePercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-4 align-middle text-muted-foreground">
                      <AssignDialog
                        userId={user.id}
                        nodes={nodes}
                        assignedNodes={user.userNodes}
                        onSuccess={fetchUsers}
                      >
                        {user.userNodes.length} assigned
                      </AssignDialog>
                    </td>
                    <td className="p-4 align-middle text-right">
                      <div className="flex justify-end gap-2">
                        {/*<Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          // onClick={() => handleResetTraffic(user.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>*/}
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={<Button variant="ghost" />}
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

                        <AlertDialog>
                          <AlertDialogTrigger
                            render={<Button variant="ghost" />}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </AlertDialogTrigger>
                          <AlertDialogPopup>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Are you absolutely sure?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will
                                permanently delete your USER and remove your
                                data from our servers.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter variant="bare">
                              <AlertDialogClose
                                render={<Button variant="ghost" />}
                              >
                                Cancel
                              </AlertDialogClose>
                              <AlertDialogClose
                                render={<Button variant="destructive" />}
                                onClick={() => deleteUser(user.id)}
                              >
                                Delete User
                              </AlertDialogClose>
                            </AlertDialogFooter>
                          </AlertDialogPopup>
                        </AlertDialog>

                        {/*<Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          onClick={() => deleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>*/}
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
      <SheetTrigger render={<Button variant="outline" />}>
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
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);

  const fetchAssignedNodes = () => {
    const selected = assignedNodes
      .map((node) => nodes.find((n) => n.id === node.nodeId))
      .filter((node) => !!node);
    setSelectedNodes(selected);
  };

  useEffect(() => {
    fetchAssignedNodes();
  }, []);

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
        <DialogPanel>
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
                  <ComboboxItem key={item.id} value={item}>
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
