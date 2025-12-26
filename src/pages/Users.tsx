import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
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
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { Plus, RefreshCw, Trash2, LinkIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { type UserWithNodes, type Node, type UserNode } from "@/types";
import { toast } from "sonner";

export const Users = () => {
  const [users, setUsers] = useState<UserWithNodes[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);

  const fetchUsers = async () => {
    const response = await fetch("/api/users", {
      method: "GET",
      headers: { Authorization: localStorage.getItem("authToken") ?? "" },
    });

    if (!response.ok) {
      const errorMsg = `HTTP error! status: ${response.status}`;
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }

    const data = await response.json();
    setUsers(data);
  };

  const fetchNodes = async () => {
    const response = await fetch("/api/nodes", {
      method: "GET",
      headers: { Authorization: localStorage.getItem("authToken") ?? "" },
    });

    if (!response.ok) {
      const errorMsg = `HTTP error! status: ${response.status}`;
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }

    const data = (await response.json()) as Node[];
    setNodes(data);
  };

  const deleteUser = async (id: string) => {
    const response = await fetch(`/api/users`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("authToken") ?? "",
      },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      const errorMsg = `HTTP error! status: ${response.status}`;
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }

    fetchUsers();
  };

  useEffect(() => {
    const fetchData = async () => {
      await fetchNodes();
      await fetchUsers();
    };
    fetchData();
  }, []);

  const formatBytes = (bytes: number) => {
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const copySubLink = async (subKey: string) => {
    const subLink = `${window.location.origin}/sub/${subKey}?type=clash&format=yaml`;
    await navigator.clipboard.writeText(subLink);
    toast.success("Subscription link copied to clipboard");
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
        <div className="flex items-center space-x-2">
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
                        <div
                          className={buttonVariants({
                            variant: "ghost",
                            size: "sm",
                          })}
                        >
                          {user.userNodes.length} assigned
                        </div>
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
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => copySubLink(user.subKey)}
                        >
                          <LinkIcon className="h-4 w-4" />
                        </Button>
                        <Dialog>
                          <DialogTrigger>
                            <div
                              className={cn(
                                buttonVariants({
                                  variant: "ghost",
                                  size: "sm",
                                }),
                                "h-8 w-8 p-0 text-red-600 hover:text-red-700",
                              )}
                            >
                              <Trash2 className="h-4 w-4" />
                            </div>
                          </DialogTrigger>
                          <DialogPopup>
                            <DialogHeader>
                              <DialogTitle>Delete User</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to delete this user?
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <DialogClose className="space-x-2">
                                <div
                                  className={buttonVariants({
                                    variant: "ghost",
                                    size: "sm",
                                  })}
                                >
                                  Cancel
                                </div>
                                <div
                                  className={buttonVariants({
                                    variant: "destructive-outline",
                                    size: "sm",
                                  })}
                                  onClick={() => deleteUser(user.id)}
                                >
                                  Continue
                                </div>
                              </DialogClose>
                            </DialogFooter>
                          </DialogPopup>
                        </Dialog>
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
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const submitHandler = async () => {
    if (!name) {
      toast.error("Please fill all fields");
      return;
    }

    const response = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("authToken") ?? "",
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const errorMsg = `HTTP error! status: ${response.status}`;
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }

    toast.success("User added successfully.");
    setOpen(false);
    onSuccess?.();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-3.5 w-3.5 mr-2" />
          Add User
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="p-4">
        <SheetHeader>
          <SheetTitle>Add User</SheetTitle>
        </SheetHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="username">Name</FieldLabel>
            <Input
              id="username"
              placeholder="User Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        </FieldGroup>
        <SheetFooter>
          <Button size="sm" onClick={submitHandler}>
            Add
          </Button>
        </SheetFooter>
      </SheetContent>
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
    async function callApi(node: UserNode, assign: boolean) {
      const response = await fetch("/api/nodes/assign", {
        method: "POST",
        headers: { Authorization: localStorage.getItem("authToken") ?? "" },
        body: JSON.stringify({
          userId: userId,
          nodeId: node?.nodeId,
          assign,
        }),
      });

      if (!response.ok) {
        const errorMsg = `HTTP error! status: ${response.status}`;
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }
    }

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
      <DialogTrigger>{children}</DialogTrigger>
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
        <DialogFooter>
          <DialogClose className="space-x-2">
            <div className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Cancel
            </div>
            <div
              className={buttonVariants({ size: "sm" })}
              onClick={assignHandler}
            >
              Save
            </div>
          </DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
};
