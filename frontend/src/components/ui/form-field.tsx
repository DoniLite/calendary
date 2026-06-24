export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-busy">{message}</p>
}
