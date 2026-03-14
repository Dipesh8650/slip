interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export function TitleInput({
  value,
  onChange,
  placeholder = "Sin título",
  readOnly = false,
}: Props) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      className="w-full text-2xl font-serif text-neutral-900 placeholder:text-neutral-400 bg-transparent border-0 focus:outline-none focus:ring-0"
    />
  );
}
