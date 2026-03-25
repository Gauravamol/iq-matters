import { motion } from "framer-motion";
import Panel from "./Panel";

export default function StatCard({ label, value, detail, accent = "cyan" }) {
  return (
    <motion.div whileHover={{ y: -6 }} transition={{ duration: 0.2 }}>
      <Panel glow={accent} className="stat-card">
        <span className="stat-card__label">{label}</span>
        <strong className="stat-card__value">{value}</strong>
        {detail ? <span className="stat-card__detail">{detail}</span> : null}
      </Panel>
    </motion.div>
  );
}
