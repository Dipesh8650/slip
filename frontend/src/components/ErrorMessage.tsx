interface Props {
  message: string;
}

export function ErrorMessage({ message }: Props) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <p className="text-sm text-red-600 font-sans">{message}</p>
    </div>
  );
}
