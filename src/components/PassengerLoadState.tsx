import { AlertCircle, LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PassengerLoading({ label }: { label: string }) {
  return <div role="status" className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />{label}</div>;
}

export function PassengerError({ message, retry, retrying = false }: { message: string; retry: () => void; retrying?: boolean }) {
  return <div role="alert" className="space-y-3 border-l-2 border-destructive p-4">
    <p className="flex items-start gap-2 text-sm text-destructive"><AlertCircle className="mt-0.5 size-4 shrink-0" />{message}</p>
    <Button variant="outline" onClick={retry} disabled={retrying}>
      {retrying ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" /> : <RefreshCw className="size-4" />}
      {retrying ? "Retrying…" : "Try again"}
    </Button>
  </div>;
}