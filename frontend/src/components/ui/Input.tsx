import type { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
}

export function Input({
  label,
  id,
  error,
  className = '',
  ...props
}: InputProps) {
  const inputId = id ?? props.name

  return (
    <label className="block space-y-2 text-sm text-slate-700" htmlFor={inputId}>
      {label ? <span className="font-medium text-slate-700">{label}</span> : null}
      <input
        id={inputId}
        className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 ${error ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''} ${className}`}
        {...props}
      />
      {error ? <span className="block text-xs text-red-600">{error}</span> : null}
    </label>
  )
}
