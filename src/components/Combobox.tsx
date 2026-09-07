import { useId } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder?: string;
  required?: boolean;
  name?: string;
  className?: string;
};

/** Lightweight searchable select using the native <datalist> — mobile-friendly, zero deps. */
export function Combobox({ value, onChange, options, placeholder, required, name, className }: Props) {
  const id = useId();
  return (
    <>
      <input
        list={id}
        name={name}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Type to search…"}
        autoComplete="off"
        className={
          className ??
          "w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        }
      />
      <datalist id={id}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  );
}

/** Multi-select chip combobox built on top of <Combobox>. */
export function MultiCombobox({
  values,
  onChange,
  options,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  options: readonly string[];
  placeholder?: string;
}) {
  const id = useId();
  const add = (v: string) => {
    const t = v.trim();
    if (!t) return;
    if (values.includes(t)) return;
    onChange([...values, t]);
  };
  const remove = (v: string) => onChange(values.filter((x) => x !== v));

  return (
    <div className="w-full rounded-md border border-border bg-secondary px-2 py-2">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {values.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-full bg-white border border-border px-2.5 py-1 text-xs">
              {v}
              <button type="button" aria-label={`Remove ${v}`} onClick={() => remove(v)} className="text-muted-foreground hover:text-destructive">×</button>
            </span>
          ))}
        </div>
      )}
      <input
        list={id}
        placeholder={placeholder ?? "Type and press Enter to add…"}
        autoComplete="off"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const t = (e.target as HTMLInputElement).value;
            add(t);
            (e.target as HTMLInputElement).value = "";
          }
        }}
        onChange={(e) => {
          const v = e.target.value;
          // If the user picks a value directly from the datalist, commit it.
          if (options.includes(v)) {
            add(v);
            e.target.value = "";
          }
        }}
        className="w-full bg-transparent px-1 py-1 text-sm outline-none"
      />
      <datalist id={id}>
        {options.filter((o) => !values.includes(o)).map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </div>
  );
}