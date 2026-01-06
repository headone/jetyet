import { Trash2, SquarePen } from "lucide-react";
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
import { apiCall, apiCallSWR } from "@/client";

export const Nodes = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<Node | null>(null);

  useEffect(() => {
    fetchNodes();
  }, []);

  const handleAdd = () => {
    setEditingNode(null);
    setSheetOpen(true);
  };

  const handleEdit = (node: Node) => {
    setEditingNode(node);
    setSheetOpen(true);
  };

  const fetchNodes = async () => {
    await apiCallSWR("/api/nodes", "GET", undefined, setNodes);
  };

  const deleteNode = async (id: string) => {
    await apiCall("/api/nodes/:id", "DELETE", { params: { id } });

    fetchNodes();
  };

  return (
    <>
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Nodes</h2>
            <p className="text-muted-foreground">
              Manage your VPS infrastructure and VPN endpoints
            </p>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-3.5 w-3.5 mr-2" />
            Add
          </Button>
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

                <div className="flex flex-col gap-2 border-t">
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
                          delete your node and remove your data from our
                          servers.
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
                  <Button
                    variant="ghost"
                    className="w-full text-xs"
                    onClick={() => handleEdit(node)}
                  >
                    <SquarePen className="h-3.5 w-3.5 mr-2" />
                    Modify
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
      <NodeSheet
        key={editingNode ? editingNode.id : "new-node"}
        open={isSheetOpen}
        onOpenChange={setSheetOpen}
        node={editingNode} // 传入当前节点
        onSuccess={() => {
          setSheetOpen(false);
          fetchNodes();
        }}
      />
    </>
  );
};

interface NodeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  node?: Node | null; // 可选的编辑对象
}

const NodeSheet = ({ open, onOpenChange, onSuccess, node }: NodeSheetProps) => {
  const [loading, setLoading] = useState(false);
  const [nodeType, setNodeType] = useState<NodeType | undefined>(
    node?.type || NODE_TYPES[0],
  );

  const isEditMode = !!node;

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

    setLoading(true);
    try {
      if (isEditMode) {
        await apiCall("/api/nodes/:id", "PUT", {
          params: { id: node!.id },
          body: { type, name, host, port, advanced },
        });
        toast.success("Node updated successfully.");
      } else {
        await apiCall("/api/nodes", "POST", {
          body: { type, name, host, port, advanced },
        });
        toast.success("Node added successfully.");
      }
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPopup inset>
        <Form className="h-full gap-0" onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>{isEditMode ? "Edit Node" : "Add Node"}</SheetTitle>
            <SheetDescription>
              {isEditMode
                ? `Modify configuration for ${node.name}`
                : "Add a new node to your network."}
            </SheetDescription>
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
                  {!isEditMode &&
                    NODE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  {isEditMode && (
                    <SelectItem key={node.type} value={node.type}>
                      {node.type}
                    </SelectItem>
                  )}
                </SelectPopup>
              </Select>
            </Field>
            <Field name="name">
              <FieldLabel>Node name</FieldLabel>
              <Input required type="text" defaultValue={node?.name} />
            </Field>
            <Field name="host">
              <FieldLabel>Host</FieldLabel>
              <Input
                required
                type="text"
                placeholder="domain or IP address"
                defaultValue={node?.host}
              />
            </Field>
            <Field name="port">
              <FieldLabel>Port</FieldLabel>
              <Input
                required
                type="text"
                placeholder="port number or range"
                defaultValue={node?.port}
              />
            </Field>

            <div className="flex items-center gap-3 before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
              <span className="text-muted-foreground text-xs">
                Advanced Options
              </span>
            </div>

            <NodeAdvancedOptions
              nodeType={nodeType}
              advancedData={node?.advanced}
            />
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

const NodeAdvancedOptions = ({
  nodeType,
  advancedData,
}: {
  nodeType?: NodeType;
  advancedData?: NodeAdvancedSchema[NodeType];
}) => {
  switch (nodeType) {
    case "hysteria2":
      return (
        <Hysteria2NodeAdvancedOptions
          data={advancedData as NodeAdvancedSchema["hysteria2"]}
        />
      );
    case "vless":
      return (
        <VlessNodeAdvancedOptions
          data={advancedData as NodeAdvancedSchema["vless"]}
        />
      );
    default:
      return null;
  }
};

const Hysteria2NodeAdvancedOptions = ({
  data,
}: {
  data: NodeAdvancedSchema["hysteria2"];
}) => {
  return <></>;
};

const VlessNodeAdvancedOptions = ({
  data,
}: {
  data: NodeAdvancedSchema["vless"];
}) => {
  return (
    <>
      <Field name="servername">
        <FieldLabel>Server Name</FieldLabel>
        <Input required type="text" defaultValue={data?.servername} />
      </Field>
      <Field name="public-key">
        <FieldLabel>Public Key</FieldLabel>
        <Input
          required
          type="text"
          defaultValue={data?.["reality-opts"]?.["public-key"]}
        />
      </Field>
      <Field name="short-id">
        <FieldLabel>Short Id</FieldLabel>
        <Input
          type="text"
          placeholder="Optional..."
          defaultValue={data?.["reality-opts"]?.["short-id"]}
        />
      </Field>
      <Field>
        <FieldLabel>Flow</FieldLabel>
        <Select
          items={VLESS_FLOW_TYPES.map((type) => ({
            value: type,
            label: type,
          }))}
          defaultValue={data?.flow || VLESS_FLOW_TYPES[0]}
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
          defaultValue={
            data?.["client-fingerprint"] || CLIENT_FINGERPRINT_TYPES[0]
          }
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
          <Switch defaultChecked={data?.udp} />
        </Label>
      </Field>
      <Field name="tls" hidden>
        <FieldLabel>Enable TLS</FieldLabel>
        <Switch defaultChecked={data?.tls ?? true} />
      </Field>
    </>
  );
};
