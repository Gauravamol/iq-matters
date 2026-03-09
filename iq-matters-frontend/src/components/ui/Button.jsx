export default function Button({ as: Component = "button", className = "", variant = "primary", children, ...props }) {
  return (
    <Component className={`button button--${variant} ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}
