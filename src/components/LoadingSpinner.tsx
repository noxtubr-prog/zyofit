import { motion } from "framer-motion";

const LoadingSpinner = ({ text = "Loading…" }: { text?: string }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-4">
    <motion.div
      className="h-10 w-10 rounded-full border-[3px] border-muted border-t-accent"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
    />
    <motion.p
      className="text-sm text-muted-foreground"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      {text}
    </motion.p>
  </div>
);

export default LoadingSpinner;
