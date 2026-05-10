"use client";

import { useTransition } from "react";

interface Props {
  current: string;
  options: { value: string; label: string }[];
  action: (status: string) => Promise<void> | void;
}

export default function InvitationStatusSelect({ current, options, action }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={current}
      disabled={pending}
      onChange={(e) => {
        const status = e.currentTarget.value;
        startTransition(() => {
          // server-action signature; promise return is fine to ignore
          void action(status);
        });
      }}
      className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
