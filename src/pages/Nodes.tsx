import { RefreshCw, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus } from "lucide-react";
import { type Node, NODE_TYPES } from "../types";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Nodes = () => {
  const [nodes, setNodes] = useState<Node[]>([]);

  useEffect(() => {
    fetchNodes();
  }, []);

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

    const data = await response.json();
    setNodes(data);
  };

  const deleteNode = async (id: string) => {
    const response = await fetch(`/api/nodes/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: localStorage.getItem("authToken") ?? "",
      },
    });

    if (!response.ok) {
      const errorMsg = `HTTP error! status: ${response.status}`;
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }

    fetchNodes();
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Nodes</h2>
          <p className="text-muted-foreground">
            Manage your VPS infrastructure and VPN endpoints
          </p>
        </div>
        <AddNodeSheet
          onSuccess={() => {
            fetchNodes();
          }}
        />
      </div>

      <div className="flex flex-wrap gap-6">
        {nodes.map((node) => (
          <Card
            key={node.id}
            className="w-full max-w-sm py-0 overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="p-6 pb-4">
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
                    {node.name}
                  </h3>
                  <p className="text-sm text-muted-foreground font-mono">
                    {node.host}:{node.port}
                  </p>
                </div>
                {/*<div
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                    node.status === "online"
                      ? "bg-green-100 text-green-800"
                      : node.status === "checking"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                  }`}
                >
                  {node.status === "online"
                    ? "Online"
                    : node.status === "checking"
                      ? "Checking"
                      : "Offline"}
                </div>*/}
              </div>

              <div className="grid gap-2 text-sm text-muted-foreground mb-6">
                <div className="flex items-center justify-between">
                  <span>Type</span>
                  <span className="font-medium text-foreground uppercase">
                    {node.type}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Bandwidth</span>
                  <span className="font-medium text-foreground">
                    0↑ / 0↓ Mbps
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last Check</span>
                  <span className="font-medium text-foreground">
                    {node.updatedAt
                      ? new Date(node.updatedAt).toLocaleTimeString()
                      : "Never"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t">
                {/*<Button
                  size="sm"
                  variant="ghost"
                  className="w-full text-xs"
                  // onClick={() => handleCheck(node.id)}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-2" />
                  Check Status
                </Button>*/}
                <Dialog>
                  <DialogTrigger className="w-full text-xs">
                    <div
                      className={cn(
                        buttonVariants({
                          variant: "ghost",
                          size: "sm",
                        }),
                        "w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50",
                      )}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete
                    </div>
                  </DialogTrigger>
                  <DialogPopup>
                    <DialogHeader>
                      <DialogTitle>Delete Node</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete this node?
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
                          onClick={() => deleteNode(node.id)}
                        >
                          Continue
                        </div>
                      </DialogClose>
                    </DialogFooter>
                  </DialogPopup>
                </Dialog>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const AddNodeSheet = ({ onSuccess }: { onSuccess?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("");
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");

  const submitHandler = async () => {
    if (!type || !name || !host || !port) {
      toast.error("Please fill all fields");
      return;
    }

    const response = await fetch("/api/nodes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("authToken") ?? "",
      },
      body: JSON.stringify({ type, name, host, port }),
    });

    if (!response.ok) {
      const errorMsg = `HTTP error! status: ${response.status}`;
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }

    toast.success("Node added successfully.");
    setOpen(false);
    onSuccess?.();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-3.5 w-3.5 mr-2" />
          Add Node
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="p-4">
        <SheetHeader>
          <SheetTitle>Add Node</SheetTitle>
        </SheetHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="type">Type</FieldLabel>
            <Select onValueChange={setType} value={type}>
              <SelectTrigger>
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent id="type">
                {NODE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="nodename">Name</FieldLabel>
            <Input
              id="nodename"
              placeholder="Node Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="host">Host</FieldLabel>
            <Input
              id="host"
              placeholder="Hostname or IP Address"
              value={host}
              onChange={(e) => setHost(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="port">Port</FieldLabel>
            <Input
              id="port"
              placeholder="Port Number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
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
