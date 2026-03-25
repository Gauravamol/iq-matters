export default function Panel({ className = "", glow = "cyan", children, ...props }) {
  return (
    <section className={`panel panel--${glow} ${className}`.trim()} {...props}>
      {children}
    </section>
  );
}
