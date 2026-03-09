export default function InputField({ label, hint, className = "", ...props }) {
  return (
    <label className={`field ${className}`.trim()}>
      <span className="field__label">{label}</span>
      {props.as === "textarea" ? <textarea className="field__control" {...props} /> : <input className="field__control" {...props} />}
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}
