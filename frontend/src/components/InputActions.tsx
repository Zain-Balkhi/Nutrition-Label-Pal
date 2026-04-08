interface InputActionsProps {
  children: React.ReactNode;
}

export default function InputActions({ children }: InputActionsProps) {
  return (
    <div className="input-actions" role="toolbar" aria-label="Text input tools">
      {children}
    </div>
  );
}
