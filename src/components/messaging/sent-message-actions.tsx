import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { MESSAGE_BODY_LIMIT, messageEditDeadline } from "@/lib/messaging";
import { ApiError } from "@/services/api";
import { deleteMessage, editMessage } from "@/services/messaging";
import type { ConversationMessage } from "@/types/api";

type Action = "edit" | "delete";
const iconButtonClass = "inline-grid size-6 place-items-center rounded-md hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white";

type Props = {
  message: ConversationMessage;
  canSend: boolean;
  token: string;
  onChange: (id: number, replacement: ConversationMessage | null) => void;
  onRefresh: () => void;
};

export function SentMessageActions({ message, canSend, ...props }: Props) {
  const deadline = messageEditDeadline(message);
  const [withinWindow, setWithinWindow] = useState(() => Date.now() < deadline);
  const [action, setAction] = useState<Action | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);
  const canEdit = withinWindow && canSend && !message.unavailable && message.body !== null;

  useEffect(() => {
    if (!withinWindow) return;
    const timer = window.setTimeout(() => setWithinWindow(false), Math.max(0, deadline - Date.now()));
    return () => window.clearTimeout(timer);
  }, [deadline, withinWindow]);

  function open(next: Action, button: HTMLButtonElement) {
    opener.current = button;
    setAction(next);
  }

  return <>
    {canEdit && <button type="button" aria-label="Edit message" title="Edit message" aria-haspopup="dialog" className={iconButtonClass} onClick={e => open("edit", e.currentTarget)}>
      <Pencil size={13} aria-hidden="true" />
    </button>}
    <button ref={deleteButton} type="button" aria-label="Delete message" title="Delete message" aria-haspopup="dialog" className={iconButtonClass} onClick={e => open("delete", e.currentTarget)}>
      <Trash2 size={13} aria-hidden="true" />
    </button>
    {action && <MessageActionDialog {...props} message={message} action={action} canEdit={canEdit}
      onClose={() => setAction(null)} restoreFocus={() => (opener.current?.isConnected ? opener.current : deleteButton.current)?.focus()} />}
  </>;
}

function MessageActionDialog({ message, token, onChange, onRefresh, action, canEdit, onClose, restoreFocus }:
  Omit<Props, "canSend"> & { action: Action; canEdit: boolean; onClose: () => void; restoreFocus: () => void }) {
  const editing = action === "edit";
  const [draft, setDraft] = useState(message.body ?? "");
  const body = draft.trim();
  const tooLong = Array.from(body).length > MESSAGE_BODY_LIMIT;
  const mutation = useMutation({
    networkMode: "always",
    mutationFn: async () => {
      if (editing) {
        if (!canEdit || Date.now() >= messageEditDeadline(message)) throw new Error("This message can no longer be edited.");
        const response = await editMessage(message.conversation_id, message.id, body, token);
        return response.data;
      }
      await deleteMessage(message.conversation_id, message.id, token);
      return null;
    },
    onSuccess: replacement => {
      onChange(message.id, replacement);
      onClose();
    },
    onError: error => {
      if (error instanceof ApiError && [401, 403, 404, 409].includes(error.status)) onRefresh();
    },
  });
  const disabled = mutation.isPending || (editing && (!canEdit || !body || tooLong || body === message.body));
  const error = mutation.error;

  return <Dialog open onOpenChange={open => { if (!open && !mutation.isPending) onClose(); }}>
    <DialogContent className="max-w-md" showCloseButton={false} onCloseAutoFocus={event => { event.preventDefault(); restoreFocus(); }}>
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (!disabled) mutation.mutate(); }}>
        <DialogTitle>{editing ? "Edit message" : "Delete message?"}</DialogTitle>
        <DialogDescription>{editing ? "You can edit this message for five minutes after sending it." : "This permanently deletes the message for both people in this conversation."}</DialogDescription>
        {editing && canEdit && <textarea aria-label="Message text" rows={4} value={draft} onChange={event => setDraft(event.target.value)}
          disabled={mutation.isPending} className="studio-input resize-y py-2" />}
        {editing && !canEdit && <p role="alert" className="text-sm">This message can no longer be edited.</p>}
        {editing && canEdit && tooLong && <p role="alert" className="text-sm">Use {MESSAGE_BODY_LIMIT.toLocaleString()} characters or fewer.</p>}
        {error && <p role="alert" className="text-sm text-rose-500">{(error instanceof ApiError && error.errors.body?.[0]) || error.message}</p>}
        <DialogFooter>
          <button type="button" disabled={mutation.isPending} onClick={onClose} className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold">Cancel</button>
          <button type="submit" disabled={disabled} className={editing ? "primary-button" : "rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"}>
            {editing ? (mutation.isPending ? "Saving…" : "Save changes") : (mutation.isPending ? "Deleting…" : "Delete for everyone")}
          </button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
