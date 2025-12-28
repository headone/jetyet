import { RefreshCw, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
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
  Select,
  SelectPopup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Form } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Plus } from "lucide-react";
import {
  type Node,
  NODE_TYPES,
  type NodeType,
  CLIENT_FINGERPRINT_TYPES,
  type ClientFingerprintType,
  VLESS_FLOW_TYPES,
  type VlessFlowType,
  type NodeAdvancedSchema,
} from "@/types";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiCall } from "@/client";

export const Nodes = () => {
  const [nodes, setNodes] = useState<Node[]>([]);

  useEffect(() => {
    fetchNodes();
  }, []);

  const fetchNodes = async () => {
    const response = await apiCall("/api/nodes", "GET");
    setNodes(response);
  };

  const deleteNode = async (id: string) => {
    await apiCall("/api/nodes/:id", "DELETE", { params: { id } });

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
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button
                        variant="ghost"
                        className="w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      />
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </AlertDialogTrigger>
                  <AlertDialogPopup>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Are you absolutely sure?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently
                        delete your node and remove your data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter variant="bare">
                      <AlertDialogClose render={<Button variant="ghost" />}>
                        Cancel
                      </AlertDialogClose>
                      <AlertDialogClose
                        render={<Button variant="destructive" />}
                        onClick={() => deleteNode(node.id)}
                      >
                        Delete Node
                      </AlertDialogClose>
                    </AlertDialogFooter>
                  </AlertDialogPopup>
                </AlertDialog>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const AddNodeSheet = ({ onSuccess }: { onSuccess?: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [nodeType, setNodeType] = useState<NodeType | undefined>(NODE_TYPES[0]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const type = formData.get("type") as NodeType;
    const name = formData.get("name") as string;
    const host = formData.get("host") as string;
    const port = formData.get("port") as string;
    let advanced;
    if (type === "hysteria2") {
      advanced = {} as NodeAdvancedSchema["hysteria2"];
    } else if (type === "vless") {
      advanced = {
        tls: formData.get("tls") === "on",
        udp: formData.get("udp") === "on",
        flow: formData.get("flow") as VlessFlowType,
        servername: formData.get("servername") as string,
        "reality-opts": {
          "public-key": formData.get("public-key") as string,
          "short-id": formData.get("short-id") || undefined,
        },
        "client-fingerprint": formData.get(
          "client-fingerprint",
        ) as ClientFingerprintType,
      } as NodeAdvancedSchema["vless"];
    } else {
      throw new Error("Invalid node type");
    }
    console.log({ type, name, host, port, advanced });

    setLoading(true);
    try {
      await apiCall("/api/nodes", "POST", {
        body: { type, name, host, port, advanced },
      });
      toast.success("Node added successfully.");
      onSuccess?.();
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
            <SheetTitle>Add Node</SheetTitle>
            <SheetDescription>Add a new node to your network.</SheetDescription>
          </SheetHeader>
          <SheetPanel className="grid gap-4">
            <Field>
              <FieldLabel>Type</FieldLabel>
              <Select
                items={NODE_TYPES.map((type) => ({ value: type, label: type }))}
                value={nodeType}
                name="type"
                onValueChange={(value) => setNodeType(value as NodeType)}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {NODE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </Field>
            <Field name="name">
              <FieldLabel>Node name</FieldLabel>
              <Input required type="text" />
            </Field>
            <Field name="host">
              <FieldLabel>Host</FieldLabel>
              <Input required type="text" placeholder="domain or IP address" />
            </Field>
            <Field name="port">
              <FieldLabel>Port</FieldLabel>
              <Input required type="text" placeholder="port number or range" />
            </Field>

            <div className="flex items-center gap-3 before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
              <span className="text-muted-foreground text-xs">
                Advanced Options
              </span>
            </div>

            <NodeAdvancedOptions nodeType={nodeType} />
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

const NodeAdvancedOptions = ({ nodeType }: { nodeType?: NodeType }) => {
  switch (nodeType) {
    case "hysteria2":
      return <Hysteria2NodeAdvancedOptions />;
    case "vless":
      return <VlessNodeAdvancedOptions />;
    default:
      return null;
  }
};

const Hysteria2NodeAdvancedOptions = () => {
  return <></>;
};

const VlessNodeAdvancedOptions = () => {
  return (
    <>
      <Field name="servername">
        <FieldLabel>Server Name</FieldLabel>
        <Input required type="text" />
      </Field>
      <Field name="public-key">
        <FieldLabel>Public Key</FieldLabel>
        <Input required type="text" />
      </Field>
      <Field name="short-id">
        <FieldLabel>Short Id</FieldLabel>
        <Input type="text" placeholder="Optional..." />
      </Field>
      <Field>
        <FieldLabel>Flow</FieldLabel>
        <Select
          items={VLESS_FLOW_TYPES.map((type) => ({
            value: type,
            label: type,
          }))}
          defaultValue={VLESS_FLOW_TYPES[0]}
          name="flow"
          required
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {VLESS_FLOW_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </Field>
      <Field>
        <FieldLabel>Client Fingerprint</FieldLabel>
        <Select
          items={CLIENT_FINGERPRINT_TYPES.map((type) => ({
            value: type,
            label: type,
          }))}
          defaultValue={CLIENT_FINGERPRINT_TYPES[0]}
          name="client-fingerprint"
          required
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {CLIENT_FINGERPRINT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </Field>
      <Field name="udp">
        <Label className="w-full flex items-center justify-between gap-6 rounded-lg border p-3 hover:bg-accent/50 has-data-checked:border-primary/48 has-data-checked:bg-accent/50">
          <div className="flex flex-col gap-1">
            <p>UDP over TCP</p>
            <p className="text-muted-foreground text-xs">
              Supports connectionless transmission.
            </p>
          </div>
          <Switch />
        </Label>
      </Field>
      <Field name="tls" hidden>
        <FieldLabel>Enable TLS</FieldLabel>
        <Switch defaultChecked />
      </Field>
    </>
  );
};
